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

// Grouped so one slow theme cannot time out the rest, and so a failure says
// which kind of place is missing from the result.
const THEMES = {
  water: ['node["natural"="spring"]["name"]', 'way["natural"="spring"]["name"]',
    'node["natural"="waterfall"]["name"]', 'way["waterway"="waterfall"]["name"]',
    'way["natural"="water"]["name"]', 'way["waterway"="stream"]["name"]',
    'relation["waterway"="stream"]["name"]'],
  viewpoints: ['node["tourism"="viewpoint"]["name"]', 'way["tourism"="viewpoint"]["name"]'],
  archaeology: ['node["historic"="archaeological_site"]["name"]',
    'way["historic"="archaeological_site"]["name"]',
    'node["historic"="ruins"]["name"]', 'way["historic"="ruins"]["name"]'],
  heritage: ['node["historic"="memorial"]["name"]', 'way["historic"="memorial"]["name"]',
    'node["historic"="monument"]["name"]', 'way["historic"="castle"]["name"]',
    'node["tourism"="museum"]["name"]'],
  nature: ['way["leisure"="nature_reserve"]["name"]', 'relation["leisure"="nature_reserve"]["name"]',
    'way["boundary"="national_park"]["name"]', 'relation["boundary"="national_park"]["name"]',
    'way["landuse"="forest"]["name"]', 'relation["landuse"="forest"]["name"]',
    'node["natural"="peak"]["name"]', 'way["leisure"="park"]["name"]'],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function overpass(theme, parts) {
  const q = '[out:json][timeout:180];(' +
    parts.map(p => p + '(' + BBOX + ');').join('') + ');out center tags;';
  // Overpass rate-limits by slot rather than by a fixed interval, so a 429 or a
  // 504 means wait and ask again rather than give up.
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'magalim-israel/1.0 (one-off landmark seeding)' },
      body: 'data=' + encodeURIComponent(q),
    });
    if (res.status === 429 || res.status === 504) {
      const wait = attempt * 30;
      console.log('  ' + theme + ': busy (HTTP ' + res.status + '), waiting ' + wait + 's');
      await sleep(wait * 1000);
      continue;
    }
    if (!res.ok) throw new Error(theme + ': HTTP ' + res.status + ' — ' + (await res.text()).slice(0, 200));
    const json = await res.json();
    if (!json.elements) throw new Error(theme + ': no elements in response');
    return json.elements;
  }
  throw new Error(theme + ': still rate-limited after 4 attempts');
}

async function fetchAll() {
  const out = [];
  for (const [theme, parts] of Object.entries(THEMES)) {
    process.stdout.write('  ' + theme + ' ... ');
    const els = await overpass(theme, parts);
    for (const e of els) {
      const lat = e.lat ?? (e.center && e.center.lat);
      const lon = e.lon ?? (e.center && e.center.lon);
      const name = e.tags && (e.tags['name:he'] || e.tags.name);
      if (lat == null || lon == null || !name) continue;
      out.push({ name, lat, lon, theme, alt: (e.tags['alt_name'] || '') });
    }
    console.log(els.length + ' features');
    await sleep(2000);                                // be a good neighbour
  }
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
