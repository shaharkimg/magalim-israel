#!/usr/bin/env node
// Guards against a specific, real failure mode in this single-file app:
// a refactor removing a function while leaving its call sites in place.
// That happened once - a slice-and-replace edit swallowed renderHome() while
// three callers kept calling it. `node --check` passes (the syntax is fine) and
// the app only breaks at runtime, on boot.
//
// Deliberately narrow: it checks that the functions the app dispatches to on
// boot, view switches and data refreshes actually exist. A broad "every called
// identifier" scan was tried first and produced enough false positives (names
// inside template literals, CSS strings, dynamically built ids) that it would
// have been ignored - which is worse than no check.
//
// Run: node scripts/check_wiring.js
const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// Entry points: view dispatch, the two post-data-load refresh paths, and the
// renderers each screen depends on. If you add a view, add its renderer here.
const CRITICAL = [
  'switchView', 'applyRoute', 'navigate',
  'renderHome', 'renderMap', 'renderSaved', 'renderProfile', 'renderBoard',
  'renderFeed', 'renderGroupPanel', 'renderFriendsTravelBanner', 'refreshHeader',
  'renderCollections', 'renderPersonalChallenges', 'renderRegionProgress',
  'recommendDestination', 'scoreLandmarkFor', 'travelProfile', 'recommendationSeed',
  'pointsForLandmark', 'effortClassFor', 'placeCardHtml', 'emptyStateHtml', 'uiIcon',
  'monthlyChallenge', 'weekendIdeas', 'nextGoalCardHtml', 'landmarkPhotoStyle',
  'goToDestination', 'openDetail', 'openTodaySheet', 'openSheet', 'closeSheet',
  'locateUser', 'geoErrorMessage', 'syncMapControlsOffset', 'fitIsrael',
];

const defined = new Set();
for (const m of app.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
for (const m of app.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g)) defined.add(m[1]);

const missing = CRITICAL.filter(fn => !defined.has(fn));

// Also catch the reverse of the same mistake: a renderer defined but no longer
// reachable from anywhere (dead after a refactor).
const unreferenced = CRITICAL.filter(fn => {
  if (missing.includes(fn)) return false;
  const calls = app.split(fn + '(').length - 1;
  return calls <= 1; // only its own definition
});

if (missing.length) {
  console.log('Called on a critical path but NOT DEFINED:');
  missing.forEach(fn => console.log('  - ' + fn + '()'));
}
if (unreferenced.length) {
  console.log('Defined but never called (dead after a refactor?):');
  unreferenced.forEach(fn => console.log('  - ' + fn + '()'));
}
const failed = missing.length > 0;
console.log(failed ? '\nwiring check FAILED\n' : `wiring check passed (${CRITICAL.length} critical functions)`);
process.exit(failed ? 1 : 0);
