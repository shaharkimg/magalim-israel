#!/usr/bin/env node
// Keeps the TWA packaging honest against the app it wraps.
//
// A TWA is only "trusted" if Chrome can verify that the Android app and the website
// belong to the same owner. That check reads /.well-known/assetlinks.json over the
// site's own origin and compares it with the app's signing certificate. When any of
// the three sides drift — the package id, the host, or the fingerprint — verification
// fails silently and the app simply opens with a browser URL bar. Nothing errors; it
// just stops looking like an app. That is exactly the kind of failure worth a check.
//
// Run: node scripts/check_twa.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const readJson = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

const FINGERPRINT_PLACEHOLDER = 'REPLACE_WITH_SHA256_FROM_PLAY_CONSOLE';

let failures = 0;
let pending = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
};
const todo = (name, detail) => { console.log(`  TODO  ${name}${detail ? ' — ' + detail : ''}`); pending++; };

const manifest = readJson('manifest.json');
const twa = readJson('twa/twa-manifest.json');
const links = readJson('.well-known/assetlinks.json');

console.log('\n1. the Android app and the web app describe the same product');
check('name matches the web manifest', twa.name === manifest.name, `${twa.name} vs ${manifest.name}`);
check('start URL matches', twa.startUrl === manifest.start_url, `${twa.startUrl} vs ${manifest.start_url}`);
check('theme colour matches', twa.themeColor === manifest.theme_color);
check('background colour matches', twa.backgroundColor === manifest.background_color);
check('orientation matches', twa.orientation === manifest.orientation.replace('-primary', ''),
  `${twa.orientation} vs ${manifest.orientation}`);
check('display mode is standalone', twa.display === 'standalone');

console.log('\n2. the icons it points at actually exist');
const iconPath = url => (url || '').replace(/^https?:\/\/[^/]+\//, '');
for (const [label, url] of [['iconUrl', twa.iconUrl], ['maskableIconUrl', twa.maskableIconUrl]]) {
  const local = iconPath(url);
  check(`${label} resolves to a file in the repo`, !!local && fs.existsSync(path.join(root, local)), local || '(unset)');
}
check('the web manifest declares a maskable icon',
  manifest.icons.some(i => (i.purpose || '').includes('maskable')));

console.log('\n3. the host is consistent everywhere');
const hostOf = url => { try { return new URL(url).host; } catch { return null; } };
check('webManifestUrl is on the declared host', hostOf(twa.webManifestUrl) === twa.host,
  `${hostOf(twa.webManifestUrl)} vs ${twa.host}`);
check('iconUrl is on the declared host', hostOf(twa.iconUrl) === twa.host);

// A half-finished domain move is the quiet version of this whole failure mode: the app
// keeps working, but assetlinks is fetched from one origin while the branding points at
// another, and the only symptom is a URL bar that should not be there.
const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const siteHost = (appSrc.match(/const SITE_HOST = "([^"]+)"/) || [])[1];
check('app.js SITE_HOST matches the packaged host', siteHost === twa.host, `${siteHost} vs ${twa.host}`);

const stale = [];
for (const f of ['app.js', 'index.html', 'manifest.json', 'README.md', 'docs/ANDROID-TWA.md', 'twa/twa-manifest.json']) {
  const body = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of body.matchAll(/https?:\/\/([a-z0-9.-]+\.(?:vercel\.app|netlify\.app|github\.io))/gi)) {
    stale.push(`${f}: ${m[1]}`);
  }
}
check('no leftover pre-domain host anywhere', stale.length === 0, stale.join('; '));

console.log('\n4. digital asset links');
check('assetlinks.json is a non-empty array', Array.isArray(links) && links.length > 0);
const entry = links[0] || {};
const target = entry.target || {};
check('delegates handle_all_urls', (entry.relation || []).includes('delegate_permission/common.handle_all_urls'));
check('namespace is android_app', target.namespace === 'android_app');
check('package id matches twa-manifest', target.package_name === twa.packageId,
  `${target.package_name} vs ${twa.packageId}`);

const prints = target.sha256_cert_fingerprints || [];
check('exactly one fingerprint slot', prints.length === 1, String(prints.length));
if (prints[0] === FINGERPRINT_PLACEHOLDER) {
  todo('fingerprint still a placeholder',
    'copy the SHA-256 from Play Console → Setup → App integrity → App signing key certificate');
} else {
  const shape = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/i.test(prints[0] || '');
  check('fingerprint looks like a SHA-256 certificate digest', shape, prints[0]);
  check('twa-manifest carries the same fingerprint',
    (twa.fingerprints || []).some(f => (f.value || f) === prints[0]),
    'bubblewrap writes this on `fingerprint add`');
}

console.log('\n5. store requirements that live in this repo');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
check('a privacy policy route exists', app.includes('#/privacy-policy'));
check('a terms route exists', app.includes('#/terms'));
check('an in-app account deletion path exists (Play requires one)', html.includes('deleteAccountBtn'));

console.log(failures ? `\n${failures} FAILURE(S)\n`
  : pending ? `\nconsistent — ${pending} step(s) still waiting on Play Console\n`
  : '\nTWA packaging is consistent\n');
process.exit(failures ? 1 : 0);
