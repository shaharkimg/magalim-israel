#!/usr/bin/env node
// Turns data/pending_landmarks.csv into a landmarks migration, by looking each
// place up on a map rather than guessing where it is.
//
// Why a script and not a one-off paste: a wrong pin in a hiking app sends a
// person to the wrong place, sometimes in the desert. So every coordinate here
// comes from a lookup, and anything the lookup is not sure about is written to
// a review file instead of into the migration. Nothing is invented.
//
// Two providers. The default costs nothing and needs no account:
//   node scripts/geocode_pending.js --limit 5              (OpenStreetMap)
//   GOOGLE_MAPS_API_KEY=... node scripts/geocode_pending.js --provider google
// Google is better at messy Hebrew names but needs a billing account. OSM is
// free, and for named nature sites - springs, streams, reserves - it is good,
// because that data comes from the same volunteers who map the trails.
//
// Run the trial first: --limit 5 prints what it found so you can eyeball the
// pins in Google Maps before committing 300 of them.
//
// Rejected, never silently accepted:
//   - a result outside Israel's bounding box
//   - a result that only resolved to a city, region or country, which is what a
//     geocoder returns when it failed to find the place and fell back
//   - a place within 150m of a landmark already on the map, which is almost
//     always the same site under a different name. Names cannot settle this:
//     "עין חוד" and "עין הוד" are different places, while "שמורת תל דן" and
//     "שמורת טבע תל דן" are one.
const fs = require('fs');
const path = require('path');

const argv = process.argv;
const argOf = (flag, dflt) => { const i = argv.indexOf(flag); return i > -1 ? argv[i + 1] : dflt; };
const PROVIDER = argOf('--provider', 'osm');
const LIMIT = Number(argOf('--limit', Infinity));
const KEY = process.env.GOOGLE_MAPS_API_KEY;

if (PROVIDER === 'google' && !KEY) {
  console.error('--provider google needs GOOGLE_MAPS_API_KEY (and a Google billing account).\n' +
    'Or drop the flag and use OpenStreetMap, which is free and needs no account.');
  process.exit(1);
}

const root = path.join(__dirname, '..');
// Israel, generously bounded. A hit outside this is a lookup that went abroad.
const BBOX = { minLat: 29.4, maxLat: 33.4, minLon: 34.2, maxLon: 35.95 };

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

// Every landmark already on the map, so a new one can be checked against them.
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
  // Hebrew does not transliterate cleanly, and a guessed romanisation reads
  // worse than an honest hash. Only the name is ever shown to the user.
  const base = 'lm-' + require('crypto').createHash('sha1').update(name).digest('hex').slice(0, 8);
  let id = base, n = 2;
  while (taken.has(id)) id = base + '-' + n++;
  taken.add(id);
  return id;
}

