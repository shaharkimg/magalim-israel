#!/usr/bin/env node
// Turns data/geo_points.csv into a landmarks migration.
//
// These coordinates were supplied with the trip list and are already verified -
// every row carries a status of "אומת" and a confidence level. So there is no
// lookup here, and nothing to invent: the work is deciding which of them are
// genuinely new, which is the part names cannot answer.
//
// Names cannot answer it because Hebrew spellings differ between sources:
// "בית צידה" and "תל בית ציידא" are the same site 101m apart, and an exact-name
// comparison of the earlier list found only 29 overlaps where distance finds far
// more. So this matches on distance:
//
//   under 150m of an existing landmark  -> the same place, skipped
//   150m to 300m                        -> too close to call, held for review
//   over 300m                           -> new
//
// The middle band exists because proximity alone over-merges: אנדרטת חץ שחור
// sits 174m from מסעד לבארי and they are different things. Those are written to
// a review file rather than guessed at in either direction.
//
// Run: node scripts/import_geo_points.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SAME = 150, UNSURE = 300;

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] || ''])));
}

function existingLandmarks() {
  const out = [];
  for (const f of fs.readdirSync(path.join(root, 'supabase'))) {
    if (!f.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(root, 'supabase', f), 'utf8');
    const re = /\(\s*'([a-z0-9][a-z0-9-]*)',\s*'((?:[^']|'')+)',[\s\S]{0,600}?,\s*(-?\d+\.\d+),\s*(-?\d+\.\d+),/g;
    let m;
    while ((m = re.exec(sql))) out.push({ id: m[1], name: m[2].replace(/''/g, "'"), lat: +m[3], lon: +m[4] });
  }
  return out;
}

