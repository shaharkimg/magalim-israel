#!/usr/bin/env node
// Guards a real, shipped bug: the map's bottom strip (the discovery carousel, or the
// destination preview card) is full-width and sits above the map buttons in z-index,
// so tapping "המיקום שלי" landed on a destination card instead of the button — the
// location control looked dead. The fix raises the buttons above whatever strip is
// showing, measured from its real height, so this has to be checked by hit-testing a
// real layout rather than by reading the CSS.
//
// Needs Playwright + Chromium. Without them it skips loudly rather than failing, so it
// stays runnable in a bare checkout (this repo has no package.json by design).
//
// Run: node scripts/test_map_controls.js
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('SKIPPED — playwright is not installed here (npm i -D playwright)'); process.exit(0); }

const APP = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(APP, 'app.js'), 'utf8');
// the real helper, run inside the page against the real markup and CSS
const helper = src.slice(src.indexOf('const MAP_OVERLAY_INSET'), src.indexOf('function renderDiscoveryCarousel('));

const CONTROLS = ['locateBtn', 'zoomIn', 'zoomOut', 'zoomReset', 'diffLegendBtn'];

(async () => {
  const exe = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 780 }, hasTouch: true });
  // the app's CDN dependencies are not needed (and may be unreachable); block everything remote
  await page.route('**', r => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await page.goto('file://' + path.join(APP, 'index.html'), { waitUntil: 'domcontentloaded' });

  await page.evaluate(h => {
    window.$ = id => document.getElementById(id);
    (0, eval)(h + '; window.syncMapControlsOffset = syncMapControlsOffset;');
    document.querySelectorAll('.view').forEach(v => { v.classList.remove('active'); v.classList.add('hidden'); });
    const m = document.getElementById('view-map');
    m.classList.remove('hidden'); m.classList.add('active');
    document.getElementById('authScreen').classList.add('hidden');
    window.cards = n => [...Array(n)].map((_, i) => `
      <div class="discovery-card" data-id="c${i}" role="button" tabindex="0">
        <div class="discovery-card-thumb" style="background:#2D838C"><span class="discovery-card-pts">+30</span></div>
        <div class="discovery-card-name">יעד ${i}</div>
        <div class="discovery-card-facts">קל · שעתיים</div>
      </div>`).join('');
    window.bottomStrip = (mode, html) => {
      const section = document.getElementById('discoverySection');
      const preview = document.getElementById('destPreview');
      section.classList.toggle('hidden', mode !== 'carousel');
      preview.classList.toggle('open', mode === 'preview');
      if (html) document.getElementById('discoveryCarousel').innerHTML = html;
      syncMapControlsOffset();
    };
  }, helper);

  const scenarios = [
    ['carousel with cards', () => window.bottomStrip('carousel', window.cards(6))],
    ['carousel empty state', () => window.bottomStrip('carousel', '<div class="discovery-empty">אין יעדים באזור המוצג</div>')],
    ['destination preview open', () => window.bottomStrip('preview')],
    ['nothing at the bottom', () => window.bottomStrip('none')],
  ];

  let failures = 0;
  for (const [name, setup] of scenarios) {
    await page.evaluate(`(${setup.toString()})()`);
    await page.waitForTimeout(260); // the bottom transition
    const r = await page.evaluate(ids => {
      const out = { blocked: [] };
      for (const id of ids) {
        const el = document.getElementById(id);
        const box = el.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        if (!hit || !(hit === el || el.contains(hit))) {
          out.blocked.push(id + ' -> ' + (hit ? (hit.id || hit.className || hit.tagName) : 'nothing'));
        }
      }
      out.offset = getComputedStyle(document.getElementById('mapWrap')).getPropertyValue('--map-ctl-bottom').trim() || '(default)';
      return out;
    }, CONTROLS);
    const ok = r.blocked.length === 0;
    if (!ok) failures++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name} — offset ${r.offset}${ok ? '' : '\n         covered: ' + r.blocked.join('; ')}`);
  }

  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nevery map control is reachable\n');
  process.exit(failures ? 1 : 0);
})();
