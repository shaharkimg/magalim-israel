#!/usr/bin/env node
// When an OAuth round trip fails, the provider and Supabase put the reason in the URL
// itself — sometimes in the query string, sometimes in the hash. The app used to ignore
// it and boot normally, so from the outside it looked like "login just doesn't work"
// with no clue, while the exact cause sat in the address bar.
//
// Worse: an error hash (#error=...) reached the router as if it were a route.
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const slice = src.slice(src.indexOf('const OAUTH_ERROR_HINTS'), src.indexOf('async function handleInviteLinks()'));

let opened = null;
globalThis.openAuthSheet = msg => { opened = msg; };
globalThis.console = { ...console, error: () => {} };

const setUrl = (search, hash) => {
  globalThis.location = { search, hash, pathname: '/' };
  globalThis.history = { replaceState: (a, b, url) => { globalThis.location.replaced = url; } };
};
(0, eval)(slice + '; globalThis.readAuthRedirectError = readAuthRedirectError; globalThis.showAuthRedirectError = showAuthRedirectError;');

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
};

console.log('\n1. an error in the query string is read');
setUrl('?error=server_error&error_description=Unable+to+exchange+external+code', '');
let err = readAuthRedirectError();
check('detected', !!err);
check('code kept', err.code === 'server_error', err && err.code);
check('+ decoded back to spaces', err.desc === 'Unable to exchange external code', err && err.desc);
check('a human hint is attached', /Redirect URLs/.test(err.hint || ''), err && err.hint);

console.log('\n2. an error in the hash is read too');
setUrl('', '#error=access_denied&error_description=User+denied');
err = readAuthRedirectError();
check('detected', !!err, err && err.code);
check('hint explains what to check', /Live/.test(err.hint || ''), err && err.hint);

console.log('\n3. the URL is cleaned so it does not reach the router as a route');
setUrl('', '#error=server_error');
readAuthRedirectError();
check('rewritten to a real route', globalThis.location.replaced === '/#/home', globalThis.location.replaced);

console.log('\n4. a normal boot is untouched');
setUrl('', '#/map');
check('no error reported', readAuthRedirectError() === null);
setUrl('?ref=abc123', '#/home');
check('an invite link is not mistaken for a failure', readAuthRedirectError() === null);

console.log('\n5. an unknown code still says something useful');
setUrl('?error=weird_thing&error_description=Something+odd', '');
err = readAuthRedirectError();
check('no invented hint', err.hint === null);
opened = null;
showAuthRedirectError(err);
check('the raw description is shown, since it is the actionable part',
  /Something odd/.test(opened || ''), opened);
check('and the code, for searching', /weird_thing/.test(opened || ''), opened);

console.log('\n6. nothing is shown when nothing failed');
opened = null;
showAuthRedirectError(null);
check('silent', opened === null);

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
