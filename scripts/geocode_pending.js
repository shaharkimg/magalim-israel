#!/usr/bin/env node
// Turns data/pending_landmarks.csv into a landmarks migration, by looking each
// place up in Google Maps rather than guessing where it is.
//
// Why a script and not a one-off paste: a wrong pin in a hiking app sends a
// person to the wrong place, sometimes in the desert. So every coordinate here
// comes from a lookup, and anything the lookup is not sure about is written to
// a review file instead of into the migration. Nothing is invented.
//
// Rejected, never silently accepted:
//   - a result outside Israel's bounding box
//   - a result Google itself calls approximate at city scale or wider, which is
//     what you get when it failed to find the place and fell back to the area
//   - a place that lands within 150m of a landmark already in the map, which is
//     almost always the same site under a different name. Names cannot settle
//     this: "עין חוד" and "עין הוד" are different places, "שמורת תל דן" and
//     "שמורת טבע תל דן" are one.
//
// Usage:
//   GOOGLE_MAPS_API_KEY=... node scripts/geocode_pending.js
//   GOOGLE_MAPS_API_KEY=... node scripts/geocode_pending.js --limit 10   (a trial run)
//
// Get a key at console.cloud.google.com -> APIs -> Geocoding API. The free tier
// covers a run of this size many times over.
const fs = require('fs');
const path = require('path');

const KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!KEY) {
  console.error('GOOGLE_MAPS_API_KEY is not set.\n' +
    'Get one at console.cloud.google.com -> APIs & Services -> Geocoding API, then:\n' +
    '  GOOGLE_MAPS_API_KEY=your-key node scripts/geocode_pending.js');
  process.exit(1);
}
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const root = path.join(__dirname, '..');
// Israel, generously bounded. A hit outside this is a lookup that went abroad.
const BBOX = { minLat: 29.4, maxLat: 33.4, minLon: 34.2, maxLon: 35.95 };
const TOO_COARSE = new Set(['country', 'administrative_area_level_1',
  'administrative_area_level_2', 'political', 'locality']);

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

// Every landmark already in the map, so a new one can be checked against them.
function existingLandmarks() {
  const out = [];
  for (const f of fs.readdirSync(path.join(root, 'supabase'))) {
    if (!f.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(root, 'supabase', f), 'utf8');
    const re = /\(\s*'([a-z0-9][a-z0-9-]*)',\s*'((?:[^']|'')+)',[\s\S]{0,600}?,\s*(-?\d+\.\d+),\s*(-?\d+\.\d+),/g;
    let m;
    while ((m = re.exec(sql))) {
      out.push({ id: m[1], name: m[2].replace(/''/g, "'"), lat: +m[3], lon: +m[4] });
    }
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

function slug(name, taken) {
  // Hebrew does not transliterate cleanly, and a guessed romanisation reads worse
  // than an honest sequential id. Only the name is shown to the user anyway.
  let base = 'lm-' + require('crypto').createHash('sha1').update(name).digest('hex').slice(0, 8);
  let id = base, n = 2;
  while (taken.has(id)) id = base + '-' + n++;
  taken.add(id);
  return id;
}

const sqlStr = s => "'" + String(s).replace(/'/g, "''") + "'";

async function geocode(query) {
  const url = 'https://maps.googleapis.com/maps/api/geocode/json' +
    '?address=' + encodeURIComponent(query) +
    '&region=il&language=he' +
    '&bounds=' + BBOX.minLat + ',' + BBOX.minLon + '|' + BBOX.maxLat + ',' + BBOX.maxLon +
    '&key=' + KEY;
  const res = await fetch(url);
  return res.json();
}

(async () => {
  const pending = parseCsv(fs.readFileSync(path.join(root, 'data/pending_landmarks.csv'), 'utf8'));
  const known = existingLandmarks();
  console.log('pending: ' + pending.length + ' | already on the map: ' + known.length + '\n');

  const accepted = [], review = [];
  const taken = new Set(known.map(k => k.id));
  let done = 0;

  for (const p of pending) {
    if (done >= LIMIT) break;
    done++;
    let r;
    try { r = await geocode(p.search_query + ', ישראל'); }
    catch (e) { review.push({ ...p, why: 'request failed: ' + e.message }); continue; }

    if (r.status === 'OVER_QUERY_LIMIT' || r.status === 'REQUEST_DENIED') {
      console.error('\nstopped: Google said ' + r.status + ' — ' + (r.error_message || ''));
      break;
    }
    const hit = (r.results || [])[0];
    if (!hit) { review.push({ ...p, why: 'no result (' + r.status + ')' }); continue; }

    const lat = hit.geometry.location.lat, lon = hit.geometry.location.lng;
    if (lat < BBOX.minLat || lat > BBOX.maxLat || lon < BBOX.minLon || lon > BBOX.maxLon) {
      review.push({ ...p, why: 'landed outside Israel', lat, lon }); continue;
    }
    if (hit.geometry.location_type === 'APPROXIMATE' && hit.types.some(t => TOO_COARSE.has(t))) {
      review.push({ ...p, why: 'only resolved to an area (' + hit.types.join('/') + ')', lat, lon });
      continue;
    }
    const near = known.find(k => metresBetween(k, { lat, lon }) < 150);
    if (near) {
      review.push({ ...p, why: 'within 150m of "' + near.name + '" — likely the same place', lat, lon });
      continue;
    }
    const id = slug(p.name, taken);
    accepted.push({ ...p, id, lat, lon, formatted: hit.formatted_address });
    known.push({ id, name: p.name, lat, lon });   // so later rows dedup against it too
    process.stdout.write('\r  looked up ' + done + '/' + Math.min(pending.length, LIMIT) +
      '  accepted ' + accepted.length + '  to review ' + review.length + '   ');
    await new Promise(r => setTimeout(r, 60));    // stay well under the rate limit
  }
  console.log('\n');

  const sql = [
    '-- Generated by scripts/geocode_pending.js from data/pending_landmarks.csv.',
    '-- Every coordinate is a Google Maps lookup, bounds-checked to Israel and',
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
      sqlStr(a.category), sqlStr('easy'), sqlStr(a.region),
      a.lat, a.lon, 'null', 'null', 0,
      'true', 'false', 'false', a.category === 'water' ? 'true' : 'false',
      sqlStr('free'), 'null', 'null', a.source ? sqlStr(a.source) : 'null',
    ].join(', ') + ')').join(',\n'),
    'on conflict (id) do nothing;',
    '',
  ].join('\n');

  if (accepted.length) {
    fs.writeFileSync(path.join(root, 'supabase/migrations_new_landmarks_from_list.sql'), sql);
    console.log('wrote supabase/migrations_new_landmarks_from_list.sql — ' + accepted.length + ' places');
  }
  const head = 'name,region_raw,type_raw,why,lat,lon\n';
  fs.writeFileSync(path.join(root, 'data/geocode_review.csv'), head +
    review.map(r => [r.name, r.region_raw, r.type_raw, r.why, r.lat || '', r.lon || '']
      .map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n') + '\n');
  console.log('wrote data/geocode_review.csv — ' + review.length + ' need a human eye');
})();
