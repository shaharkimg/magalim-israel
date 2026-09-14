#!/usr/bin/env node
// The app carries its version in three places that MUST move together on every deploy:
//
//   app.js     APP_VERSION      - what the running app believes it is
//   index.html app.js?v=...     - the URL the browser caches the script under
//   sw.js      CACHE_VERSION    - the service-worker cache name, purged on activate
//
// When they drift, a deploy can silently fail to reach users: the script URL does not
// change so the browser may keep serving the cached file, the service worker is
// byte-identical so it never reinstalls or purges its old shell cache, and
// checkForNewVersion() compares APP_VERSION against the deployed index.html and finds
// them equal - so the "a new version is available" banner never appears either. The
// user sees an app that did not change and has no way to find out why.
//
// This happened: several deploys went out on a frozen 20260906a2.
//
// Run: node scripts/check_version.js
const fs = require('fs');
const path = require('path');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const pick = (file, re, label) => {
  const m = read(file).match(re);
  return { label, file, value: m && m[1] };
};

const found = [
  pick('app.js', /APP_VERSION\s*=\s*"([\w.-]+)"/, 'APP_VERSION'),
  pick('index.html', /app\.js\?v=([\w.-]+)/, 'app.js?v='),
  pick('sw.js', /CACHE_VERSION\s*=\s*"([\w.-]+)"/, 'CACHE_VERSION'),
];

const missing = found.filter(f => !f.value);
const distinct = new Set(found.filter(f => f.value).map(f => f.value));

for (const f of found) console.log(`  ${f.file.padEnd(11)} ${f.label.padEnd(14)} ${f.value || '(NOT FOUND)'}`);

let failed = false;
if (missing.length) {
  console.log('\nCould not read: ' + missing.map(m => `${m.label} in ${m.file}`).join(', '));
  failed = true;
} else if (distinct.size > 1) {
  console.log('\nversions have DRIFTED — set all three to the same value before deploying');
  failed = true;
}
console.log(failed ? '\nversion check FAILED\n' : `\nversion check passed (${[...distinct][0]})`);
process.exit(failed ? 1 : 0);
