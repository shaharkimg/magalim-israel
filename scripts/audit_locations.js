#!/usr/bin/env node
// Read-only audit of every landmark on the map: is the pin where the place really is,
// and is any place on the map twice? Writes a report, never touches the database.
//
//   node scripts/audit_locations.js                    landmarks from Supabase, OSM from Overpass
//   node scripts/audit_locations.js --from rows.json   landmarks from a JSON array instead
//   node scripts/audit_locations.js --cache            reuse data/audit/osm_places.json
//
// Location: each landmark is looked up by name among the named places of interest that
// OpenStreetMap has in Israel (see lib_osm.js), and the pin is measured against the
// nearest one with that name. Check-in works up to 1,500 m from the pin, so that is the
// line between "ok" and "worth a look".
//
// Duplicates: two landmarks that resolve to the same OpenStreetMap feature, or that have
// near-identical names within a few km of each other.
//
// Output: data/audit/locations.csv, data/audit/duplicates.csv, data/audit/summary.md
'use strict';
const fs = require('fs');
const path = require('path');
const { loadPlaces, norm, keyWords, metresBetween } = require('./lib_osm');
const { fetchRows, normalize } = require('./build_places');

const root = path.join(__dirname, '..');
const OUT = path.join(root, 'data/audit');
const args = process.argv.slice(2);
const argVal = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

const CHECKIN_M = 1500;      // server-side check-in radius (checkin_landmark)
const FAR_M = 5000;          // beyond this the pin is very likely on the wrong place

// A few more kinds of place than match_osm.js needs: the map also has beaches, parks and
// city attractions, and auditing those against nothing would just mark them "not found".
const EXTRA = [
  ['water', 'node["natural"="beach"]["name"]'],
  ['water', 'way["natural"="beach"]["name"]'],
  ['parks', 'way["leisure"="park"]["name"]'],
  ['urban', 'node["tourism"="attraction"]["name"]'],
  ['urban', 'way["tourism"="attraction"]["name"]'],
  ['heritage', 'node["historic"="castle"]["name"]'],
  ['nature', 'node["natural"="cave_entrance"]["name"]'],
  ['nature', 'node["place"="locality"]["name"]'],
];

// Bigram similarity, for duplicate names spelled slightly differently ("עין חובלה"/"עין חובילה").
function dice(a, b) {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const grams = s => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const A = grams(a), B = grams(b); let n = 0;
  for (const [g, v] of A) n += Math.min(v, B.get(g) || 0);
  return 2 * n / (a.length - 1 + b.length - 1);
}
// "גן לאומי עין חמד (אקווה בלה)" and "עין חמד" are the same place for duplicate purposes
const core = s => norm(s).replace(/\(.*?\)/g, '')
  .replace(/^(שמורת טבע|שמורת|שמורה|גן לאומי|הגן הלאומי|פארק|יער|חוף|העיר העתיקה ב|מצפור|מצפה)\s+/, '')
  .replace(/\s+/g, '');

const isTrail = l => /^tiuli-/.test(l.id) || /[:–]|מסלול|טיול|סיור|מקטע/.test(l.name);
const mapLink = (lat, lon) => `https://www.google.com/maps?q=${lat},${lon}`;
const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
const writeCsv = (file, cols, rows) =>
  fs.writeFileSync(path.join(OUT, file), '﻿' + cols.join(',') + '\n' + rows.map(r => cols.map(c => csvCell(r[c])).join(',')).join('\n') + '\n');

