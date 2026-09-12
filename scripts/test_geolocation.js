#!/usr/bin/env node
// Exercises locateUser() out of app.js against a stubbed navigator.geolocation.
// The point is the failure paths: the old code used one 8s high-accuracy attempt and
// showed "approve location access in the browser" for every kind of failure, which sent
// people to browser settings when the real problem was a GPS timeout.
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
// one slice evaluated in one scope, exactly as these live in app.js - splitting it
// would put lastGeoError/lastGeoFix out of reach of geoDiagnostics()
const slice = src.slice(src.indexOf('const GEO_MESSAGES'), src.indexOf('let retryHandlers'));
const persistSlice = src.slice(src.indexOf('const LAST_LOC_KEY'), src.indexOf('let userLoc = restoreLastLoc();'));
const markerSlice = src.slice(src.indexOf('function renderUserLocation()'), src.indexOf('function renderFogOfWar()'));

// --- localStorage stub ---
const store = {};
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};

let attempts = [];
let plan = [];
globalThis.userLoc = null;
let watches = {};
let watchSeq = 0;
const geolocation = {
  getCurrentPosition(ok, fail, opts) {
    attempts.push(opts);
    const next = plan.shift();
    if (next && next.ok) ok({ coords: { latitude: 32.1, longitude: 34.8, accuracy: 12 } });
    else fail({ code: next ? next.code : 2 });
  },
  watchPosition(ok, fail, opts) {
    const id = ++watchSeq;
    watches[id] = { ok, fail, opts };
    return id;
  },
  clearWatch(id) { delete watches[id]; },
};
// node ships a read-only `navigator` global, so a plain assignment is silently ignored
Object.defineProperty(globalThis, 'navigator', { value: { geolocation }, writable: true, configurable: true });
const toasts = [];
const els = {};
globalThis.$ = id => (els[id] = els[id] || {
  id, classList: { _c: new Set(), add(c) { this._c.add(c); }, remove(c) { this._c.delete(c); },
    toggle(c, on) { on ? this._c.add(c) : this._c.delete(c); }, contains(c) { return this._c.has(c); } },
  setAttribute(k, v) { this[k] = v; }, textContent: '', title: '',
});
globalThis.toast = m => toasts.push(m);
globalThis.syncFilterUI = () => {};
globalThis.leafletMap = { setView() {}, getZoom: () => 8 };
globalThis.currentView = 'map';
let renders = 0;
globalThis.renderUserLocation = () => { renders++; };
globalThis.renderLocationPermStatus = () => {};
globalThis.closeSheet = () => {};
globalThis.openSheet = () => {};
globalThis.setBtnLoading = () => {};
globalThis.AbortController = globalThis.AbortController || class { constructor(){ this.signal = {}; } abort(){} };
globalThis.navigate = () => {};
globalThis.document = { addEventListener() {}, hidden: false };
globalThis.window = { isSecureContext: true, self: 1, top: 1, matchMedia: () => ({ matches: false }) };
globalThis.location = { protocol: 'https:' };
globalThis.APP_VERSION = 'test';

