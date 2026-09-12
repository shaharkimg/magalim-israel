#!/usr/bin/env node
// Guards a real, shipped bug and its siblings: the map's bottom strip (the discovery
// carousel, or the destination preview card) is full-width and sits high in z-index
// (1040/1050), while several things that must stay reachable sat below it.
//
//   - the map buttons (z-index 1000, bottom 24px) — tapping "המיקום שלי" landed on a
//     destination card instead of the button, so the location control looked dead
//   - the toast (was z-index 60, bottom 88px) — EVERY message the app showed on the map
//     screen was painted underneath the carousel: errors and confirmations alike, which
//     is why a failing locate looked like nothing happening at all
//   - the install banner and the "back to your trip" pill (were z-index 900, same 88px)
//
// None of this is visible by reading the CSS — each rule is fine on its own, the bug is
// in how they stack at runtime — so it has to be hit-tested against a real layout.
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
// app-level floaters, all anchored at the same bottom:88px the carousel covers
const FLOATERS = ['toast', 'tripResume', 'installBanner'];

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
    // one at a time: all three are anchored to the same bottom:88px, so showing them
    // together would just occlude each other and say nothing about the carousel
    window.showFloater = id => {
      const t = document.getElementById('toast');
      t.classList.remove('show');
      t.style.pointerEvents = '';  // undo the probe override from a previous scenario
      document.getElementById('tripResume').classList.add('hidden');
      document.getElementById('installBanner').classList.add('hidden');
      if (id === 'toast') {
        t.innerHTML = '<span style="flex:1">לוקח יותר מדי זמן לאתר מיקום</span>';
        t.classList.add('show');
        // the toast is pointer-events:none by design, so elementFromPoint would always
        // look straight through it; the question here is purely what is PAINTED on top
        t.style.pointerEvents = 'auto';
      } else if (id === 'tripResume') {
        const el = document.getElementById('tripResume');
        el.textContent = 'חזרה למסע'; el.classList.remove('hidden');
      } else {
        document.getElementById('installBanner').classList.remove('hidden');
      }
    };
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
  const check = async (label, setup, ids) => {
    await page.evaluate(`(${setup.toString()})()`);
    await page.waitForTimeout(320); // the bottom + toast transitions
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
    }, ids);
    const ok = r.blocked.length === 0;
    if (!ok) failures++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — offset ${r.offset}${ok ? '' : '\n         covered: ' + r.blocked.join('; ')}`);
  };

  console.log('\nmap controls stay tappable under every bottom strip');
  for (const [name, setup] of scenarios) await check(name, setup, CONTROLS);

  console.log('\napp-level floaters stay visible over the bottom strip');
  const LABEL = { toast: 'toast (every message on the map screen)', tripResume: '"back to your trip" pill', installBanner: 'install banner' };
  for (const id of FLOATERS) {
    await check(`${LABEL[id]} — over a full carousel`,
      new Function(`window.bottomStrip('carousel', window.cards(6)); window.showFloater('${id}');`), [id]);
    await check(`${LABEL[id]} — over an open destination preview`,
      new Function(`window.bottomStrip('preview'); window.showFloater('${id}');`), [id]);
  }

  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nnothing is buried under the map\'s bottom strip\n');
  process.exit(failures ? 1 : 0);
})();
