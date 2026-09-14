#!/usr/bin/env node
// Places the pending list by downloading the map features themselves, instead
// of asking a geocoder "where is X?" 305 times.
//
// Why this replaced the geocoder:
//   - Nominatim returned 429 on the first request. Its policy forbids bulk
//     geocoding, which is exactly what 305 lookups is, and CI IPs are blocked
//     anyway. No amount of fixing the queries changes that.
//   - Even when it answered it answered wrongly, because a geocoder searches
//     everything: "בית צידה" matched a street in Zichron Ya'akov, "דרך
//     הטמפלרים" one in Kiryat Tivon. Israeli streets are named after historical
//     sites, so the names matched exactly and no name check could separate them.
//
// Overpass is built for this: ask for every named spring in Israel, every
// viewpoint, every archaeological site, and match locally. A street can never
// appear in the answer, because streets were never asked for. It is also a
// handful of requests rather than 305, and bulk extraction is what the service
// is for rather than something it tolerates.
//
// Usage:
//   node scripts/match_osm.js                 (fetch, match, write)
//   node scripts/match_osm.js --cache         (reuse data/osm_places.json)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const BBOX = '29.4,34.2,33.4,35.95';                 // south,west,north,east
const CACHE = path.join(root, 'data/osm_places.json');
const USE_CACHE = process.argv.includes('--cache');

// One selector per request. The first attempt bundled every water tag into a
// single query and the server returned 504 four times: "every named stream in
// Israel" is enormous, since each stream is many way segments. Asked one tag at
// a time each query is small, and a tag that still fails costs only itself.
//
// waterway=stream and natural=water are deliberately absent. They are the heavy
// ones, and a stream is a line rather than a place to stand, so a centre point
// on it would be arbitrary anyway. Springs and waterfalls carry the list's
// water entries.
const SELECTORS = [
  ['water', 'node["natural"="spring"]["name"]'],
  ['water', 'way["natural"="spring"]["name"]'],
  ['water', 'node["natural"="waterfall"]["name"]'],
  ['water', 'node["waterway"="waterfall"]["name"]'],
  ['viewpoints', 'node["tourism"="viewpoint"]["name"]'],
  ['archaeology', 'node["historic"="archaeological_site"]["name"]'],
  ['archaeology', 'way["historic"="archaeological_site"]["name"]'],
  ['archaeology', 'node["historic"="ruins"]["name"]'],
  ['heritage', 'node["historic"="memorial"]["name"]'],
  ['heritage', 'node["historic"="monument"]["name"]'],
  ['heritage', 'way["historic"="castle"]["name"]'],
  ['heritage', 'node["tourism"="museum"]["name"]'],
  ['nature', 'node["natural"="peak"]["name"]'],
  ['nature', 'way["leisure"="nature_reserve"]["name"]'],
  ['nature', 'relation["leisure"="nature_reserve"]["name"]'],
  ['nature', 'way["boundary"="national_park"]["name"]'],
  ['nature', 'relation["boundary"="national_park"]["name"]'],
  ['nature', 'way["landuse"="forest"]["name"]'],
];
// overpass-api.de is the busiest instance; kumi is a maintained mirror. Rotating
// means one overloaded server does not end the run.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function overpass(selector) {
  const q = '[out:json][timeout:90];(' + selector + '(' + BBOX + '););out center tags;';
  let lastError = 'unknown';
  for (let attempt = 0; attempt < 4; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'magalim-israel/1.0 (one-off landmark seeding)' },
        body: 'data=' + encodeURIComponent(q),
      });
    } catch (e) { lastError = e.message; await sleep(10000); continue; }

    if (res.ok) {
      const json = await res.json();
      if (json.elements) return json.elements;
      lastError = 'no elements in response';
    } else if (res.status === 429) {
      lastError = 'rate limited';
      await sleep(20000);
      continue;
    } else if (res.status === 504) {
      lastError = 'server timed out on the query';
      await sleep(10000);
      continue;
    } else {
      lastError = 'HTTP ' + res.status;
    }
    await sleep(5000);
  }
  throw new Error(lastError);
}