(0, eval)(persistSlice + '; globalThis.restoreLastLoc = restoreLastLoc; globalThis.saveLastLoc = saveLastLoc; globalThis.LAST_LOC_KEY = LAST_LOC_KEY; globalThis.LAST_LOC_MAX_AGE = LAST_LOC_MAX_AGE; globalThis.isFreshFix = isFreshFix; globalThis.LOCATION_FRESH_MS = LOCATION_FRESH_MS;');
(0, eval)(slice + `;
  globalThis.locateUser = locateUser;
  globalThis.geoErrorMessage = geoErrorMessage;
  globalThis.noteGeoErrorRef = noteGeoError;
  globalThis.startLocationWatch = startLocationWatch;
  globalThis.stopLocationWatch = stopLocationWatch;
  globalThis.handleLocateTap = handleLocateTap;
  globalThis.setLiveTracking = setLiveTracking;
  globalThis.recenterOnUser = recenterOnUser;
  globalThis.resumeLocationTracking = resumeLocationTracking;
  globalThis.wantsLiveLocation = wantsLiveLocation;
  globalThis.setWantsLiveLocation = setWantsLiveLocation;
  globalThis.isTracking = () => locTrackingOn;
  globalThis.setManualLocation = setManualLocation;
  globalThis.clearManualLocation = clearManualLocation;
  globalThis.geoDiagnostics = geoDiagnostics;
  globalThis.explainGeoFailure = explainGeoFailure;
  globalThis.fetchApproxLocation = fetchApproxLocation;
  globalThis.useApproxLocation = useApproxLocation;
  globalThis.IP_LOCATION_PROVIDERS = IP_LOCATION_PROVIDERS;
  globalThis.APPROX_RADIUS_M = APPROX_RADIUS_M;
  globalThis.osBlockHelpHtml = osBlockHelpHtml;
  globalThis.deniedHelpHtml = deniedHelpHtml;
  globalThis.LOC_WATCH_KEY = LOC_WATCH_KEY;
`);

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
};
const run = (steps, opts) => {
  attempts = []; plan = steps.slice(); globalThis.userLoc = null;
  let result = null;
  locateUser(pos => { result = { ok: true, pos }; }, err => { result = { ok: false, err }; }, opts);
  return result;
};

console.log('\n1. a first-try fix is used as is');
let r = run([{ ok: true }]);
check('succeeds', r.ok);
check('only one attempt', attempts.length === 1, attempts.length + ' attempt(s)');
check('userLoc is set by the helper', globalThis.userLoc && globalThis.userLoc.lat === 32.1);
check('first attempt asks for high accuracy', attempts[0].enableHighAccuracy === true);
check('first attempt waits longer than the old 8s', attempts[0].timeout > 8000, attempts[0].timeout + 'ms');

console.log('\n2. a GPS timeout retries coarsely instead of giving up');
r = run([{ code: 3 }, { ok: true }]);
check('recovers on the coarse retry', r.ok);
check('retry drops high accuracy', attempts[1].enableHighAccuracy === false);
check('retry accepts a recent cached fix', attempts[1].maximumAge > 0, attempts[1].maximumAge + 'ms');

console.log('\n3. a denied permission is not retried');
r = run([{ code: 1 }, { ok: true }]);
check('fails immediately', !r.ok);
check('no second attempt', attempts.length === 1, attempts.length + ' attempt(s)');

console.log('\n4. each failure explains the real cause');
const msg = code => geoErrorMessage({ code });
check('denied points at browser settings', /חסומה/.test(msg(1)), msg(1));
check('unavailable points at device GPS', /GPS/.test(msg(2)), msg(2));
check('timeout does NOT blame permissions', !/הרשאה|לאשר|חסומה/.test(msg(3)), msg(3));
check('an unknown error still says something', msg(undefined).length > 0, msg(undefined));
check('every message differs', new Set([msg(1), msg(2), msg(3)]).size === 3);

console.log('\n5. check-in proximity stays strict');
r = run([{ code: 3 }, { ok: true }], { preciseOnly: true });
check('no coarse fallback', !r.ok);
check('one attempt only', attempts.length === 1, attempts.length + ' attempt(s)');
check('refuses a cached position', attempts[0].maximumAge === 0, String(attempts[0].maximumAge));
check('high accuracy required', attempts[0].enableHighAccuracy === true);

console.log('\n6. a device without geolocation fails cleanly');
const saved = globalThis.navigator.geolocation;
globalThis.navigator.geolocation = null;
let out = null;
locateUser(() => { out = 'ok'; }, err => { out = err; });
check('reports unavailable rather than throwing', out && out.code === 2);
globalThis.navigator.geolocation = saved;

