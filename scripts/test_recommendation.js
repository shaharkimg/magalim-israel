// Runs the real recommendation engine out of app.js against stub data.
// Stubs are attached to globalThis so reassignment from the test is visible
// to the engine (the previous harness used eval-scoped `let`, which was not).
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname,'..','app.js'), 'utf8');
const engine = src.slice(src.indexOf('const MIN_SIGNALS_FOR_PCT'), src.indexOf('function getRecommendedDestination'));

globalThis.LANDMARKS = [
  {id:'near_water', name:'עין קרוב',  category:'water',      difficulty:'easy',   region:'north', lat:32.70, lon:35.10, hasWater:true,  familyFriendly:true,  baseVisits:9000},
  {id:'far_trek',   name:'מסלול ארוך', category:'mountains', difficulty:'extreme',region:'south', lat:31.00, lon:35.00, hasWater:false, familyFriendly:false, baseVisits:500},
  {id:'viewpoint',  name:'תצפית',      category:'viewpoints',difficulty:'easy',   region:'north', lat:32.72, lon:35.05, hasWater:false, familyFriendly:true,  baseVisits:17000},
  {id:'mid_hike',   name:'מסלול בינוני',category:'nature',   difficulty:'medium', region:'north', lat:32.75, lon:35.20, hasWater:false, familyFriendly:false, baseVisits:2000},
];
globalThis.lmById = Object.fromEntries(globalThis.LANDMARKS.map(l => [l.id, l]));
globalThis.REGIONS = { north:'צפון', south:'דרום' };
globalThis.myVisits = [];
globalThis.session = null;
globalThis.userLoc = null;
globalThis.haversine = (a,b,c,d) => Math.abs(a-c)*111 + Math.abs(b-d)*90;
globalThis.estimateDriveMinutes = km => Math.round(km*1.4);
globalThis.regionDiscoveryPct = r => {
  const all = globalThis.LANDMARKS.filter(l=>l.region===r);
  const done = all.filter(l=>globalThis.myVisits.some(v=>v.landmark_id===l.id)).length;
  return all.length ? done/all.length : 0;
};
globalThis.tierForDb = () => ({label:'קל'});

(0, eval)(engine + '; globalThis.recommendDestination = recommendDestination;');
const rec = globalThis.recommendDestination;

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
};

console.log('\n1. guest, no visits, no location (previously returned null)');
let r = rec();
check('returns a recommendation', !!r, r && r.landmark.name);
check('gives reasons', r && r.reasons.length > 0, r && r.reasons.join(' · '));

console.log('\n2. guest with location');
globalThis.userLoc = {lat:32.70, lon:35.10};
r = rec();
check('has a match %', r.matchPct !== null, r.matchPct + '%');
check('match % is not pinned to a floor', r.matchPct > 60, r.matchPct + '%');

console.log('\n3. match % actually varies between places');
const pcts = globalThis.LANDMARKS.map(l => {
  globalThis.myVisits = globalThis.LANDMARKS.filter(x => x.id !== l.id).map(x => ({landmark_id:x.id}));
  const one = rec();
  return one ? `${one.landmark.name}:${one.matchPct}` : null;
}).filter(Boolean);
globalThis.myVisits = [];
const distinct = new Set(pcts.map(p => p.split(':')[1]));
check('different places score differently', distinct.size > 1, pcts.join('  '));

console.log('\n4. stability — same user+day gives the same pick');
const picks = new Set();
for (let i=0;i<20;i++) picks.add(rec().landmark.id);
check('stable across re-renders', picks.size === 1, `${picks.size} distinct pick(s) over 20 calls`);

console.log('\n5. daily discovery is a different place from the next goal');
const goal = rec();
const daily = rec({salt:'daily', excludeId: goal.landmark.id});
check('daily differs from next goal', daily && daily.landmark.id !== goal.landmark.id,
      `goal=${goal.landmark.name} daily=${daily && daily.landmark.name}`);

console.log('\n6. history-aware — a water lover gets water reasons');
globalThis.myVisits = [{landmark_id:'near_water'}];
globalThis.session = {user:{id:'user1234'}};
r = rec();
check('adapts to history', r.reasons.some(x => x.includes('קושי') || x.includes('מים') || x.includes('אזור')),
      r.landmark.name + ' | ' + r.reasons.join(' · '));

console.log('\n7. everything visited — no fabricated recommendation');
globalThis.myVisits = globalThis.LANDMARKS.map(l => ({landmark_id:l.id}));
check('returns null', rec() === null);

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
