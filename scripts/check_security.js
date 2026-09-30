#!/usr/bin/env node
// Static guards for the security properties this app depends on. They read the source only, so
// they run anywhere (no network, no database). The runtime behaviour is covered by
// supabase/tests/run.sh; this file catches the *regressions that are easy to reintroduce*:
//
//   1. the client writing points / check-ins / memberships directly instead of via the server RPCs
//   2. user-controlled image URLs or names reaching innerHTML unescaped (stored XSS)
//   3. a real secret (service_role key, private key, ...) ending up in the repo or the bundle
//   4. the lockdown migration no longer closing the direct-write policies the client stopped using
//
// Run: node scripts/check_security.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const app = read('app.js');
let failures = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failures++; };

// ---- 1. no direct writes to server-owned tables ----
console.log('\n1. client never writes server-owned tables');
const FORBIDDEN_WRITES = [
  ['visits', /from\(\s*["']visits["']\s*\)\s*\.\s*(insert|upsert|delete)\b/],
  ['landmark_conquests', /from\(\s*["']landmark_conquests["']\s*\)\s*\.\s*(insert|upsert|update|delete)\b/],
  ['xp_bonus_grants', /from\(\s*["']xp_bonus_grants["']\s*\)\s*\.\s*(insert|upsert|update|delete)\b/],
  ['group_members (insert)', /from\(\s*["']group_members["']\s*\)\s*\.\s*(insert|upsert|update)\b/],
  ['groups (insert/update)', /from\(\s*["']groups["']\s*\)\s*\.\s*(insert|upsert|update)\b/],
  ['invites (insert/update)', /from\(\s*["']invites["']\s*\)\s*\.\s*(insert|upsert|update)\b/],
  ['trip_posts (write)', /from\(\s*["']trip_posts["']\s*\)\s*\.\s*(insert|upsert|update|delete)\b/],
  ['trip_requests (write)', /from\(\s*["']trip_requests["']\s*\)\s*\.\s*(insert|upsert|update|delete)\b/],
  ['visits.update of points', /from\(\s*["']visits["']\s*\)\s*\.\s*update\(\s*\{[^}]*points_awarded/],
];
for (const [name, re] of FORBIDDEN_WRITES) check(`no direct ${name}`, !re.test(app), re.test(app) ? 'found in app.js' : '');
for (const rpc of ['checkin_landmark', 'create_group', 'join_group', 'create_invite', 'redeem_invite', 'create_trip_post', 'request_join_trip', 'respond_trip_request']) {
  check(`app.js calls rpc ${rpc}`, new RegExp(`rpc\\(\\s*["']${rpc}["']`).test(app));
}

// ---- 2. user-controlled values must be sanitised before innerHTML ----
console.log('\n2. user-controlled URLs and names are escaped');
const lines = app.split('\n');
// only the interpolations that sit directly inside src="..." / url('...'), where a bad value is dangerous
const URLISH = /(?:src="|url\(')\$\{\s*([^}]*?)\}/g;
const bad = [];
lines.forEach((line, i) => {
  let m;
  URLISH.lastIndex = 0;
  while ((m = URLISH.exec(line))) {
    const expr = m[1].trim();
    if (/^(safeUrl|cssUrlValue)\(/.test(expr)) continue;
    // data URLs the app builds itself from a canvas (not user supplied) are fine, but keep them explicit
    bad.push(`app.js:${i + 1}  \${${expr}}`);
  }
});
check('image URLs in templates go through safeUrl/cssUrlValue', bad.length === 0, bad.slice(0, 5).join(' | '));
const concat = [];
lines.forEach((line, i) => { if (/'<img src="'\s*\+\s*(?!safeUrl)/.test(line)) concat.push(`app.js:${i + 1}`); });
check('string-concatenated <img src> is sanitised', concat.length === 0, concat.join(', '));
check('group member names are escaped', !/class="lb-name">\$\{r\.name\}/.test(app));

// ---- 3. secrets ----
console.log('\n3. no secrets in tracked files');
const tracked = execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n').filter(f => f && !/\.(png|jpg|jpeg|ico|keystore|csv)$/.test(f));
const SECRET_PATTERNS = [
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
  [/sb_secret_[A-Za-z0-9_-]{20,}/, 'Supabase secret key'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/ghp_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/xox[bp]-[A-Za-z0-9-]{20,}/, 'Slack token'],
  [/VAPID_PRIVATE_KEY\s*[=:]\s*["'][A-Za-z0-9_-]{20,}["']/, 'VAPID private key'],
];
const found = [];
for (const f of tracked) {
  const text = read(f);
  for (const [re, label] of SECRET_PATTERNS) if (re.test(text)) found.push(`${f}: ${label}`);
  for (const jwt of text.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) || []) {
    let role = '?';
    try { role = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).role; } catch (e) {}
    if (role !== 'anon') found.push(`${f}: JWT with role "${role}"`);
  }
}
check('only public keys are committed (anon JWT, VAPID public)', found.length === 0, found.join('; '));
check('.env files and keystores are git-ignored', /^\.env/m.test(read('.gitignore')) && /keystore/.test(read('.gitignore')));
check('.env files are not tracked', !tracked.some(f => /(^|\/)\.env/.test(f)));

// ---- 4. lockdown migration closes what the client no longer uses ----
console.log('\n4. lockdown migration');
const lock = read('supabase/migrations_hardening_2_lockdown.sql');
for (const policy of ['users can insert their own visits', 'users can insert their own conquests', 'users can insert their own bonus grants',
  'users can join groups themselves', 'users can create groups', 'users can create invites as themselves', 'field reports are publicly readable', 'group votes are publicly readable']) {
  check(`drops policy "${policy}"`, lock.includes(`drop policy if exists "${policy}"`));
}
check('visits.update limited to photo_url,note', /grant update \(photo_url, note\) on public\.visits/.test(lock));
check('friendships.update limited to status columns', /grant update \(status, accepted_at\) on public\.friendships/.test(lock));

console.log(failures ? `\n${failures} check(s) failed` : '\nall security checks passed');
process.exit(failures ? 1 : 0);