console.log('\n7. a fix survives a reload');
run([{ ok: true }]);
check('the fix is written to storage', !!store[LAST_LOC_KEY], store[LAST_LOC_KEY]);
check('accuracy is kept, not thrown away', globalThis.userLoc.accuracy === 12, String(globalThis.userLoc.accuracy));
globalThis.userLoc = null;
let restored = restoreLastLoc();
check('restored on the next boot', restored && restored.lat === 32.1, JSON.stringify(restored));
check('accuracy restored too', restored.accuracy === 12);
store[LAST_LOC_KEY] = JSON.stringify({ lat: 32.1, lon: 34.8, at: Date.now() - LAST_LOC_MAX_AGE - 1 });
check('a stale fix is dropped rather than shown', restoreLastLoc() === null);
store[LAST_LOC_KEY] = '{not json';
check('corrupt storage does not throw', restoreLastLoc() === null);
delete store[LAST_LOC_KEY];
check('nothing stored means no location', restoreLastLoc() === null);

console.log('\n8. the dot is drawn where it can actually be seen');
const layers = [];
globalThis.leafletMap = { removeLayer: l => { layers.splice(layers.indexOf(l), 1); }, setView() {}, getZoom: () => 8 };
const mk = kind => (latlng, opts) => {
  const layer = { kind, latlng, opts, addTo(map) { layers.push(this); return this; } };
  return layer;
};
globalThis.L = { circle: mk('circle'), circleMarker: mk('circleMarker') };
globalThis.USER_LOC_PANE = 'userLocPane';
globalThis.userLocMarker = null; globalThis.userLocHalo = null;
// export it under its own name: globalThis.renderUserLocation stays the counting stub
// the live-tracking checks below rely on
(0, eval)(markerSlice + '; globalThis.renderUserLocationReal = renderUserLocation;');
// indirect eval declares into global scope, so the line above just replaced the stub
globalThis.renderUserLocation = () => { renders++; };

globalThis.userLoc = { lat: 32.1, lon: 34.8, accuracy: 40, at: Date.now() };
renderUserLocationReal();
check('a dot is drawn', layers.some(l => l.kind === 'circleMarker'));
check('an accuracy halo is drawn', layers.some(l => l.kind === 'circle'));
const dot = layers.find(l => l.kind === 'circleMarker');
check('the dot is blue, not the map\'s own green', /1A73E8/i.test(dot.opts.fillColor), dot.opts.fillColor);
check('the dot sits in its own pane, above the pins', dot.opts.pane === 'userLocPane');
check('the dot does not swallow map clicks', dot.opts.interactive === false);
check('the halo shows the reported accuracy', layers.find(l => l.kind === 'circle').opts.radius === 40);

const before = layers.length;
renderUserLocationReal();
check('re-rendering does not stack layers', layers.length === before, before + ' -> ' + layers.length);

globalThis.userLoc = { lat: 32.1, lon: 34.8, at: Date.now() };
renderUserLocationReal();
check('no halo when the device reported no accuracy', !layers.some(l => l.kind === 'circle'));
check('the dot is still drawn', layers.some(l => l.kind === 'circleMarker'));

// a fix restored from a previous session is a starting point, not "where you are now"
globalThis.userLoc = { lat: 32.1, lon: 34.8, accuracy: 40, at: Date.now() - LOCATION_FRESH_MS - 1 };
renderUserLocationReal();
const staleDot = layers.find(l => l.kind === 'circleMarker');
check('an old fix is not drawn as a live one', !/1A73E8/i.test(staleDot.opts.fillColor), staleDot.opts.fillColor);
check('and is marked stale so it does not pulse', /stale/.test(staleDot.opts.className), staleDot.opts.className);
check('no accuracy halo around an old fix', !layers.some(l => l.kind === 'circle'));
check('a fix with no timestamp is treated as old, not fresh', (() => {
  globalThis.userLoc = { lat: 32.1, lon: 34.8, accuracy: 40 };
  renderUserLocationReal();
  return !/1A73E8/i.test(layers.find(l => l.kind === 'circleMarker').opts.fillColor);
})());

globalThis.userLoc = null;
renderUserLocationReal();
check('no location means nothing on the map', layers.length === 0, layers.length + ' layer(s)');

