#!/usr/bin/env node
// Shared OpenStreetMap helpers: download every named place of interest in Israel
// from Overpass (springs, viewpoints, ruins, reserves, forests, peaks...) and match
// Hebrew names that are spelled differently between sources. Used by
// match_osm.js (placing new landmarks) and audit_locations.js (checking existing ones).
'use strict';
const fs = require('fs');
const path = require('path');

const BBOX = '29.4,34.2,33.4,35.95';                 // south,west,north,east

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
        // the query asks the server for at most 90 s; a connection that is still silent
        // well after that is stuck, and waiting on it would hold up every later query
        signal: AbortSignal.timeout(150000),
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

async function fetchAll(extraSelectors = []) {
  const out = [];
  const failed = [];
  const all = [...SELECTORS, ...extraSelectors];
  const started = Date.now();
  for (const [theme, selector] of all) {
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
      console.log(kept + ' named  (' + Math.round((Date.now() - started) / 1000) + 's)');
    } catch (e) {
      // One tag failing is not worth losing the other seventeen over.
      console.log('FAILED — ' + e.message);
      failed.push(label + ' (' + e.message + ')');
    }
    await sleep(2000);                                // be a good neighbour
  }
  if (failed.length) {
    console.log('\n  ' + failed.length + ' of ' + all.length + ' queries failed:');
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


// Downloads once and caches; pass useCache to reuse the file from a previous run.
async function loadPlaces(cacheFile, useCache, extraSelectors = []) {
  if (useCache && fs.existsSync(cacheFile)) {
    const places = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    console.log('using cached OSM data: ' + places.length + ' named features\n');
    return places;
  }
  console.log('downloading named map features in Israel from Overpass:');
  const places = await fetchAll(extraSelectors);
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(places));
  console.log('\n' + places.length + ' named features total\n');
  return places;
}

module.exports = { SELECTORS, overpass, fetchAll, loadPlaces, norm, keyWords, metresBetween, NOISE };
