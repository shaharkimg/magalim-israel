#!/usr/bin/env node
// Exports every landmark on the site to CSV and JSON, by reading it back out of
// the same migration files that put it there - there is no live DB connection
// from this environment, so the SQL on disk is the closest thing to a source
// of truth this script can reach.
//
// Why a real tokenizer and not a line regex: landmark descriptions contain
// commas, parentheses and escaped quotes ('עוג''ה'), and some rows wrap across
// lines. A regex per line silently misparses those; a small character-by-
// character tuple scanner does not.
//
// Column order is identical across every migration in this repo (verified:
// every `insert into public.landmarks` states the same 19 columns in the same
// order), so it is fixed here rather than re-read from each file's own column
// list - that would be more "correct" but is not needed and adds a failure mode
// (a file with a differently-ordered but equally valid list would silently
// mismap).
//
// Row order across files matters once: `on conflict (id) do nothing` means the
// first insert of a given id wins, so files are processed in the order git
// added them (oldest first) and a later duplicate id is dropped, matching what
// actually happens when these migrations run against Supabase in sequence.
//
// Run: node scripts/export_landmarks.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const sqlDir = path.join(root, 'supabase');

const COLUMNS = ['id', 'name', 'description', 'category', 'difficulty', 'region',
  'lat', 'lon', 'duration', 'distance_km', 'base_visits', 'family_friendly',
  'dog_friendly', 'accessible', 'has_water', 'price_type', 'season',
  'duration_hours', 'official_url'];

// schema.sql's own defaults, applied to a column a given INSERT leaves out.
// Two files in this repo (schema.sql's seed rows and migrations_add_tiuli.sql,
// 234 rows) list only the first 11 columns and rely on these; a fixed 19-column
// assumption would have silently misread every field after base_visits in
// both. NOT NULL columns with no default (id..distance_km) are never left out
// by any file here, so they need no entry.
const DEFAULTS = {
  base_visits: 0, family_friendly: false, dog_friendly: false, accessible: false,
  has_water: false, price_type: 'free', season: null, duration_hours: null,
  official_url: null,
};

// Splits "insert into public.landmarks (...) values (...), (...), (...) on
// conflict ... ;" into its individual (...) tuples, respecting single-quoted
// strings (with '' as an escaped quote) and nested parentheses so a comma or a
// paren inside a description does not end the tuple early.
function splitTuples(valuesBlock) {
  const tuples = [];
  let depth = 0, inString = false, cur = '';
  for (let i = 0; i < valuesBlock.length; i++) {
    const c = valuesBlock[i];
    if (inString) {
      cur += c;
      if (c === "'") {
        if (valuesBlock[i + 1] === "'") { cur += valuesBlock[++i]; }  // escaped ''
        else inString = false;
      }
      continue;
    }
    if (c === "'") { inString = true; cur += c; continue; }
    if (c === '(') { depth++; if (depth === 1) { cur = ''; continue; } }
    if (c === ')') {
      depth--;
      if (depth === 0) { tuples.push(cur); continue; }
    }
    if (depth > 0) cur += c;
  }
  return tuples;
}

