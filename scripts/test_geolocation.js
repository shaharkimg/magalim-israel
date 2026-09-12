#!/usr/bin/env node
// Exercises locateUser() out of app.js against a stubbed navigator.geolocation.
// The point is the failure paths: the old code used one 8s high-accuracy attempt and
// showed "approve location access in the browser" for every kind of failure, which sent
// people to browser settings when the real problem was a GPS timeout.
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const slice = src.slice(src.indexOf('const GEO_MESSAGES'), src.indexOf('let retryHandlers'));

let attempts = [];
let plan = [];
globalThis.userLoc = null;
const geolocation = {
  getCurrentPosition(ok, fail, opts) {
    attempts.push(opts);
    const next = plan.shift();
    if (next && next.ok) ok({ coords: { latitude: 32.1, longitude: 34.8 } });
    else fail({ code: next ? next.code : 2 });
  },
};
// node ships a read-only `navigator` global, so a plain assignment is silently ignored
Object.defineProperty(globalThis, 'navigator', { value: { geolocation }, writable: true, configurable: true });
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

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
