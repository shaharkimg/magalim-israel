#!/usr/bin/env node
// Switching screens must land on each screen's initial state: no sub-tab left where
// the last visit left it, no stale map preview, no inherited scroll position.
// The real app cannot boot here (its CDN dependencies are blocked), so this runs the
// actual switchView() out of app.js against a DOM stub and watches what it dispatches.
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const slice = src.slice(src.indexOf('let currentView = null;'), src.indexOf('function switchBoardTab'));

const calls = [];
const scrolled = [];
globalThis.boardTab = 'leaders';
globalThis.profileListTab = 'visited';
globalThis.lbPeriod = 'week';
globalThis.keepMapFraming = false;
globalThis.leafletMap = { invalidateSize() {} };
globalThis.fitIsrael = () => calls.push('fitIsrael');
globalThis.stopLocationWatch = () => calls.push('stopLocationWatch');
globalThis.resumeLocationTracking = () => calls.push('resumeLocationTracking');
globalThis.maybeShowLocateHint = () => {};
// the map framing is deferred so it runs after invalidateSize; run timers inline here
globalThis.setTimeout = fn => fn();
globalThis.closePreview = () => calls.push('closePreview');
globalThis.switchBoardTab = t => calls.push('board:' + t);
globalThis.renderProfile = () => calls.push('renderProfile');
globalThis.renderHome = () => calls.push('renderHome');
globalThis.renderSaved = () => calls.push('renderSaved');
globalThis.renderMap = () => {};
globalThis.document = { querySelectorAll: () => [] };
globalThis.$ = id => ({
  id,
  classList: { add() {}, remove() {}, toggle() {} },
  querySelectorAll: () => [{ dataset: {}, classList: { toggle() {} }, set scrollTop(v) { scrolled.push(id); } }],
  set scrollTop(v) { scrolled.push(id); },
});

(0, eval)(slice + '; globalThis.switchView = switchView;');

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
};

console.log('\n1. leaving the map closes a stale preview');
calls.length = 0; switchView('map'); calls.length = 0; switchView('home');
check('closePreview on map -> home', calls.includes('closePreview'));
calls.length = 0; switchView('home');
check('no reset when the view did not change', !calls.includes('closePreview'), 'switchView(home) twice');

console.log('\n2. sub-tabs return to their default');
switchView('board'); globalThis.boardTab = 'achievements'; calls.length = 0;
switchView('home'); switchView('board');
check('board resets to leaders', calls.includes('board:leaders'), calls.filter(c => c.startsWith('board')).join(','));
globalThis.profileListTab = 'history';
switchView('home'); switchView('profile');
check('profile list resets to visited', globalThis.profileListTab === 'visited', globalThis.profileListTab);
globalThis.lbPeriod = 'all';
switchView('home'); switchView('board');
check('leaderboard period resets to the week', globalThis.lbPeriod === 'week', globalThis.lbPeriod);

console.log('\n3. an explicit tab request still wins');
switchView('home'); calls.length = 0; switchView('feed');
check('#/feed still lands on the feed tab', calls.includes('board:feed'), calls.filter(c => c.startsWith('board')).join(','));

console.log('\n4. scroll returns to the top of the new view');
switchView('home'); scrolled.length = 0; switchView('saved');
check('scrolled the target view to top', scrolled.includes('view-saved'), scrolled.join(','));
scrolled.length = 0; switchView('saved');
check('no scroll reset when re-entering the same view', scrolled.length === 0);

console.log('\n5. the map reopens framed on the whole country');
switchView('home'); calls.length = 0; switchView('map');
check('entering the map resets the zoom', calls.includes('fitIsrael'), calls.join(','));
calls.length = 0; switchView('map');
check('no refit when already on the map', !calls.includes('fitIsrael'));
switchView('home'); globalThis.keepMapFraming = true; calls.length = 0; switchView('map');
check('a caller bringing its own framing (a challenge) wins', !calls.includes('fitIsrael'));
check('the flag is consumed after one use', globalThis.keepMapFraming === false);
switchView('home'); calls.length = 0; switchView('map');
check('the next entry resets as usual', calls.includes('fitIsrael'));

console.log('\n6. the GPS follows the map screen');
switchView('home'); calls.length = 0; switchView('map');
check('entering the map resumes tracking', calls.includes('resumeLocationTracking'));
calls.length = 0; switchView('home');
check('leaving the map releases the GPS', calls.includes('stopLocationWatch'));
switchView('map'); calls.length = 0; switchView('home', { keepState: true });
check('keepState does not keep the GPS running', calls.includes('stopLocationWatch'));

console.log('\n7. keepState opts out');
switchView('board'); globalThis.boardTab = 'achievements'; calls.length = 0;
switchView('home'); switchView('board', { keepState: true });
check('keepState preserves the sub-tab', calls.includes('board:achievements'), calls.filter(c => c.startsWith('board')).join(','));

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