const sqlStr = s => "'" + String(s).replace(/'/g, "''") + "'";

// Each provider returns { lat, lon, label, coarse } or null, so the checks below
// do not care which one ran.
const GOOGLE_COARSE = new Set(['country', 'administrative_area_level_1',
  'administrative_area_level_2', 'political', 'locality']);
// Nominatim's place_rank: the lower the number the coarser the thing. A country
// is 4, a city 16. Anything at or under 13 is an area, not a place you visit.
const OSM_COARSE_TYPES = new Set(['country', 'state', 'region', 'county', 'province']);

async function lookup(query) {
  if (PROVIDER === 'google') {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json' +
      '?address=' + encodeURIComponent(query) + '&region=il&language=he' +
      '&bounds=' + BBOX.minLat + ',' + BBOX.minLon + '|' + BBOX.maxLat + ',' + BBOX.maxLon +
      '&key=' + KEY;
    const r = await (await fetch(url)).json();
    if (r.status === 'OVER_QUERY_LIMIT' || r.status === 'REQUEST_DENIED') {
      throw Object.assign(new Error(r.status + ' — ' + (r.error_message || '')), { fatal: true });
    }
    const hit = (r.results || [])[0];
    if (!hit) return null;
    return {
      lat: hit.geometry.location.lat, lon: hit.geometry.location.lng,
      label: hit.formatted_address,
      coarse: hit.geometry.location_type === 'APPROXIMATE' &&
        hit.types.some(t => GOOGLE_COARSE.has(t)) ? hit.types.join('/') : null,
    };
  }
  const url = 'https://nominatim.openstreetmap.org/search' +
    '?q=' + encodeURIComponent(query) + '&countrycodes=il&format=jsonv2&limit=1';
  // Nominatim's usage policy requires an identifying User-Agent and at most one
  // request per second. Both are honoured here; do not remove them.
  const res = await fetch(url, { headers: { 'User-Agent': 'magalim-israel/1.0 (landmark seeding, one-off)' } });
  if (res.status === 403 || res.status === 429) {
    throw Object.assign(new Error('Nominatim refused (HTTP ' + res.status + ') — slow down or try again later'), { fatal: true });
  }
  const arr = await res.json();
  const hit = Array.isArray(arr) ? arr[0] : null;
  if (!hit) return null;
  if (hit.lat === undefined || hit.lon === undefined) {
    throw Object.assign(new Error('unexpected response shape: ' + JSON.stringify(hit).slice(0, 200)), { fatal: true });
  }
  const kind = hit.addresstype || hit.type || '';
  return {
    lat: +hit.lat, lon: +hit.lon, label: hit.display_name || hit.name || '',
    matchedName: hit.name || '',
    coarse: (OSM_COARSE_TYPES.has(kind) || Number(hit.place_rank) <= 13) ? (kind || 'rank ' + hit.place_rank) : null,
  };
}

// The bounding box is far too loose to catch a wrong hit: the trial run put
// "בית צידה", a Sea of Galilee site, next to רמת הנדיב on the Carmel - 65km off,
// still inside Israel, and inside its declared region too, since both are
// "north". The one signal left is whether the thing the geocoder actually found
// is called anything like what we asked for.
const NOISE = new Set(['גן', 'לאומי', 'שמורת', 'שמורה', 'טבע', 'נחל', 'הר', 'עין',
  'דרך', 'נוף', 'אתר', 'פארק', 'יער', 'מסלול', 'ישראל', 'של', 'ב', 'ה']);
function nameMismatch(query, matched) {
  if (!matched) return null;                 // nothing to compare against
  const words = s => new Set(String(s)
    .replace(/[(),.\-–—"'״׳]/g, ' ').split(/\s+/)
    .filter(w => w.length >= 3 && !NOISE.has(w)));
  const want = words(query), got = words(matched);
  if (!want.size) return null;               // the name was all common words
  for (const w of want) {
    for (const g of got) {
      // a shared prefix, because Hebrew inflects the ending: the same site is
      // "דרך הטמפלרים" in one source and "המושבה הטמפלרית" in another
      if (w === g) return null;
      if (w.length >= 5 && g.length >= 5 && w.slice(0, 4) === g.slice(0, 4)) return null;
    }
  }
  return matched;
}

(async () => {
  const pending = parseCsv(fs.readFileSync(path.join(root, 'data/pending_landmarks.csv'), 'utf8'));
  const known = existingLandmarks();
  const total = Math.min(pending.length, LIMIT);
  console.log('provider: ' + PROVIDER + (PROVIDER === 'osm' ? ' (free, no account)' : ' (billed)'));
  console.log('pending: ' + pending.length + ' | already on the map: ' + known.length);
  if (PROVIDER === 'osm') console.log('one request per second, so this takes about ' + Math.ceil(total / 60) + ' min\n');

  const accepted = [], review = [];
  const taken = new Set(known.map(k => k.id));
  let done = 0;

  for (const p of pending) {
    if (done >= LIMIT) break;
    done++;
    let hit;
    try { hit = await lookup(p.search_query + ', ישראל'); }
    catch (e) {
      if (e.fatal) { console.error('\nstopped: ' + e.message); break; }
      review.push({ ...p, why: 'request failed: ' + e.message }); continue;
    }
    if (!hit) { review.push({ ...p, why: 'no result' }); }
    else if (hit.lat < BBOX.minLat || hit.lat > BBOX.maxLat || hit.lon < BBOX.minLon || hit.lon > BBOX.maxLon) {
      review.push({ ...p, why: 'landed outside Israel', lat: hit.lat, lon: hit.lon });
    } else if (hit.coarse) {
      review.push({ ...p, why: 'only resolved to an area (' + hit.coarse + ')', lat: hit.lat, lon: hit.lon });
    } else if (nameMismatch(p.name, hit.matchedName)) {
      review.push({ ...p, why: 'found something called "' + hit.matchedName + '" instead', lat: hit.lat, lon: hit.lon });
    } else {
      const near = known.find(k => metresBetween(k, hit) < 150);
      if (near) {
        review.push({ ...p, why: 'within 150m of "' + near.name + '" — likely the same place', lat: hit.lat, lon: hit.lon });
      } else {
        const id = slug(p.name, taken);
        accepted.push({ ...p, id, lat: hit.lat, lon: hit.lon, label: hit.label });
        known.push({ id, name: p.name, lat: hit.lat, lon: hit.lon });  // later rows dedup against it too
      }
    }
    if (LIMIT <= 20) {
      const last = accepted[accepted.length - 1];
      const ok = last && last.name === p.name;
      console.log('  ' + (ok ? 'OK  ' : 'SKIP') + '  ' + p.name +
        (ok ? '  -> ' + last.lat.toFixed(5) + ', ' + last.lon.toFixed(5) +
          '   https://www.google.com/maps?q=' + last.lat + ',' + last.lon
          : '  (' + review[review.length - 1].why + ')'));
    } else {
      process.stdout.write('\r  ' + done + '/' + total + '  accepted ' + accepted.length + '  to review ' + review.length + '   ');
    }
    if (PROVIDER === 'osm') await new Promise(r => setTimeout(r, 1100));
    else await new Promise(r => setTimeout(r, 60));
  }
  console.log('\n');

  if (accepted.length) {
    const sql = [
      '-- Generated by scripts/geocode_pending.js from data/pending_landmarks.csv.',
      '-- Every coordinate is a real lookup, bounds-checked to Israel and',
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
    fs.writeFileSync(path.join(root, 'supabase/migrations_new_landmarks_from_list.sql'), sql);
    console.log('wrote supabase/migrations_new_landmarks_from_list.sql — ' + accepted.length + ' places');

    // The checks narrow the field, they do not make the result trustworthy - a
    // wrong hit can pass all of them. So every accepted place gets a map link,
    // and this file is meant to be scanned before the migration is run.
    fs.writeFileSync(path.join(root, 'data/geocode_accepted.csv'),
      'name,what_was_found,map_link\n' +
      accepted.map(a => [a.name, a.label, 'https://www.google.com/maps?q=' + a.lat + ',' + a.lon]
        .map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n') + '\n');
    console.log('wrote data/geocode_accepted.csv — check these before running the migration');
  }
  fs.writeFileSync(path.join(root, 'data/geocode_review.csv'),
    'name,region_raw,type_raw,why,lat,lon\n' +
    review.map(r => [r.name, r.region_raw, r.type_raw, r.why, r.lat || '', r.lon || '']
      .map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n') + '\n');
  console.log('wrote data/geocode_review.csv — ' + review.length + ' need a human eye');
})();