(async () => {
console.log('\n9. live tracking keeps the dot moving with you');
const fixAt = (lat, lon, acc) => Object.values(watches)[0].ok({ coords: { latitude: lat, longitude: lon, accuracy: acc } });
const failWith = code => Object.values(watches)[0].fail({ code });
// stopLocationWatch() releases the watch AND resets the module's internal id, which a
// bare `watches = {}` would not - so always go through it between scenarios
const reset = () => {
  if (isTracking()) setLiveTracking(false);  // the real off path, so locTrackingOn clears too
  stopLocationWatch(); setWantsLiveLocation(false); watches = {}; toasts.length = 0; renders = 0;
};

reset();
globalThis.userLoc = null;
handleLocateTap();
check('turning it on starts a watch, not a one-shot', Object.keys(watches).length === 1);
check('the watch asks for high accuracy', Object.values(watches)[0].opts.enableHighAccuracy === true);
fixAt(32.1, 34.8, 30);
check('the first fix lands', globalThis.userLoc.lat === 32.1);
check('and is drawn', renders === 1, String(renders));
fixAt(32.2, 34.9, 25);
check('a later fix moves the dot without another tap', globalThis.userLoc.lat === 32.2);
check('redrawn on every fix', renders === 2, String(renders));
check('the latest fix is persisted', JSON.parse(store[LAST_LOC_KEY]).lat === 32.2);
check('the preference is remembered', wantsLiveLocation() === true);

console.log('\n10. tracking survives noise but not a refusal');
toasts.length = 0;
failWith(3); // a GPS timeout mid-track
check('a timeout does not kill the watch', Object.keys(watches).length === 1);
check('and does not nag', toasts.length === 0, toasts.join(' | '));
failWith(1); // permission revoked
check('a refusal stops the watch', Object.keys(watches).length === 0);
check('and turns the preference off', wantsLiveLocation() === false);
await new Promise(r => setImmediate(r));  // the wording is looked up asynchronously
check('and says why', /חסומה|המכשיר/.test(toasts.join(' ')), toasts.join(' | '));

console.log('\n11. leaving the map stops the GPS');
reset();
handleLocateTap();
check('tracking on', Object.keys(watches).length === 1);
stopLocationWatch();
check('watch released when the map closes', Object.keys(watches).length === 0);
check('but the user preference is untouched', wantsLiveLocation() === true, String(wantsLiveLocation()));

console.log('\n12. the preference survives a stop, so tracking can resume');
reset();
handleLocateTap();
check('tracking on', Object.keys(watches).length === 1);
stopLocationWatch();
check('the watch is released', Object.keys(watches).length === 0);
check('but the preference stays, so the next map entry resumes', wantsLiveLocation() === true);

  console.log('\n13. it resumes by itself');
  reset();
  setWantsLiveLocation(true);
  await resumeLocationTracking();
  check('a remembered preference restarts tracking', Object.keys(watches).length === 1);

  reset();
  globalThis.navigator.permissions = { query: async () => ({ state: 'granted' }) };
  await resumeLocationTracking();
  check('already-granted permission starts tracking without a tap', Object.keys(watches).length === 1);

  reset();
  globalThis.navigator.permissions = { query: async () => ({ state: 'prompt' }) };
  await resumeLocationTracking();
  check('an unanswered permission is never auto-requested', Object.keys(watches).length === 0);

  console.log('\n14. a manual location is usable, but never passes as GPS');
  reset();
  globalThis.userLoc = null;
  layers.length = 0;
  setManualLocation(31.5, 35.0);
  check('userLoc is set', globalThis.userLoc.lat === 31.5);
  check('and flagged as manual', globalThis.userLoc.manual === true);
  check('persisted with the flag', JSON.parse(store[LAST_LOC_KEY]).manual === true);
  check('the flag survives a reload', restoreLastLoc().manual === true);

  renderUserLocationReal();
  check('drawn as a dot', layers.some(l => l.kind === 'circleMarker'));
  check('with NO accuracy halo — there was no measurement', !layers.some(l => l.kind === 'circle'));
  const manualDot = layers.find(l => l.kind === 'circleMarker');
  check('in a different colour from a real fix', !/1A73E8/i.test(manualDot.opts.fillColor), manualDot.opts.fillColor);

  // check-in asks the device directly and never reads userLoc, so a manual pin cannot
  // stand in for being there
  attempts = []; plan = [{ code: 1 }];
  let checkinResult = null;
  locateUser(() => { checkinResult = 'ok'; }, e => { checkinResult = e; }, { preciseOnly: true });
  check('check-in still demands a fresh device fix', checkinResult && checkinResult.code === 1);
  check('and asks the device, ignoring the manual pin', attempts.length === 1);

  clearManualLocation();
  check('clearing removes it', globalThis.userLoc === null);
  check('and forgets it', store[LAST_LOC_KEY] === undefined);

  console.log('\n15. the diagnostics report says what actually happened');
  globalThis.navigator.onLine = true;
  globalThis.navigator.userAgent = 'test-agent';
  noteGeoErrorRef({ code: 1, message: 'User denied Geolocation' });
  const report = await geoDiagnostics();
  check('names the permission state', /permission: /.test(report));
  check('reports the last error code', /last error: code 1/.test(report), (report.match(/last error:.*/) || [])[0]);
  check('reports whether the context is secure', /secureContext: yes/.test(report));
  check('reports whether a watch is running', /live watch: /.test(report));
  check('reports the iframe case', /in iframe: no/.test(report));

  console.log('\n16. a block below the browser is not a block at the site');
  // the signature seen in the field: an instant code 1 while the Permissions API still
  // reports "prompt" — nobody was ever asked, so pointing at site settings is wrong
  globalThis.navigator.permissions = { query: async () => ({ state: 'prompt' }) };
  let m = await explainGeoFailure({ code: 1 });
  check('names the device, not the browser', /המכשיר/.test(m), m);
  check('does not send you to site settings', !/הגדרות הדפדפן/.test(m), m);

  globalThis.navigator.permissions = { query: async () => ({ state: 'denied' }) };
  m = await explainGeoFailure({ code: 1 });
  check('a real site-level block still points at the browser', /הדפדפן/.test(m), m);

  globalThis.navigator.permissions = { query: async () => ({ state: 'prompt' }) };
  m = await explainGeoFailure({ code: 3 });
  check('a timeout is untouched by any of this', /יותר מדי זמן/.test(m), m);

  globalThis.window.matchMedia = () => ({ matches: true });   // installed PWA
  let help = osBlockHelpHtml();
  check('the installed app is named, not Chrome', /מגלים את ישראל/.test(help));
  check('explains that the installed app has its own permission', /נפרדות/.test(help));
  check('offers the open-in-Chrome discriminator', /Chrome רגיל/.test(help));
  check('and makes it one tap, not an instruction', /id="openInBrowserBtn"/.test(help));
  globalThis.window.matchMedia = () => ({ matches: false }); // plain browser tab
  help = osBlockHelpHtml();
  check('in a browser tab it names the browser', /Chrome/.test(help) && !/מגלים את ישראל/.test(help));
  check('and drops the open-in-Chrome step', !/Chrome רגיל/.test(help));
  check('both variants offer a fallback that needs no permission', /ידנית/.test(help) && /הרשת/.test(help));

  console.log('\n18. the locate button locates — it does not switch tracking off');
  // the reported bug: tracking auto-resumes on entering the map, so the first tap on
  // "my location" turned it OFF ("מעקב המיקום כובה") and cleared the preference — after
  // which the dot was frozen on the fix restored at startup
  reset();
  globalThis.userLoc = null;
  handleLocateTap();
  check('a first tap starts tracking', Object.keys(watches).length === 1);
  fixAt(32.1, 34.8, 20);
  toasts.length = 0; attempts = []; plan = [{ ok: true }];
  handleLocateTap();
  check('a second tap does NOT stop the watch', Object.keys(watches).length === 1);
  check('and does not say tracking was turned off', !/כובה/.test(toasts.join(' ')), toasts.join(' | '));
  check('it asks for a fresh fix instead', attempts.length === 1);
  check('the preference stays on', wantsLiveLocation() === true);

  console.log('\n19. turning tracking off is a deliberate act, in settings');
  toasts.length = 0;
  setLiveTracking(false);
  check('the watch is released', Object.keys(watches).length === 0);
  check('the preference is cleared', wantsLiveLocation() === false);
  check('and the consequence is spelled out', /לא תתעדכן/.test(toasts.join(' ')), toasts.join(' | '));
  setLiveTracking(true);
  check('and it can be turned back on', Object.keys(watches).length === 1);

  console.log('\n17. the network fallback, for when the device blocks GPS entirely');
  const fetched = [];
  const respond = map => { globalThis.fetch = async url => {
    fetched.push(url);
    const r = map[url];
    if (r === 'throw') throw new Error('network');
    if (!r) return { ok: false, json: async () => ({}) };
    return { ok: true, json: async () => r };
  }; };

  respond({ 'https://ipwho.is/': { success: true, latitude: 32.08, longitude: 34.78, city: 'תל אביב' } });
  fetched.length = 0;
  let approx = await fetchApproxLocation();
  check('a good first provider answers', approx && approx.lat === 32.08, JSON.stringify(approx));
  check('and the second is never called', fetched.length === 1, fetched.join(', '));

  respond({ 'https://ipwho.is/': 'throw', 'https://ipapi.co/json/': { latitude: 31.77, longitude: 35.21, city: 'ירושלים' } });
  fetched.length = 0;
  approx = await fetchApproxLocation();
  check('a dead provider falls through to the next', approx && approx.lat === 31.77, JSON.stringify(approx));
  check('both were tried', fetched.length === 2, fetched.join(', '));

  respond({ 'https://ipwho.is/': { success: false }, 'https://ipapi.co/json/': { error: true, reason: 'quota' } });
  approx = await fetchApproxLocation();
  check('an error payload is not mistaken for a location', approx === null, JSON.stringify(approx));

  respond({ 'https://ipwho.is/': 'throw', 'https://ipapi.co/json/': 'throw' });
  approx = await fetchApproxLocation();
  check('everything down means no location, not a crash', approx === null);

  respond({ 'https://ipwho.is/': { success: true, latitude: 32.08, longitude: 34.78, city: 'תל אביב' } });
  globalThis.userLoc = null; layers.length = 0; toasts.length = 0;
  await useApproxLocation();
  check('userLoc is set from the network', globalThis.userLoc.lat === 32.08);
  check('flagged approximate, not a GPS fix', globalThis.userLoc.approx === true && !globalThis.userLoc.manual);
  check('persisted with the flag', JSON.parse(store[LAST_LOC_KEY]).approx === true);
  check('the flag survives a reload', restoreLastLoc().approx === true);
  check('the user is told it is approximate', /מקורב/.test(toasts.join(' ')), toasts.join(' | '));
  check('and that check-in still needs real GPS', /צ׳ק-אין/.test(toasts.join(' ')), toasts.join(' | '));

  renderUserLocationReal();
  const approxDot = layers.find(l => l.kind === 'circleMarker');
  const approxHalo = layers.find(l => l.kind === 'circle');
  check('drawn in the not-a-measurement colour', !/1A73E8/i.test(approxDot.opts.fillColor), approxDot.opts.fillColor);
  check('with a wide uncertainty halo, not a sharp point', approxHalo && approxHalo.opts.radius === APPROX_RADIUS_M, String(approxHalo && approxHalo.opts.radius));

  attempts = []; plan = [{ code: 1 }];
  let ci = null;
  locateUser(() => { ci = 'ok'; }, e => { ci = e; }, { preciseOnly: true });
  check('check-in still refuses to use it', ci && ci.code === 1);

  clearManualLocation();
  check('clearing removes an approximate location too', globalThis.userLoc === null);

  console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nall checks passed\n');
  process.exit(failures ? 1 : 0);
})();
