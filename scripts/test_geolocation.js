#!/usr/bin/env node
// Exercises locateUser() out of app.js against a stubbed navigator.geolocation.
// The point is the failure paths: the old code used one 8s high-accuracy attempt and
// showed "approve location access in the browser" for every kind of failure, which sent
// people to browser settings when the real problem was a GPS timeout.
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const slice = src.slice(src.indexOf('const GEO_MESSAGES'), src.indexOf('const LOC_WATCH_KEY'));
const watchSlice = src.slice(src.indexOf('const LOC_WATCH_KEY'), src.indexOf('let retryHandlers'));
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
(0, eval)(persistSlice + '; globalThis.restoreLastLoc = restoreLastLoc; globalThis.saveLastLoc = saveLastLoc; globalThis.LAST_LOC_KEY = LAST_LOC_KEY; globalThis.LAST_LOC_MAX_AGE = LAST_LOC_MAX_AGE;');
(0, eval)(slice + '; globalThis.locateUser = locateUser; globalThis.geoErrorMessage = geoErrorMessage;');

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
globalThis.leafletMap = { removeLayer: l => { layers.splice(layers.indexOf(l), 1); } };
const mk = kind => (latlng, opts) => {
  const layer = { kind, latlng, opts, addTo(map) { layers.push(this); return this; } };
  return layer;
};
globalThis.L = { circle: mk('circle'), circleMarker: mk('circleMarker') };
globalThis.USER_LOC_PANE = 'userLocPane';
globalThis.userLocMarker = null; globalThis.userLocHalo = null;
(0, eval)(markerSlice + '; globalThis.renderUserLocation = renderUserLocation;');

globalThis.userLoc = { lat: 32.1, lon: 34.8, accuracy: 40 };
renderUserLocation();
check('a dot is drawn', layers.some(l => l.kind === 'circleMarker'));
check('an accuracy halo is drawn', layers.some(l => l.kind === 'circle'));
const dot = layers.find(l => l.kind === 'circleMarker');
check('the dot is blue, not the map\'s own green', /1A73E8/i.test(dot.opts.fillColor), dot.opts.fillColor);
check('the dot sits in its own pane, above the pins', dot.opts.pane === 'userLocPane');
check('the dot does not swallow map clicks', dot.opts.interactive === false);
check('the halo shows the reported accuracy', layers.find(l => l.kind === 'circle').opts.radius === 40);

const before = layers.length;
renderUserLocation();
check('re-rendering does not stack layers', layers.length === before, before + ' -> ' + layers.length);

globalThis.userLoc = { lat: 32.1, lon: 34.8 };
renderUserLocation();
check('no halo when the device reported no accuracy', !layers.some(l => l.kind === 'circle'));
check('the dot is still drawn', layers.some(l => l.kind === 'circleMarker'));

globalThis.userLoc = null;
renderUserLocation();
check('no location means nothing on the map', layers.length === 0, layers.length + ' layer(s)');

console.log('\n9. live tracking keeps the dot moving with you');
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
globalThis.document = { addEventListener() {}, hidden: false };
(0, eval)(watchSlice + `;
  globalThis.startLocationWatch = startLocationWatch;
  globalThis.stopLocationWatch = stopLocationWatch;
  globalThis.toggleLocationTracking = toggleLocationTracking;
  globalThis.resumeLocationTracking = resumeLocationTracking;
  globalThis.wantsLiveLocation = wantsLiveLocation;
  globalThis.setWantsLiveLocation = setWantsLiveLocation;
  globalThis.LOC_WATCH_KEY = LOC_WATCH_KEY;
  globalThis.isTracking = () => locTrackingOn;
`);
const fixAt = (lat, lon, acc) => Object.values(watches)[0].ok({ coords: { latitude: lat, longitude: lon, accuracy: acc } });
const failWith = code => Object.values(watches)[0].fail({ code });
// stopLocationWatch() releases the watch AND resets the module's internal id, which a
// bare `watches = {}` would not - so always go through it between scenarios
const reset = () => {
  if (isTracking()) toggleLocationTracking();  // the real off path, so locTrackingOn clears too
  stopLocationWatch(); setWantsLiveLocation(false); watches = {}; toasts.length = 0; renders = 0;
};

reset();
globalThis.userLoc = null;
toggleLocationTracking();
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
check('and says why', /חסומה/.test(toasts.join(' ')), toasts.join(' | '));

console.log('\n11. leaving the map stops the GPS');
reset();
toggleLocationTracking();
check('tracking on', Object.keys(watches).length === 1);
stopLocationWatch();
check('watch released when the map closes', Object.keys(watches).length === 0);
check('but the user preference is untouched', wantsLiveLocation() === true, String(wantsLiveLocation()));

console.log('\n12. turning it off means off');
reset();
toggleLocationTracking();
toasts.length = 0;
toggleLocationTracking();
check('the watch is released', Object.keys(watches).length === 0);
check('the preference is cleared', wantsLiveLocation() === false);
check('the user is told', /כובה/.test(toasts.join(' ')), toasts.join(' | '));

(async () => {
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

  console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nall checks passed\n');
  process.exit(failures ? 1 : 0);
})();
