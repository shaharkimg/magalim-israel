#!/usr/bin/env node
// Verifies the live deployment against what the repo expects, over the network.
// Run it from a machine with internet access — the agent sandbox has none, so this is
// the part of the migration that cannot be checked from inside a session.
//
//   node scripts/check_live.js
//   node scripts/check_live.js https://some-other-host      (override)
//
// It checks the things that fail *quietly* after a domain move: assetlinks served with
// the wrong content type or behind a redirect, a manifest whose name drifted from the
// packaged one, and a site that answers on www but not on the apex (or the reverse).
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const twa = JSON.parse(fs.readFileSync(path.join(root, 'twa/twa-manifest.json'), 'utf8'));
const localManifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const localLinks = JSON.parse(fs.readFileSync(path.join(root, '.well-known/assetlinks.json'), 'utf8'));

const arg = (process.argv[2] || '').replace(/\/$/, '');
const host = arg.replace(/^https?:\/\//, '')
  || (app.match(/const SITE_HOST = "([^"]+)"/) || [])[1]
  || twa.host;
// an explicit http:// argument is honoured so the script can be exercised against a
// local static server; anything else is https, which is what production must be
const base = /^http:\/\//.test(arg) ? arg : 'https://' + host;

let failures = 0, warnings = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
};
const warn = (name, detail) => { console.log(`  WARN  ${name}${detail ? ' — ' + detail : ''}`); warnings++; };

const get = async url => {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const body = await res.text();
    return { ok: true, status: res.status, type: res.headers.get('content-type') || '', url: res.url, body };
  } catch (e) {
    return { ok: false, error: e.message };
  }
};

(async () => {
  console.log(`\nchecking ${base}\n`);

  // Answers the question a `dig` would, for anyone without a terminal: has the domain
  // actually been delegated, and to whom. A domain that still points at the old
  // registrar looks identical from the browser to one that was never configured.
  console.log('0. DNS');
  try {
    const ns = (await dns.resolveNs(host)).map(n => n.toLowerCase()).sort();
    console.log(`        nameservers: ${ns.join(', ')}`);
    const onVercel = ns.some(n => /vercel-dns/.test(n));
    if (onVercel) check('delegated to Vercel DNS', true);
    else warn('not delegated to Vercel DNS', 'still ' + ns.join(', ') + ' — either the change has not propagated, or it did not save');
  } catch (e) {
    warn('no nameservers found for the domain', e.code || e.message);
  }
  try {
    const a = await dns.resolve4(host);
    console.log(`        A records: ${a.join(', ')}`);
  } catch (e) {
    warn('the domain does not resolve to an address yet', e.code || e.message);
  }
  try {
    const wwwA = await dns.resolve('www.' + host, 'A').catch(() => dns.resolveCname('www.' + host));
    console.log(`        www: ${[].concat(wwwA).join(', ')}`);
  } catch (e) {
    console.log(`        www: ${e.code || 'not set'}`);
  }

  console.log('\n1. the site answers');
  const home = await get(base + '/');
  if (!home.ok) { check('reachable', false, home.error); }
  else {
    check('reachable', home.status === 200, 'HTTP ' + home.status);
    check('serves the app, not a placeholder', /id="view-map"|<title>/.test(home.body));
    const landed = home.url.replace(/\/$/, '');
    if (landed !== base) {
      warn('redirected away from the packaged host',
        `${base} → ${home.url} — the TWA verifies assetlinks against ${twa.host} only, so this host must serve the app itself, not redirect`);
    }
  }

  console.log('\n2. the web manifest');
  const man = await get(base + '/manifest.json');
  check('manifest.json is reachable', man.ok && man.status === 200, man.ok ? 'HTTP ' + man.status : man.error);
  if (man.ok && man.status === 200) {
    let live = null;
    try { live = JSON.parse(man.body); } catch (e) { /* reported below */ }
    check('manifest is valid JSON', !!live);
    if (live) {
      check('deployed name matches the repo', live.name === localManifest.name, `${live.name} vs ${localManifest.name}`);
      check('deployed name matches the packaged app', live.name === twa.name, `${live.name} vs ${twa.name}`);
      check('short_name matches', live.short_name === localManifest.short_name);
    }
  }

  console.log('\n3. digital asset links — the one that fails silently');
  const al = await get(base + '/.well-known/assetlinks.json');
  if (!al.ok || al.status !== 200) {
    check('assetlinks.json is reachable', false,
      (al.ok ? 'HTTP ' + al.status : al.error) + ' — dot-directories are sometimes dropped by static hosts');
  } else {
    check('assetlinks.json is reachable', true);
    check('served as JSON', /application\/json/.test(al.type), al.type || '(no content-type)');
    if (al.url !== base + '/.well-known/assetlinks.json') {
      warn('served after a redirect', al.url + ' — Chrome follows it, but verify it is not an HTML 404 page');
    }
    let live = null;
    try { live = JSON.parse(al.body); } catch (e) { /* reported below */ }
    check('valid JSON', !!live);
    if (live) {
      const target = (live[0] || {}).target || {};
      check('package id matches the packaged app', target.package_name === twa.packageId,
        `${target.package_name} vs ${twa.packageId}`);
      const print = (target.sha256_cert_fingerprints || [])[0] || '';
      if (print === 'REPLACE_WITH_SHA256_FROM_PLAY_CONSOLE') {
        warn('fingerprint is still the placeholder',
          'expected until the first Play Console upload — the TWA will show a URL bar until it is real');
      } else {
        check('fingerprint looks like a SHA-256 digest', /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/i.test(print), print);
        const repoPrint = ((((localLinks[0] || {}).target || {}).sha256_cert_fingerprints) || [])[0];
        check('deployed fingerprint matches the repo', print === repoPrint,
          repoPrint ? 'the repo and the live file have drifted' : 'the repo file has no fingerprint');
      }
    }
  }

  console.log('\n4. icons the store and the launcher need');
  for (const icon of ['/icon-192.png', '/icon-512.png']) {
    const r = await get(base + icon);
    check(`${icon} is reachable`, r.ok && r.status === 200, r.ok ? 'HTTP ' + r.status : r.error);
  }

  console.log(failures ? `\n${failures} FAILURE(S)${warnings ? `, ${warnings} warning(s)` : ''}\n`
    : warnings ? `\nlive deployment is consistent — ${warnings} warning(s) above\n`
    : '\nlive deployment is consistent\n');
  process.exit(failures ? 1 : 0);
})();
