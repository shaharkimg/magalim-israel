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
  'renderHome', 'renderMap', 'renderProfile', 'renderBoard',
  'renderFeed', 'renderGroupPanel', 'renderFriendsTravelBanner', 'refreshHeader',
  'renderCollections', 'renderPersonalChallenges', 'renderRegionProgress',
  'recommendDestination', 'scoreLandmarkFor', 'travelProfile', 'recommendationSeed',
  'pointsForLandmark', 'effortClassFor', 'placeCardHtml', 'emptyStateHtml', 'uiIcon',
  'monthlyChallenge', 'weekendIdeas', 'nextGoalCardHtml', 'landmarkPhotoStyle',
  'goToDestination', 'openDetail', 'openTodaySheet', 'openSheet', 'closeSheet',
  'locateUser', 'geoErrorMessage', 'syncMapControlsOffset', 'fitIsrael',
  'renderUserLocation', 'restoreLastLoc', 'saveLastLoc',
  'startLocationWatch', 'stopLocationWatch', 'handleLocateTap', 'setLiveTracking', 'resumeLocationTracking',
  'recenterOnUser', 'isFreshFix',
  'setLocateBtnState', 'maybeShowLocateHint', 'dismissLocateHint',
  'geoDiagnostics', 'runLocationTest', 'deniedHelpHtml', 'osBlockHelpHtml', 'renderLocationPermStatus',
  'explainGeoFailure', 'geoBlockScope', 'openSettingsAtLocation',
  'readAuthRedirectError', 'showAuthRedirectError',
  'startManualLocationPick', 'cancelManualLocationPick', 'setManualLocation', 'clearManualLocation',
  'fetchApproxLocation', 'useApproxLocation', 'openInPlainBrowser',
];

const defined = new Set();
for (const m of app.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
for (const m of app.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g)) defined.add(m[1]);

const missing = CRITICAL.filter(fn => !defined.has(fn));

// Also catch the reverse of the same mistake: a renderer defined but no longer
// reachable from anywhere (dead after a refactor).
// Count every mention of the name, not just `name(` — plenty of these are wired as
// bare handler references (`btn.onclick = runLocationTest;`), which a call-shaped
// search reports as dead. A false alarm here is worse than no check: it trains you
// to ignore the output.
const unreferenced = CRITICAL.filter(fn => {
  if (missing.includes(fn)) return false;
  const mentions = (app.match(new RegExp('\\b' + fn + '\\b', 'g')) || []).length;
  return mentions <= 1; // only its own definition
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