function metresBetween(a, b) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// The source marks every row verified, and two are still wrong: פארק הולנד
// באילת sits at latitude 31.0, some 165km north of Eilat, and רוחמה הישנה at
// 29.57 in the Eilat hills when Ruhama is in the northern Negev. A name that
// says where it is contradicting its own coordinate is checkable, so check it.
const PLACE_LATITUDES = [
  [['אילת'], 29.4, 29.9],
  [['מצדה', 'עין גדי'], 30.9, 31.9],
  [['ירושלים'], 31.6, 31.9],
  [['יפו', 'אביב'], 31.9, 32.3],
  [['חיפה', 'כרמל'], 32.5, 32.9],
  [['כנרת', 'טבריה'], 32.6, 33.0],
  [['גולן', 'חרמון', 'חולה', 'מטולה'], 32.8, 33.4],
];
// Whole words only. Matching substrings flagged "הר שיפון" as Tel Aviv, because
// שיפון contains יפו. Hebrew glues one-letter prefixes onto a word - "באילת" is
// ב+אילת - so a single leading letter is allowed and nothing more.
function nameContradictsCoordinate(name, lat) {
  const words = String(name).replace(/[(),.\-–—:"'״׳]/g, ' ').split(/\s+/).filter(Boolean);
  for (const [places, lo, hi] of PLACE_LATITUDES) {
    const named = places.some(pl => words.some(w => w === pl || w.slice(1) === pl));
    if (named && (lat < lo || lat > hi)) {
      return 'name says ' + places[0] + ' but latitude ' + lat.toFixed(3) +
        ' is outside ' + lo + '–' + hi;
    }
  }
  return null;
}

const sqlStr = s => "'" + String(s).replace(/'/g, "''") + "'";
function slug(name, taken) {
  const base = 'lm-' + require('crypto').createHash('sha1').update(name).digest('hex').slice(0, 8);
  let id = base, n = 2;
  while (taken.has(id)) id = base + '-' + n++;
  taken.add(id);
  return id;
}

// Confirmed wrong by inspection, not by any check here: רוחמה is in the
// northern Negev (~31.5) but this row's coordinate is 29.57 - the Eilat hills,
// ~200km off. Nothing in the name flags it (unlike פארק הולנד באילת, which
// names the place it contradicts), so it slipped past nameContradictsCoordinate
// and had to be pulled after the fact. Excluded by name so re-running this
// script does not resurrect it.
const REJECTED = new Set(['רוחמה הישנה']);

const points = parseCsv(fs.readFileSync(path.join(root, 'data/geo_points.csv'), 'utf8'))
  .map(p => ({ ...p, lat: +p.lat, lon: +p.lon }))
  .filter(p => !REJECTED.has(p.name));
const known = existingLandmarks();
const taken = new Set(known.map(k => k.id));
console.log('points with coordinates : ' + points.length);
console.log('already on the map      : ' + known.length + '\n');

const added = [], duplicate = [], unsure = [], wrong = [];
for (const p of points) {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) { continue; }
  const contradiction = nameContradictsCoordinate(p.name, p.lat);
  if (contradiction) { wrong.push({ ...p, why: contradiction }); continue; }
  let nearest = null, best = Infinity;
  for (const k of known) {
    const d = metresBetween(k, p);
    if (d < best) { best = d; nearest = k; }
  }
  const row = { ...p, nearest: nearest ? nearest.name : '', metres: Math.round(best) };
  if (best < SAME) duplicate.push(row);
  else if (best < UNSURE) unsure.push(row);
  else {
    const id = slug(p.name, taken);
    added.push({ ...row, id });
    known.push({ id, name: p.name, lat: p.lat, lon: p.lon });   // later rows dedup against it too
  }
}

console.log('new, being added        : ' + added.length);
console.log('same place, skipped     : ' + duplicate.length + '  (under ' + SAME + 'm)');
console.log('too close to call       : ' + unsure.length + '  (' + SAME + '-' + UNSURE + 'm, left out)');
console.log('coordinate looks wrong  : ' + wrong.length);
for (const w of wrong) console.log('   ' + w.name + ' — ' + w.why);
console.log('');

fs.writeFileSync(path.join(root, 'supabase/migrations_new_landmarks_from_list.sql'), [
  '-- Generated by scripts/import_geo_points.js from data/geo_points.csv.',
  '-- Coordinates come with the source list, already marked verified there.',
  '-- Rows within ' + SAME + 'm of an existing landmark are left out as the same place,',
  '-- and ' + SAME + '-' + UNSURE + 'm are held back in data/geo_points_review.csv.',
  '-- Do not hand-edit; re-run instead.',
  '',
  'insert into public.landmarks',
  '  (id, name, description, category, difficulty, region, lat, lon, duration,',
  '   distance_km, base_visits, family_friendly, dog_friendly, accessible,',
  '   has_water, price_type, season, duration_hours, official_url)',
  'values',
  added.map(a => '  (' + [
    sqlStr(a.id), sqlStr(a.name),
    sqlStr(a.name + ' — ' + (a.type_raw || 'אתר טיול') + ' באזור ' + (a.region_raw || '')),
    // duration and distance_km are NOT NULL in the schema, and the source lists
    // both as "לא נבדק". An empty duration and a zero distance are what the app
    // already treats as unknown and hides, so nothing is invented to fill them.
    sqlStr(a.category), sqlStr('easy'), sqlStr(a.region), a.lat, a.lon,
    sqlStr(''), 0, 0, 'true', 'false', 'false',
    a.category === 'water' ? 'true' : 'false',
    sqlStr('free'), 'null', 'null', a.source ? sqlStr(a.source) : 'null',
  ].join(', ') + ')').join(',\n'),
  'on conflict (id) do nothing;',
  '',
].join('\n'));

const csv = (file, head, rows, cols) =>
  fs.writeFileSync(path.join(root, file), head + '\n' + rows.map(r =>
    cols.map(c => '"' + String(r[c] ?? '').replace(/"/g, '""') + '"').join(',')).join('\n') + '\n');

const link = r => 'https://www.google.com/maps?q=' + r.lat + ',' + r.lon;
csv('data/geo_points_added.csv', 'name,category,region,confidence,map_link',
  added.map(a => ({ ...a, map_link: link(a) })), ['name', 'category', 'region', 'confidence', 'map_link']);
csv('data/geo_points_review.csv', 'name,nearest_existing,metres_apart,map_link',
  unsure.map(u => ({ ...u, map_link: link(u) })), ['name', 'nearest', 'metres', 'map_link']);
csv('data/geo_points_duplicates.csv', 'name,already_on_map_as,metres_apart',
  duplicate, ['name', 'nearest', 'metres']);

console.log('wrote supabase/migrations_new_landmarks_from_list.sql');
csv('data/geo_points_wrong.csv', 'name,lat,lon,why,map_link',
  wrong.map(w => ({ ...w, map_link: link(w) })), ['name', 'lat', 'lon', 'why', 'map_link']);
console.log('wrote data/geo_points_added.csv, geo_points_review.csv,');
console.log('      geo_points_duplicates.csv, geo_points_wrong.csv');
