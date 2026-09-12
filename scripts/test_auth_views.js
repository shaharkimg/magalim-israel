#!/usr/bin/env node
// Exercises the auth view state machine and form validation out of app.js against a
// tiny DOM stub. The real app cannot boot here (its CDN dependencies are blocked), so
// this covers the part that is pure logic: which view is visible, what each mode puts
// on screen, and which inputs are rejected before anything reaches Supabase.
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const slice = src.slice(src.indexOf('const AUTH_VIEWS ='), src.indexOf('const GUEST_CHOICE_KEY'));

// --- minimal DOM ---
const els = {};
function el(id) {
  if (!els[id]) {
    els[id] = {
      id, _cls: new Set(), _text: '', _html: '', _attrs: {}, value: '', type: 'text', dataset: {},
      classList: {
        add: (...c) => c.forEach(x => els[id]._cls.add(x)),
        remove: (...c) => c.forEach(x => els[id]._cls.delete(x)),
        toggle: (c, on) => { on ? els[id]._cls.add(c) : els[id]._cls.delete(c); },
        contains: c => els[id]._cls.has(c),
      },
      get textContent() { return this._text; }, set textContent(v) { this._text = v; },
      get innerHTML() { return this._html; }, set innerHTML(v) { this._html = v; },
      setAttribute(k, v) { this._attrs[k] = v; }, getAttribute(k) { return this._attrs[k] ?? null; },
      removeAttribute(k) { delete this._attrs[k]; },
      addEventListener() {}, focus() {}, click() {},
    };
  }
  return els[id];
}
globalThis.$ = el;
globalThis.document = { querySelector: () => null, querySelectorAll: () => [] };
globalThis.uiIcon = () => '<svg/>';
globalThis.authGateMessage = null;
globalThis.authMode = 'login';
el('authPassword').setAttribute('minlength', '6');

(0, eval)(slice + `
  globalThis.showAuthView = showAuthView;
  globalThis.setAuthMode = setAuthMode;
  globalThis.validateAuthForm = validateAuthForm;
  globalThis.setBtnLoading = setBtnLoading;
  globalThis.setAuthCameFromWelcome = v => { authCameFromWelcome = v; };
`);

let failures = 0;
const check = (name, cond, detail) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
};
const visible = id => !el(id).classList.contains('hidden');

console.log('\n1. only one auth view is visible at a time');
for (const v of ['welcome', 'form', 'reset', 'waitlist']) {
  showAuthView(v);
  const shown = ['authViewWelcome', 'authViewForm', 'resetPasswordForm', 'waitlistView'].filter(visible);
  check(`showAuthView("${v}")`, shown.length === 1, shown.join(',') || 'none visible');
}

console.log('\n2. back button only when we arrived from Welcome');
setAuthCameFromWelcome(false); showAuthView('form');
check('hidden for a gated action', !visible('authBackBtn'));
setAuthCameFromWelcome(true); showAuthView('form');
check('shown when coming from Welcome', visible('authBackBtn'));

console.log('\n3. signup vs login put the right things on screen');
setAuthMode('signup');
check('signup title', el('authTitle').textContent === 'יוצאים לדרך', el('authTitle').textContent);
check('signup shows the name field', visible('nameField'));
check('signup hides "forgot password"', !visible('forgotPasswordLink'));
check('signup CTA', el('authSubmit').textContent === 'יצירת חשבון', el('authSubmit').textContent);
check('signup offers the login switch', el('authSwitchBtn').textContent === 'התחברו', el('authSwitchBtn').textContent);
check('new-password autocomplete', el('authPassword').getAttribute('autocomplete') === 'new-password');
setAuthMode('login');
check('login title', el('authTitle').textContent === 'טוב לראות אתכם שוב', el('authTitle').textContent);
check('login hides the name field', !visible('nameField'));
check('login shows "forgot password"', visible('forgotPasswordLink'));
check('login CTA', el('authSubmit').textContent === 'התחברות', el('authSubmit').textContent);
check('current-password autocomplete', el('authPassword').getAttribute('autocomplete') === 'current-password');

console.log('\n4. validation rejects before anything reaches the backend');
const attempt = (mode, name, email, password) => {
  setAuthMode(mode);
  el('authName').value = name; el('authEmail').value = email; el('authPassword').value = password;
  return validateAuthForm();
};
check('signup with no name is rejected', attempt('signup', '', 'a@b.co', 'secret1') === false);
check('malformed email is rejected', attempt('login', '', 'not-an-email', 'secret1') === false);
check('short password is rejected', attempt('login', '', 'a@b.co', '123') === false);
check('valid login passes', attempt('login', '', 'a@b.co', '123456') === true);
check('valid signup passes', attempt('signup', 'שחר', 'a@b.co', '123456') === true);
check('password rule comes from the field minlength, not an invented one',
  slice.includes('getAttribute("minlength")'));

console.log('\n5. an invalid field is marked by more than colour (a11y)');
attempt('login', '', 'nope', '123456');
check('input marked invalid', el('authEmail').classList.contains('invalid'));
check('aria-invalid set', el('authEmail').getAttribute('aria-invalid') === 'true');
check('error text rendered', /תקינה/.test(el('authEmailErr').innerHTML));

console.log('\n6. submit cannot be double-fired');
const btn = el('authSubmit');
setAuthMode('signup');
setBtnLoading(btn, true, 'יוצרים חשבון...');
check('disabled while loading', btn.disabled === true);
check('shows progress copy', btn.textContent === 'יוצרים חשבון...', btn.textContent);
setBtnLoading(btn, false);
check('restores the original label', btn.textContent === 'יצירת חשבון', btn.textContent);
check('re-enabled', btn.disabled === false);

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
