// The server (checkin_landmark in supabase/migrations_hardening_1_rpcs.sql) now decides check-in
// points. The client still *displays* points using its own copy of the formulas, so the two must
// never drift apart. This runs the real client functions from app.js and the real SQL functions on
// the same inputs and compares them.
//
// Needs a Postgres with the migrations applied (supabase/tests/run.sh leaves one behind):
//   PGHOST=/tmp/pgsock PGPORT=54329 PGUSER=pgtest TEST_DB=magalim_test node scripts/test_xp_parity.js
// Without PGHOST it skips, so it never breaks a plain `node` run.
process.env.TZ = 'Asia/Jerusalem';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

if (!process.env.PGHOST && !process.env.DATABASE_URL) {
  console.log('SKIP  test_xp_parity: no PGHOST/DATABASE_URL (run supabase/tests/run.sh first)');
  process.exit(0);
}
const DB = process.env.TEST_DB || 'magalim_test';
const psql = (sql) => execFileSync('psql', ['-q', '-At', '-F', '|', '-d', DB, '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const slice = (from, to) => src.slice(src.indexOf(from), src.indexOf(to));
// estimateHours lives further down in app.js
const code = [
  slice('const EFFORT_TIERS', 'function tierForDb'),
  'function estimateHours(l){ return l.distanceKm ? l.distanceKm/3.2 : 1.5; }',
  slice('const WEEKLY_CHALLENGE_XP', 'function challengeVisitsThisWeek'),
].join('\n');

const RealDate = Date;
let fakeNow = RealDate.now();
globalThis.Date = class extends RealDate {
  constructor(...a) { if (a.length === 0) super(fakeNow); else super(...a); }
  static now() { return fakeNow; }
};
(0, eval)(code + ';globalThis.__p = { pointsForLandmark, currentWeekKey, currentWeeklyChallenge, WEEKLY_CHALLENGES };');
const { pointsForLandmark, currentWeekKey, currentWeeklyChallenge } = globalThis.__p;

let failures = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' - ' + detail : ''}`); if (!ok) failures++; };

// ---- points ----
const cats = ['water', 'archaeology', 'heritage', 'viewpoints', 'religious', 'urban', 'mountains', 'nature', 'parks', 'reserves'];
const diffs = ['easy', 'medium', 'hard', 'extreme', 'weird'];
const kms = [0, 0.4, 1.5, 1.6, 3, 8, 20];
const hours = [null, 0.5, 1.5, 2.4, 2.5, 4.4, 4.5, 7];
const rows = [];
let i = 0;
for (const c of cats) for (const d of diffs) for (const km of kms) for (const h of hours) rows.push({ id: 'r' + (i++), c, d, km, h });
const values = rows.map(r => `('${r.id}','${r.c}','${r.d}',${r.km},${r.h === null ? 'null' : r.h})`).join(',');
const out = psql(`
create temp table pl as select * from public.landmarks where false;
insert into pl (id, category, difficulty, distance_km, duration_hours) values ${values};
select id || '|' || public.points_for_landmark(row(pl.*)::public.landmarks) from pl;
`);
const sqlPts = Object.fromEntries(out.trim().split('\n').map(l => l.split('|')));
let bad = 0, firstBad = null;
for (const r of rows) {
  const js = pointsForLandmark({ category: r.c, difficulty: r.d, distanceKm: r.km, durationHours: r.h });
  if (String(js) !== sqlPts[r.id]) { bad++; firstBad = firstBad || `${JSON.stringify(r)} js=${js} sql=${sqlPts[r.id]}`; }
}
check(`points formula identical on ${rows.length} combinations`, bad === 0, firstBad || '');

// ---- weekly challenge + week key, across a year and a half, at awkward local hours ----
const stamps = [];
const start = RealDate.UTC(2025, 0, 1);
for (let d = 0; d < 560; d += 1) for (const h of [0.2, 11.9, 21.9, 23.9]) stamps.push(start + d * 86400000 + h * 3600000);
const wsql = psql(`select w.week_key || ',' || w.challenge_id from unnest(array[${stamps.join(',')}]::bigint[]) with ordinality as t(ms, n), lateral public.weekly_challenge_info(to_timestamp(t.ms / 1000.0)) w order by t.n;`).trim().split('\n');
let wbad = 0, wfirst = null;
stamps.forEach((t, idx) => {
  fakeNow = t;
  const js = currentWeekKey() + ',' + currentWeeklyChallenge().id;
  if (js !== wsql[idx]) { wbad++; wfirst = wfirst || `${new RealDate(t).toISOString()} js=${js} sql=${wsql[idx]}`; }
});
check(`weekly challenge + week key identical on ${stamps.length} timestamps`, wbad === 0, wfirst || '');

process.exit(failures ? 1 : 0);
