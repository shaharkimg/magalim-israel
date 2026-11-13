#!/usr/bin/env node
// The place-page generator against a fixture: escaping of database text (names and
// descriptions come from an admin form), the safety floor that refuses to wipe the pages
// on a near-empty fetch, and that every page/sitemap URL is on the canonical host.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const script = path.join(__dirname, 'build_places.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'places-'));
let failures = 0;
const check = (name, cond) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) failures++; };

const rows = [];
for (let i = 0; i < 120; i++) rows.push({ id: `p-${i}`, name: `מקום ${i}`, description: 'תיאור', category: 'water',
  difficulty: 'easy', region: i % 2 ? 'north' : 'eilat', lat: 31 + i / 100, lon: 35 + i / 100, price_type: 'free' });
rows.push({ id: 'evil', name: '<script>alert(1)</script>', description: '</script><img src=x onerror=alert(2)>',
  category: 'nature', difficulty: 'medium', region: 'center', lat: 32, lon: 34.8,
  stock_photo_url: 'javascript:alert(3)', official_url: 'https://example.org/"><b>', price_type: 'paid' });
rows.push({ id: '../escape', name: 'x', region: 'north', lat: 1, lon: 1 });   // bad id: skipped
rows.push({ id: 'nocoords', name: 'x', region: 'north', lat: null, lon: 1 });  // no coords: skipped
const data = path.join(tmp, 'rows.json');
fs.writeFileSync(data, JSON.stringify(rows));
const out = path.join(tmp, 'out');
execFileSync('node', [script, '--from', data, '--out', out], { stdio: 'pipe' });

const evil = fs.readFileSync(path.join(out, 'places/evil/index.html'), 'utf8');
check('name is escaped in the page', !evil.includes('<script>alert(1)') && evil.includes('&lt;script&gt;alert(1)'));
check('description cannot close the JSON-LD block', !/<\/script><img/.test(evil));
check('javascript: photo URL dropped', !evil.includes('javascript:'));
check('official URL with markup dropped', !evil.includes('<b>'));
check('bad ids and missing coordinates skipped', !fs.existsSync(path.join(out, 'escape')) && !fs.existsSync(path.join(out, 'places/nocoords')));
check('region pages built', ['north', 'eilat', 'center'].every(r => fs.existsSync(path.join(out, `regions/${r}/index.html`))));
const sm = fs.readFileSync(path.join(out, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
check('sitemap lists home, hub, regions and every place', locs.length === 1 + 1 + 3 + 121);
check('every sitemap URL on the www host', locs.every(u => u.startsWith('https://www.megalim-israel.co.il/')));
const north = fs.readFileSync(path.join(out, 'places/p-1/index.html'), 'utf8');
check('Hebrew "in the region" is בצפון, not בהצפון', north.includes('בצפון') && !/בה(צפון|מרכז|דרום)/.test(north + evil));
check('canonical on the www host', evil.includes('<link rel="canonical" href="https://www.megalim-israel.co.il/places/evil/">'));

// stale page from a previous run is removed
fs.mkdirSync(path.join(out, 'places/gone'), { recursive: true });
fs.writeFileSync(path.join(out, 'places/gone/index.html'), 'old');
execFileSync('node', [script, '--from', data, '--out', out], { stdio: 'pipe' });
check('deleted landmark loses its page', !fs.existsSync(path.join(out, 'places/gone')));

// a near-empty result must not wipe what is there
fs.writeFileSync(data, JSON.stringify(rows.slice(0, 5)));
let refused = false;
try { execFileSync('node', [script, '--from', data, '--out', out], { stdio: 'pipe' }); } catch { refused = true; }
check('refuses to publish from a near-empty fetch', refused && fs.existsSync(path.join(out, 'places/p-0/index.html')));

fs.rmSync(tmp, { recursive: true, force: true });
if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nplace pages generator: all checks passed');