async function fetchAll() {
  const out = [];
  const failed = [];
  for (const [theme, selector] of SELECTORS) {
    const label = selector.replace(/\["name"\]/, '').replace(/[["\]]/g, ' ').trim();
    process.stdout.write('  ' + label.padEnd(42) + ' ');
    try {
      const els = await overpass(selector);
      let kept = 0;
      for (const e of els) {
        const lat = e.lat ?? (e.center && e.center.lat);
        const lon = e.lon ?? (e.center && e.center.lon);
        const name = e.tags && (e.tags['name:he'] || e.tags.name);
        if (lat == null || lon == null || !name) continue;
        out.push({ name, lat, lon, theme, alt: e.tags.alt_name || '' });
        kept++;
      }
      console.log(kept + ' named');
    } catch (e) {
      // One tag failing is not worth losing the other seventeen over.
      console.log('FAILED — ' + e.message);
      failed.push(label + ' (' + e.message + ')');
    }
    await sleep(2000);                                // be a good neighbour
  }
  if (failed.length) {
    console.log('\n  ' + failed.length + ' of ' + SELECTORS.length + ' queries failed:');
    for (const f of failed) console.log('    ' + f);
  }
  if (!out.length) throw new Error('every Overpass query failed — nothing to match against');
  return out;
}

// Hebrew spelling is the whole problem: the same site is "תל בית צידה" in one
// source and "תל בית ציידא" in another. Strip what varies and compare the rest.
function norm(s) {
  return String(s || '')
    .replace(/[״׳"'’“”]/g, '')
    .replace(/[()\[\],.\-–—:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const NOISE = new Set(['גן', 'לאומי', 'שמורת', 'שמורה', 'טבע', 'אתר', 'פארק',
  'מסלול', 'ישראל', 'של', 'ליד', 'הר', 'נחל', 'עין', 'יער', 'דרך', 'נוף']);
function keyWords(s) {
  return new Set(norm(s).split(' ').filter(w => w.length >= 3 && !NOISE.has(w)));
}

function metresBetween(a, b) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
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

const sqlStr = s => "'" + String(s).replace(/'/g, "''") + "'";
function slug(name, taken) {
  const base = 'lm-' + require('crypto').createHash('sha1').update(name).digest('hex').slice(0, 8);
  let id = base, n = 2;
  while (taken.has(id)) id = base + '-' + n++;
  taken.add(id);
  return id;
}

(async () => {
  let places;
  if (USE_CACHE && fs.existsSync(CACHE)) {
    places = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
    console.log('using cached OSM data: ' + places.length + ' named features\n');
  } else {
    console.log('downloading named map features in Israel from Overpass:');
    places = await fetchAll();
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, JSON.stringify(places));
    console.log('\n' + places.length + ' named features total\n');
  }

  // index by normalised name and by key word, so a lookup is not 305 x 20000
  const byNorm = new Map(), byWord = new Map();
  for (const p of places) {
    const n = norm(p.name);
    if (!byNorm.has(n)) byNorm.set(n, []);
    byNorm.get(n).push(p);
    for (const w of keyWords(p.name)) {
      if (!byWord.has(w)) byWord.set(w, []);
      byWord.get(w).push(p);
    }
  }

  const pending = parseCsv(fs.readFileSync(path.join(root, 'data/pending_landmarks.csv'), 'utf8'));
  const known = existingLandmarks();
  const taken = new Set(known.map(k => k.id));
  console.log('pending: ' + pending.length + ' | already on the map: ' + known.length + '\n');

  const accepted = [], duplicates = [], missing = [];
  for (const p of pending) {
    const want = keyWords(p.name);
    let hit = (byNorm.get(norm(p.name)) || [])[0];
    let how = 'exact name';
    if (!hit && want.size) {
      // every key word of the wanted name present in the candidate: this is what
      // finds "תל בית צידה" from "בית צידה", and what stops "יער לביא" from
      // matching "יער בן שמן"
      const pool = new Set();
      for (const w of want) for (const c of byWord.get(w) || []) pool.add(c);
      const full = [...pool].filter(c => { const g = keyWords(c.name); return [...want].every(w => g.has(w)); });
      if (full.length === 1) { hit = full[0]; how = 'name contained'; }
      else if (full.length > 1) {
        missing.push({ ...p, why: full.length + ' places share this name: ' + full.slice(0, 4).map(f => f.name).join(' | ') });
        continue;
      }
    }
    if (!hit) { missing.push({ ...p, why: 'not in OpenStreetMap under this name' }); continue; }

    const near = known.find(k => metresBetween(k, hit) < 300);
    if (near) {
      duplicates.push({ ...p, why: 'already on the map as "' + near.name + '"',
        found: hit.name, lat: hit.lat, lon: hit.lon, metres: Math.round(metresBetween(near, hit)) });
      continue;
    }
    const id = slug(p.name, taken);
    accepted.push({ ...p, id, lat: hit.lat, lon: hit.lon, found: hit.name, how });
    known.push({ id, name: p.name, lat: hit.lat, lon: hit.lon });
  }

  console.log('placed          : ' + accepted.length);
  console.log('already on map  : ' + duplicates.length);
  console.log('not found       : ' + missing.length + '\n');

  if (accepted.length) {
    fs.writeFileSync(path.join(root, 'supabase/migrations_new_landmarks_from_list.sql'), [
      '-- Generated by scripts/match_osm.js from data/pending_landmarks.csv.',
      '-- Coordinates come from named OpenStreetMap features, matched by name and',
      '-- de-duplicated against the existing map. Do not hand-edit; re-run instead.',
      '',
      'insert into public.landmarks',
      '  (id, name, description, category, difficulty, region, lat, lon, duration,',
      '   distance_km, base_visits, family_friendly, dog_friendly, accessible,',
      '   has_water, price_type, season, duration_hours, official_url)',
      'values',
      accepted.map(a => '  (' + [
        sqlStr(a.id), sqlStr(a.name),
        sqlStr(a.name + ' — ' + (a.type_raw || 'אתר טיול') + ' באזור ' + (a.region_raw || '')),
        sqlStr(a.category), sqlStr('easy'), sqlStr(a.region), a.lat, a.lon,
        'null', 'null', 0, 'true', 'false', 'false',
        a.category === 'water' ? 'true' : 'false',
        sqlStr('free'), 'null', 'null', a.source ? sqlStr(a.source) : 'null',
      ].join(', ') + ')').join(',\n'),
      'on conflict (id) do nothing;', '',
    ].join('\n'));
    console.log('wrote supabase/migrations_new_landmarks_from_list.sql');
  }

  const csv = (file, head, rows, cols) => {
    fs.writeFileSync(path.join(root, file), head + '\n' + rows.map(r =>
      cols.map(c => '"' + String(r[c] ?? '').replace(/"/g, '""') + '"').join(',')).join('\n') + '\n');
  };
  // Matched by name, so the name is right - but the same name can sit on the
  // wrong feature. Scan this before running the migration.
  csv('data/geocode_accepted.csv', 'name,matched_in_osm,how,map_link',
    accepted.map(a => ({ ...a, map_link: 'https://www.google.com/maps?q=' + a.lat + ',' + a.lon })),
    ['name', 'found', 'how', 'map_link']);
  csv('data/geocode_duplicates.csv', 'name,already_on_map_as,metres_apart,map_link',
    duplicates.map(d => ({ ...d, map_link: 'https://www.google.com/maps?q=' + d.lat + ',' + d.lon })),
    ['name', 'why', 'metres', 'map_link']);
  csv('data/geocode_review.csv', 'name,region_raw,type_raw,why', missing,
    ['name', 'region_raw', 'type_raw', 'why']);
  console.log('wrote data/geocode_accepted.csv, geocode_duplicates.csv, geocode_review.csv');
})();
