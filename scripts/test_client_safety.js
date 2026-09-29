// Runs the real safety helpers out of app.js: URL/HTML sanitising (stored-XSS vectors), friendly
// error mapping, log-URL scrubbing, the check-in result adapter and the offline queue storage.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const between = (a, b) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a)));

globalThis.navigator = { onLine: true };
globalThis.location = { href: 'https://megalim-israel.co.il/#/invite/SECRETCODE?x=1', origin: 'https://megalim-israel.co.il', pathname: '/' };
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
globalThis.PENDING_KEY = 'q';
globalThis.COLLECTIONS = [{ id: 'water', label: 'צייד המים' }];
globalThis.regionMilestoneLabel = (pct, r) => `m${pct}-${r}`;

const code = [
  between('function escapeHtml(str){', 'async function renderChallenge') && between('function escapeHtml(str){', '\n// כתובות תמונה'),
  between('// כתובות תמונה מגיעות', 'async function renderChallenge'),
  between('function sanitizeUrlForLog(u){', 'let clientErrorCount'),
  between('const CHECKIN_ERRORS', 'async function submitFieldReport'),
].join('\n');
(0, eval)(code + ';Object.assign(globalThis,{escapeHtml,safeUrl,cssUrlValue,friendlyError,sanitizeUrlForLog,checkinErrorMessage,checkinGrantFromResult,loadPendingQueue,savePendingQueue,CHECKIN_PERMANENT_ERRORS});');

let failures = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failures++; };

console.log('\n1. safeUrl blocks attribute-breaking / script URLs');
const good = 'https://abc.supabase.co/storage/v1/object/public/checkin-photos/u/x.jpg';
check('https URL passes', safeUrl(good) === good);
check('javascript: rejected', safeUrl('javascript:alert(1)') === '');
check('http: rejected', safeUrl('http://evil.example/p.gif') === '');
check('protocol-relative rejected', safeUrl('//evil.example/p.gif') === '');
check('data:text/html rejected', safeUrl('data:text/html;base64,PHNjcmlwdD4=') === '');
check('data:image jpeg allowed (local preview)', safeUrl('data:image/jpeg;base64,/9j/4AAQ') !== '');
const breakout = 'https://x.co/a.jpg" onerror="alert(1)';
check('quote / whitespace breakout is rejected outright', safeUrl(breakout) === '' && safeUrl('https://x.co/a b.jpg') === '' && safeUrl("https://x.co/a'.jpg") === '');
check('null / undefined -> empty', safeUrl(null) === '' && safeUrl(undefined) === '');

console.log('\n2. cssUrlValue cannot escape url(...) or the style attribute');
check('quote breakout out of url() is rejected outright', cssUrlValue("https://x.co/a.jpg');background:url('https://evil/x") === '' && cssUrlValue('https://x.co/a.jpg")') === '');
check('parentheses are percent-encoded', cssUrlValue('https://x.co/a(1).jpg') === "url('https://x.co/a%281%29.jpg')");
check('HTML entities cannot decode into a url() breakout', !/&#|&[a-z]+;|;/.test(cssUrlValue("https://x.supabase.co/a&#39;&#41;;position:fixed;x:&#40;&#39;.jpg")));
check('non-https rejected', cssUrlValue('javascript:alert(1)') === '' && cssUrlValue('http://a/b') === '');
check('plain https url preserved', cssUrlValue(good) === `url('${good}')`);

console.log('\n3. user text is escaped');
check('script tag neutralised', escapeHtml('<img src=x onerror=alert(1)>') === '&lt;img src=x onerror=alert(1)&gt;');

console.log('\n4. friendlyError never leaks raw API text');
check('raw supabase error hidden', friendlyError({ message: 'duplicate key value violates unique constraint "visits_user_id_landmark_id_key"' }, 'נסו שוב') === 'נסו שוב');
check('network error mapped', /חיבור/.test(friendlyError(new TypeError('Failed to fetch'))));
check('expired JWT mapped', /התחברו/.test(friendlyError({ message: 'JWT expired' })));
navigator.onLine = false;
check('offline mapped', friendlyError({ message: 'x' }) === 'אין כרגע חיבור לאינטרנט');
navigator.onLine = true;
check('undefined / null error -> fallback', friendlyError(undefined, 'ok') === 'ok' && friendlyError(null, 'ok') === 'ok');

console.log('\n5. error reports do not carry invite codes or user ids');
check('hash payload dropped', sanitizeUrlForLog('https://megalim-israel.co.il/#/invite/SECRETCODE') === 'https://megalim-israel.co.il/#/invite');
check('query dropped', sanitizeUrlForLog('https://megalim-israel.co.il/?ref=1234-uuid&group=abcd#/map') === 'https://megalim-israel.co.il/#/map');
check('garbage does not throw', typeof sanitizeUrlForLog('::::') === 'string');

console.log('\n6. server check-in result adapter');
const g = checkinGrantFromResult({ first_conquest: true, base_xp: 20, total_granted: 45, bonuses: [
  { type: 'first_destination', xp: 10 }, { type: 'region_25', xp: 10 }, { type: 'collection_complete', id: 'water', xp: 5 } ] }, { region: 'north' });
check('totals come from the server', g.baseXP === 20 && g.totalGranted === 45 && g.isFirstConquest);
check('bonus labels resolved', g.bonuses[0].label === 'יעד ראשון!' && g.bonuses[1].label === 'm25-north!' && /צייד המים/.test(g.bonuses[2].label));
check('repeat result grants nothing', checkinGrantFromResult({ already: true, first_conquest: false }, { region: 'north' }).totalGranted === 0);
check('every server error has a user message', ['too_far','no_location','poor_accuracy','rate_limited','impossible_travel','invalid_photo','account_unavailable','landmark_not_found','not_authenticated','weird'].every(c => /\S/.test(checkinErrorMessage(c))));
check('rate-limit is retried, not dropped', !CHECKIN_PERMANENT_ERRORS.has('rate_limited') && !CHECKIN_PERMANENT_ERRORS.has('not_authenticated'));
check('a rejected location is not retried forever', CHECKIN_PERMANENT_ERRORS.has('too_far') && CHECKIN_PERMANENT_ERRORS.has('impossible_travel'));

console.log('\n7. offline queue survives broken storage');
check('empty -> []', loadPendingQueue().length === 0);
store.q = '{not json'; check('corrupt JSON -> []', loadPendingQueue().length === 0);
store.q = '{"a":1}'; check('non-array -> []', loadPendingQueue().length === 0);
check('save + load round-trip', savePendingQueue([{ landmarkId: 'a' }]) && loadPendingQueue()[0].landmarkId === 'a');
globalThis.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
check('storage exceptions are swallowed', savePendingQueue([{}]) === false && loadPendingQueue().length === 0);

process.exit(failures ? 1 : 0);