async function main() {
  const from = argVal('--from');
  const rows = normalize(from ? JSON.parse(fs.readFileSync(from, 'utf8')) : await fetchRows());
  console.log(`landmarks: ${rows.length}`);
  fs.mkdirSync(OUT, { recursive: true });
  const places = await loadPlaces(path.join(OUT, 'osm_places.json'), args.includes('--cache'), EXTRA);

  const byNorm = new Map(), byWord = new Map();
  places.forEach((p, i) => {
    p.i = i;
    for (const n of [norm(p.name), p.alt && norm(p.alt)].filter(Boolean)) (byNorm.get(n) || byNorm.set(n, []).get(n)).push(p);
    for (const w of keyWords(p.name + ' ' + (p.alt || ''))) (byWord.get(w) || byWord.set(w, []).get(w)).push(p);
  });

  // ---------- locations ----------
  const results = rows.map(l => {
    const exact = [...(byNorm.get(norm(l.name)) || []), ...(byNorm.get(norm(l.name.replace(/\(.*?\)/g, ''))) || [])];
    let cands = exact, how = 'exact name';
    const want = keyWords(l.name.replace(/\(.*?\)/g, ''));
    if (!cands.length && want.size) {
      const pool = new Set();
      for (const w of want) for (const c of byWord.get(w) || []) pool.add(c);
      cands = [...pool].filter(c => { const g = keyWords(c.name + ' ' + (c.alt || '')); return [...want].every(w => g.has(w)); });
      how = 'name contained';
    }
    const base = { id: l.id, name: l.name, region: l.region, category: l.category, lat: l.lat, lon: l.lon,
      trail: isTrail(l) ? 'yes' : '', pin_link: mapLink(l.lat, l.lon) };
    if (!cands.length) return { ...base, status: 'not_in_osm', how: '' };
    const ranked = cands.map(c => ({ c, d: metresBetween(l, c) })).sort((a, b) => a.d - b.d);
    const best = ranked[0];
    // An exact name is evidence of where the place is; a partial one ("פארק ספיר" inside
    // "עין ספיר") only confirms a pin that is already close, and proves nothing when far.
    const status = best.d <= CHECKIN_M ? 'ok'
      : how !== 'exact name' ? 'unverified'
      : best.d <= FAR_M ? 'check' : 'far';
    return { ...base, status, how, metres: Math.round(best.d), osm_name: best.c.name, osm_lat: best.c.lat.toFixed(6),
      osm_lon: best.c.lon.toFixed(6), osm_link: mapLink(best.c.lat, best.c.lon), same_name_in_osm: cands.length, _osm: best.c };
  });

  // ---------- duplicates ----------
  const dups = [], seen = new Set();
  const addDup = (a, b, why) => {
    const k = [a.id, b.id].sort().join('|'); if (seen.has(k)) return; seen.add(k);
    dups.push({ id_a: a.id, name_a: a.name, id_b: b.id, name_b: b.name, metres: Math.round(metresBetween(a, b)), why,
      link_a: mapLink(a.lat, a.lon), link_b: mapLink(b.lat, b.lon) });
  };
  // (a) two landmarks resolved to the same OSM feature, both pinned close to it
  const byFeature = new Map();
  for (const r of results) if (r._osm && r.metres <= CHECKIN_M) (byFeature.get(r._osm.i) || byFeature.set(r._osm.i, []).get(r._osm.i)).push(r);
  for (const group of byFeature.values()) for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++)
    addDup(group[i], group[j], `same OSM place: ${group[i].osm_name}`);
  // (b) near-identical names close together
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j], d = metresBetween(a, b);
    if (d > 3000) continue;
    const ca = core(a.name), cb = core(b.name), s = dice(ca, cb);
    if (ca === cb) addDup(a, b, 'same name');
    else if (s >= 0.8) addDup(a, b, `similar name (${s.toFixed(2)})`);
  }
  // (c) the same name far apart: either two real places or one pin on the wrong place
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    if (core(a.name) !== core(b.name) || core(a.name).length < 3) continue;
    const d = metresBetween(a, b);
    if (d > 3000) addDup(a, b, 'same name, far apart');
  }

  // ---------- report ----------
  const order = { far: 0, check: 1, unverified: 2, not_in_osm: 3, ok: 4 };
  results.sort((a, b) => order[a.status] - order[b.status] || (b.metres || 0) - (a.metres || 0));
  writeCsv('locations.csv', ['status', 'metres', 'id', 'name', 'region', 'category', 'trail', 'how', 'osm_name', 'same_name_in_osm',
    'lat', 'lon', 'osm_lat', 'osm_lon', 'pin_link', 'osm_link'], results);
  dups.sort((a, b) => a.metres - b.metres);
  writeCsv('duplicates.csv', ['why', 'metres', 'id_a', 'name_a', 'id_b', 'name_b', 'link_a', 'link_b'], dups);

  const count = s => results.filter(r => r.status === s).length;
  const lines = [
    '# בדיקת מיקומים וכפילויות', '',
    `נבדקו ${rows.length} יעדים מול ${places.length} מקומות בעלי שם ב-OpenStreetMap.`, '',
    `| מצב | יעדים |`, `|---|---|`,
    `| תקין (עד ${CHECKIN_M} מ' מהמקום ב-OSM) | ${count('ok')} |`,
    `| לבדוק (${CHECKIN_M}–${FAR_M} מ') | ${count('check')} |`,
    `| רחוק (מעל ${FAR_M} מ') | ${count('far')} |`,
    `| התאמה חלקית בלבד ורחוקה - לא אומת | ${count('unverified')} |`,
    `| לא נמצא ב-OSM | ${count('not_in_osm')} (מתוכם מסלולים: ${results.filter(r => r.status === 'not_in_osm' && r.trail).length}) |`, '',
    `כפילויות אפשריות: ${dups.length}`, '',
  ];
  fs.writeFileSync(path.join(OUT, 'summary.md'), lines.join('\n'));
  console.log('\n' + lines.join('\n'));
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
