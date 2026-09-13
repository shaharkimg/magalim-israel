#!/usr/bin/env node
// A blind user reaches this app through VoiceOver or TalkBack, and a screen
// reader can only announce what the markup names. An icon-only button whose
// whole content is an <svg> is announced as "button" - useless. This app has
// 180+ buttons, most of them icons, so the failure is easy to reintroduce and
// invisible to anyone looking at the screen.
//
// Checked here, because these are the ones a screen reader cannot recover from:
//   1. every control has an accessible name
//   2. decorative icons are hidden, so they are not announced as junk
//   3. every form field is tied to a label
//   4. regions that change without a page load announce themselves
//   5. the reader is told which language and direction the page is in
//
// Not checked: colour contrast and focus-visible styling - those matter for
// low-vision users but need a rendered page, and test_map_controls.js already
// drives a real browser if we ever want them.
//
// Run: node scripts/check_a11y.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

let failures = 0;
let checks = 0;
function pass(label, detail) {
  checks++;
  console.log('  PASS  ' + label + (detail ? ' — ' + detail : ''));
}
function fail(label, detail) {
  checks++;
  failures++;
  console.log('  FAIL  ' + label + (detail ? ' — ' + detail : ''));
}

// The document body only; the <head> and inline <script> carry markup-shaped
// strings that are not markup.
const bodyStart = html.indexOf('<body');
const scriptStart = html.lastIndexOf('<script');
const body = html.slice(bodyStart, scriptStart > bodyStart ? scriptStart : html.length);

function stripTags(s) {
  return s.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}
function attr(tag, name) {
  const m = tag.match(new RegExp(name + '="([^"]*)"'));
  return m ? m[1] : null;
}
// An accessible name comes from aria-label, aria-labelledby, a title, or the
// element's own text. An <svg> contributes nothing unless it carries a title.
function namedBy(openTag, inner) {
  if (attr(openTag, 'aria-label')) return 'aria-label';
  if (attr(openTag, 'aria-labelledby')) return 'aria-labelledby';
  if (attr(openTag, 'title')) return 'title';
  if (stripTags(inner)) return 'text';
  return null;
}

console.log('\n1. every control announces what it does');
// An empty button is fine when app.js fills it in before it is ever shown -
// the confirm sheet and the resume strip both work that way.
function filledAtRuntime(openTag) {
  const id = attr(openTag, 'id');
  if (!id) return false;
  return new RegExp('\\$\\("' + id + '"\\)\\.(textContent|innerHTML)\\s*=').test(app);
}
const buttons = [...body.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
const unnamed = buttons.filter(m => !namedBy(m[1], m[2]) && !filledAtRuntime(m[1]));
if (unnamed.length === 0) {
  pass('every <button> has an accessible name', buttons.length + ' buttons');
} else {
  fail(unnamed.length + ' of ' + buttons.length + ' buttons announce only "button"');
  for (const m of unnamed.slice(0, 12)) {
    console.log('        id=' + (attr(m[1], 'id') || '(none)') +
      ' class=' + (attr(m[1], 'class') || '(none)'));
  }
  if (unnamed.length > 12) console.log('        ... and ' + (unnamed.length - 12) + ' more');
}

// A link that goes somewhere needs a name for the same reason.
const links = [...body.matchAll(/<a\b([^>]*href=[^>]*)>([\s\S]*?)<\/a>/g)];
const unnamedLinks = links.filter(m => !namedBy(m[1], m[2]));
if (unnamedLinks.length === 0) pass('every link has an accessible name', links.length + ' links');
else fail(unnamedLinks.length + ' of ' + links.length + ' links have no name');

console.log('\n2. decorative icons stay out of the way');
// An <svg> inside a control that already has a name is noise to a reader.
const svgs = [...body.matchAll(/<svg\b([^>]*)>/g)];
const exposedSvgs = svgs.filter(m => !attr(m[1], 'aria-hidden') && !attr(m[1], 'role'));
if (exposedSvgs.length === 0) {
  pass('decorative <svg> marked aria-hidden', svgs.length + ' icons');
} else {
  fail(exposedSvgs.length + ' of ' + svgs.length + ' <svg> are neither aria-hidden nor given a role');
}

console.log('\n3. every field is tied to a label');
const inputs = [...body.matchAll(/<(input|select|textarea)\b([^>]*)>/g)]
  .filter(m => !/type="(hidden|submit|button)"/.test(m[2]));
const labelled = inputs.filter(m => {
  const id = attr(m[2], 'id');
  if (attr(m[2], 'aria-label') || attr(m[2], 'aria-labelledby')) return true;
  return id && new RegExp('<label[^>]*for="' + id + '"').test(body);
});
if (labelled.length === inputs.length) {
  pass('every field has a label', inputs.length + ' fields');
} else {
  fail((inputs.length - labelled.length) + ' of ' + inputs.length + ' fields are unlabelled');
  for (const m of inputs.filter(x => !labelled.includes(x)).slice(0, 8)) {
    console.log('        id=' + (attr(m[2], 'id') || '(none)'));
  }
}

console.log('\n4. changes that happen without a page load are announced');
// This is a single-page app: switching view or failing a login replaces content
// silently. Without a live region the reader says nothing at all.
const liveRegions = (body.match(/aria-live="/g) || []).length +
  (body.match(/role="(alert|status)"/g) || []).length;
if (liveRegions >= 3) pass('live regions present', liveRegions + ' regions');
else fail('almost nothing announces itself', liveRegions + ' live regions');

if (/announce\s*\(/.test(app)) pass('app.js has a way to speak to the reader — announce()');
else fail('no announce() helper, so view changes are silent');

// Moving focus to the new screen is what tells a reader the view changed.
if (/focusView|focusMainHeading|setFocusAfterNavigation/.test(app)) {
  pass('focus is moved on navigation');
} else {
  fail('focus is never moved on navigation, so the reader stays on the old screen');
}

console.log('\n5. the reader knows how to pronounce the page');
if (/<html[^>]*lang="he"/.test(html)) pass('lang is declared — he');
else fail('no lang, so Hebrew may be read with an English voice');
if (/<html[^>]*dir="rtl"/.test(html)) pass('direction is declared — rtl');
else fail('no dir');

// A skip link is how a keyboard or reader user gets past the header on every
// single screen instead of tabbing through it each time.
if (/skip-link|skipToContent/.test(body)) pass('a skip-to-content link exists');
else fail('no skip link, so the header is re-read on every screen');

console.log('\n' + (failures
  ? failures + ' of ' + checks + ' accessibility checks failed'
  : 'all ' + checks + ' accessibility checks passed'));
process.exit(failures ? 1 : 0);