// Splits one tuple's field list on top-level commas (not inside a string).
function splitFields(tuple) {
  const fields = [];
  let inString = false, cur = '';
  for (let i = 0; i < tuple.length; i++) {
    const c = tuple[i];
    if (inString) {
      cur += c;
      if (c === "'") {
        if (tuple[i + 1] === "'") { cur += tuple[++i]; }
        else inString = false;
      }
      continue;
    }
    if (c === "'") { inString = true; cur += c; continue; }
    if (c === ',') { fields.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) fields.push(cur.trim());
  return fields;
}

function parseValue(raw) {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  const n = Number(raw);
  return Number.isNaN(n) ? raw : n;
}

function extractFromFile(sql) {
  const rows = [];
  // The column list is captured per-statement rather than assumed, since two
  // files declare only 11 of the 19 columns. The values block ends at either
  // "on conflict" or a bare ";" - migrations_add_tiuli.sql and schema.sql use
  // the latter.
  const re = /insert into public\.landmarks\s*\(([^)]*)\)\s*values\s*([\s\S]*?)(?:\s*on conflict[^;]*;|;)/gi;
  let m;
  while ((m = re.exec(sql))) {
    const cols = m[1].split(',').map(c => c.trim());
    for (const tuple of splitTuples(m[2])) {
      const fields = splitFields(tuple).map(parseValue);
      if (fields.length !== cols.length) {
        throw new Error('column list has ' + cols.length + ' names but tuple has ' +
          fields.length + ' fields: ' + tuple.slice(0, 80));
      }
      const row = Object.fromEntries(COLUMNS.map(c => [c, DEFAULTS.hasOwnProperty(c) ? DEFAULTS[c] : undefined]));
      cols.forEach((c, i) => { row[c] = fields[i]; });
      const missing = COLUMNS.filter(c => row[c] === undefined);
      if (missing.length) {
        throw new Error('row for ' + JSON.stringify(fields[0]) + ' is missing required column(s): ' +
          missing.join(', '));
      }
      rows.push(row);
    }
  }
  return rows;
}

// Oldest-added-first, so a later file's duplicate id is the one dropped below -
// matching `on conflict (id) do nothing` against migrations applied in order.
function filesInGitAddOrder() {
  const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql'));
  const dated = files.map(f => {
    let addedAt;
    try {
      addedAt = execSync('git log --diff-filter=A --format=%at --follow -- ' +
        JSON.stringify(path.join('supabase', f)), { cwd: root, encoding: 'utf8' })
        .trim().split('\n').pop();
    } catch { addedAt = ''; }
    return { f, t: Number(addedAt) || Infinity };
  });
  dated.sort((a, b) => a.t - b.t);
  return dated.map(d => d.f);
}

const byId = new Map();
let filesRead = 0, tuplesSeen = 0, droppedAsDuplicate = 0;
for (const f of filesInGitAddOrder()) {
  const sql = fs.readFileSync(path.join(sqlDir, f), 'utf8');
  if (!/insert into public\.landmarks/i.test(sql)) continue;
  filesRead++;
  let rows;
  try { rows = extractFromFile(sql); }
  catch (e) { throw new Error('in ' + f + ': ' + e.message); }
  for (const r of rows) {
    tuplesSeen++;
    if (byId.has(r.id)) droppedAsDuplicate++;
    else byId.set(r.id, r);
  }
}

const landmarks = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'he'));
console.log('files with landmark inserts : ' + filesRead);
console.log('tuples parsed                : ' + tuplesSeen);
console.log('dropped as duplicate id       : ' + droppedAsDuplicate);
console.log('unique landmarks              : ' + landmarks.length);

// sanity: every row must satisfy the schema's NOT NULL columns, or this export
// does not actually describe what Supabase would accept
const NOT_NULL = ['id', 'name', 'description', 'category', 'difficulty', 'region',
  'lat', 'lon', 'duration', 'distance_km'];
const bad = landmarks.filter(l => NOT_NULL.some(c => l[c] === null || l[c] === undefined));
if (bad.length) {
  console.log('\nWARNING: ' + bad.length + ' rows have a null in a NOT NULL column:');
  for (const b of bad.slice(0, 5)) console.log('  ' + b.id + ' (' + b.name + ')');
}

fs.mkdirSync(path.join(root, 'data'), { recursive: true });

fs.writeFileSync(path.join(root, 'data/landmarks.json'), JSON.stringify(landmarks, null, 2) + '\n');

const csvEscape = v => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = [COLUMNS.join(',')]
  .concat(landmarks.map(l => COLUMNS.map(c => csvEscape(l[c])).join(',')))
  .join('\n') + '\n';
fs.writeFileSync(path.join(root, 'data/landmarks.csv'), csv);

console.log('\nwrote data/landmarks.json (' + landmarks.length + ' records)');
console.log('wrote data/landmarks.csv  (' + landmarks.length + ' rows)');
