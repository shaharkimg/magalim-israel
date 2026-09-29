#!/usr/bin/env node
// End-to-end smoke test in a real (headless) Chromium, against a fake Supabase.
//
// What it protects (each was a real risk found in the production-readiness audit):
//   - the app still boots and renders with a 1,500-landmark database (map performance)
//   - repeated map renders are incremental (no full marker rebuild on every preview/like)
//   - stored-XSS payloads in profile names / avatar URLs / photo URLs render as inert text
//   - check-in goes through the server RPC with the verified GPS fix and NO client-side points,
//     a double click sends one request, and server rejections show a friendly message
//   - a failed landmarks request falls back to the cached copy, or to a retry screen (never blank)
//
// Needs: playwright + leaflet@1.9.4 + leaflet.markercluster@1.5.3 + canvas-confetti@1.9.3 in
// node_modules (CI installs them; locally: npm i --no-save playwright leaflet@1.9.4 \
// leaflet.markercluster@1.5.3 canvas-confetti@1.9.3). Skips loudly when they are missing.
//
// Run: node scripts/test_app_smoke.js
const fs = require('fs');
const path = require('path');
const http = require('http');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.log('SKIPPED — playwright is not installed here'); process.exit(0); }
const ROOT = path.join(__dirname, '..');
const NM = p => path.join(ROOT, 'node_modules', p);
const vendor = {
  'leaflet.js': NM('leaflet/dist/leaflet.js'),
  'leaflet.css': NM('leaflet/dist/leaflet.css'),
  'leaflet.markercluster.js': NM('leaflet.markercluster/dist/leaflet.markercluster.js'),
  'MarkerCluster.css': NM('leaflet.markercluster/dist/MarkerCluster.css'),
  'MarkerCluster.Default.css': NM('leaflet.markercluster/dist/MarkerCluster.Default.css'),
  'confetti.browser.js': NM('canvas-confetti/dist/confetti.browser.js'),
};
if (!Object.values(vendor).every(fs.existsSync)) { console.log('SKIPPED — leaflet / markercluster / canvas-confetti are not in node_modules'); process.exit(0); }

// ---------- tiny static server for the repo ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
const appSrc = fs.readFileSync(process.env.SMOKE_APP_SRC || path.join(ROOT, 'app.js'), 'utf8');   // SMOKE_APP_SRC: compare against another build
// expose a few internals to the test (app.js is a module, so nothing is global)
const HOOKS = `\n;window.__t = { renderMap, openDetail, startCheckin, avatarInner, feedCardHtml, landmarkPhotoStyle, get lmById(){ return lmById; }, get LANDMARKS(){ return LANDMARKS; }, get myVisits(){ return myVisits; }, get clusterGroup(){ return clusterGroup; }, get markerCache(){ return typeof markerCache === 'undefined' ? new Map() : markerCache; }, switchView, toast };\n`;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = path.join(ROOT, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  let body = fs.readFileSync(file);
  if (path.basename(file) === 'app.js') body = appSrc + HOOKS;
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(body);
});

// ---------- fake supabase-js (served in place of esm.sh) ----------
const FAKE_SUPABASE = `
const F = () => window.__FAKE;
function tableRows(t){ const f = F(); return (f.tables[t] = f.tables[t] || []); }
function builder(table){
  let op = 'select', payload = null, filters = [], single = false, maybe = false, rng = null, lim = null, ord = null;
  const b = {
    select(){ return b; }, insert(p){ op = 'insert'; payload = p; return b; }, upsert(p){ op = 'upsert'; payload = p; return b; },
    update(p){ op = 'update'; payload = p; return b; }, delete(){ op = 'delete'; return b; },
    eq(c, v){ filters.push(r => r[c] === v); return b; }, in(c, a){ filters.push(r => a.includes(r[c])); return b; },
    is(c, v){ filters.push(r => (r[c] ?? null) === v); return b; }, not(){ return b; }, gte(){ return b; }, lte(){ return b; }, neq(){ return b; }, or(){ return b; }, ilike(){ return b; }, contains(){ return b; }, filter(){ return b; },
    order(c, o){ ord = [c, o]; return b; }, limit(n){ lim = n; return b; }, range(a, z){ rng = [a, z]; return b; },
    single(){ single = true; return b; }, maybeSingle(){ maybe = true; return b; },
    then(resolve, reject){
      const f = F();
      f.calls.push({ table, op, payload });
      let result;
      if (table === 'landmarks' && f.failLandmarks) { result = { data: null, error: { message: 'Failed to fetch' } }; }
      else {
        let rows = tableRows(table);
        if (op === 'insert' || op === 'upsert') { const arr = [].concat(payload); rows.push(...arr); rows = arr; }
        rows = rows.filter(r => filters.every(fn => fn(r)));
        if (rng) rows = rows.slice(rng[0], rng[1] + 1);
        if (lim != null) rows = rows.slice(0, lim);
        result = { data: single || maybe ? (rows[0] || null) : rows, error: null, count: rows.length };
      }
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return b;
}
export function createClient(){
  const listeners = [];
  return {
    from: builder,
    rpc(name, args){
      const f = F(); f.rpcCalls.push({ name, args });
      const h = f.rpc[name];
      const out = typeof h === 'function' ? h(args) : (h !== undefined ? h : null);
      return Promise.resolve(out instanceof Promise ? out : { data: out, error: null });
    },
    auth: {
      onAuthStateChange(cb){ listeners.push(cb); setTimeout(() => cb('INITIAL_SESSION', F().session), 0); return { data: { subscription: { unsubscribe(){} } } }; },
      signOut(){ return Promise.resolve({ error: null }); }, signUp(){ return Promise.resolve({ data: {}, error: null }); },
      signInWithPassword(){ return Promise.resolve({ data: {}, error: null }); }, signInWithOAuth(){ return Promise.resolve({ data: {}, error: null }); },
      resetPasswordForEmail(){ return Promise.resolve({ error: null }); }, updateUser(){ return Promise.resolve({ error: null }); },
    },
    storage: { from(bucket){ return {
      upload(p){ F().uploads.push(p); return Promise.resolve({ error: null }); },
      getPublicUrl(p){ return { data: { publicUrl: 'https://abc.supabase.co/storage/v1/object/public/' + bucket + '/' + p } }; },
    }; } },
    channel(){ const c = { on(){ return c; }, subscribe(){ return c; } }; return c; },
    removeChannel(){},
  };
}`;

// 1,500 landmarks spread across Israel with realistic attributes
function makeLandmarks(n) {
  const cats = ['water', 'archaeology', 'heritage', 'viewpoints', 'religious', 'urban', 'mountains', 'nature', 'parks', 'reserves'];
  const regs = ['north', 'center', 'jerusalem', 'south', 'deadsea', 'eilat'];
  const diffs = ['easy', 'medium', 'hard', 'extreme'];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: n }, (_, i) => ({
    id: 'lm' + i, name: 'יעד ' + i, description: 'תיאור ' + i, category: cats[i % cats.length], difficulty: diffs[i % 4], region: regs[i % 6],
    lat: 29.6 + rnd() * 3.6, lon: 34.3 + rnd() * 1.6, duration: 'שעה', distance_km: Math.round(rnd() * 80) / 10, base_visits: Math.floor(rnd() * 5000),
    family_friendly: i % 3 === 0, dog_friendly: false, accessible: i % 5 === 0, has_water: i % 4 === 0, price_type: 'free', season: null, duration_hours: null,
  }));
}

let failures = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failures++; };

async function newPage(browser, base, fake, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 780 }, hasTouch: true, serviceWorkers: 'block',
    geolocation: opts.geo || undefined, permissions: opts.geo ? ['geolocation'] : [],
    storageState: opts.storageState,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  if (process.env.SMOKE_DEBUG) page.on('console', m => console.log('   [console]', m.type(), m.text().slice(0, 200)));
  page.on('dialog', d => { errors.push('DIALOG: ' + d.message()); d.dismiss(); });
  await page.route('**', async route => {
    const u = route.request().url();
    if (u.startsWith(base)) return route.continue();
    if (u.includes('esm.sh/@supabase')) return route.fulfill({ contentType: 'text/javascript', body: FAKE_SUPABASE });
    const v = Object.keys(vendor).find(k => u.endsWith('/' + k));
    if (v) return route.fulfill({ contentType: v.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(vendor[v]) });
    return route.abort();
  });
  await page.addInitScript(f => { window.__FAKE = f; }, fake);
  return { ctx, page, errors };
}

function baseFake(landmarks, extra) {
  const uid = '11111111-1111-1111-1111-111111111111';
  return Object.assign({
    calls: [], rpcCalls: [], uploads: [],
    session: { access_token: 't', user: { id: uid, email: 'me@example.com', user_metadata: { name: 'אני' } } },
    tables: {
      landmarks, profiles: [{ id: uid, name: 'אני', avatar_url: null, is_admin: false, account_status: 'active', onboarding_completed: true, notification_prefs: {}, travel_preferences: {}, activity_visibility: 'friends_groups' }],
      app_settings: [{ id: 1, default_invites_per_user: 3 }],
    },
    rpc: { get_registration_status: { registration_enabled: true, invite_only: false, is_full: false } },
    failLandmarks: false,
  }, extra || {});
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = 'http://localhost:' + server.address().port;
  const exe = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const landmarks = makeLandmarks(1500);
  const seenOnboarding = { cookies: [], origins: [{ origin: base, localStorage: [{ name: 'onboarding_done_v1', value: '1' }, { name: 'magalim-welcome-seen', value: '1' }] }] };

  try {
    // ---------------------------------------------------------------- 1. boot + map performance
    console.log('\n1. boots with 1,500 landmarks; map renders incrementally');
    {
      const fake = baseFake(landmarks);
      const { ctx, page, errors } = await newPage(browser, base, fake, { storageState: seenOnboarding });
      await page.goto(base + '/#/map', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__t && window.__t.LANDMARKS && window.__t.LANDMARKS.length === 1500 && document.getElementById('loadingScreen').classList.contains('hidden'), null, { timeout: 20000 });
      check('app boots, loading screen dismissed', true);
      check('no uncaught page errors during boot', errors.length === 0, errors.join(' | '));
      const perf = await page.evaluate(() => {
        const t = window.__t; const time = fn => { const s = performance.now(); fn(); return performance.now() - s; };
        t.switchView('map');
        const first = time(() => t.renderMap());
        const cachedBefore = t.markerCache.size;
        const idsBefore = [...t.markerCache.values()].slice(0, 5).map(e => e.marker);
        const again = [];
        for (let i = 0; i < 5; i++) again.push(time(() => t.renderMap()));
        const sameMarkers = [...t.markerCache.values()].slice(0, 5).every((e, i) => e.marker === idsBefore[i]);
        return { first, again: Math.max(...again), cachedBefore, sameMarkers, layers: t.clusterGroup.getLayers().length };
      });
      check('every landmark has one marker in the cluster group', perf.layers === 1500, `${perf.layers} layers`);
      check('markers are reused across renders', perf.sameMarkers);
      check('repeat render (unchanged list) is cheap', perf.again < 120, `${perf.again.toFixed(1)} ms worst of 5 (first render ${perf.first.toFixed(0)} ms)`);
      const toggle = await page.evaluate(() => {
        const t = window.__t; const l = t.LANDMARKS[3];
        const s = performance.now(); t.myVisits.push({ landmark_id: l.id, visited_at: new Date().toISOString() }); t.renderMap(); return performance.now() - s;
      });
      check('marking one landmark visited re-renders one icon, quickly', toggle < 150, `${toggle.toFixed(1)} ms`);
      await ctx.close();
    }

    // ---------------------------------------------------------------- 2. stored XSS is inert
    console.log('\n2. hostile profile / photo data renders as inert text');
    {
      const fake = baseFake(landmarks);
      const { ctx, page, errors } = await newPage(browser, base, fake, { storageState: seenOnboarding });
      await page.goto(base + '/#/home', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__t && window.__t.LANDMARKS.length === 1500);
      const result = await page.evaluate(() => {
        const t = window.__t;
        const evilAvatar = 'https://x.co/a.png" onerror="window.__pwned=1" x="';
        const evilName = '<img src=x onerror="window.__pwned=2">';
        const evilPhoto = "https://x.co/p.jpg');background:url('https://evil.example/track";
        const entityPhoto = 'https://x.supabase.co/storage/v1/object/public/checkin-photos/u/a&#39;&#41;;position:fixed;inset:0;background:red;x:&#40;&#39;.jpg';
        const box = document.createElement('div');
        box.innerHTML = t.avatarInner(evilName, evilAvatar) + t.avatarInner(evilName, null)
          + t.feedCardHtml({ id: 'v1', landmark_id: 'lm1', visited_at: new Date().toISOString(), photo_url: evilPhoto, note: evilName, profiles: { name: evilName, avatar_url: evilAvatar }, likes: [] })
          + t.feedCardHtml({ id: 'v2', landmark_id: 'lm2', visited_at: new Date().toISOString(), photo_url: entityPhoto, note: null, profiles: { name: 'x', avatar_url: null }, likes: [] });
        document.body.appendChild(box);
        const withHandlers = box.querySelectorAll('[onerror],[onload],[onclick]').length;
        const imgs = [...box.querySelectorAll('img')].map(i => i.getAttribute('src'));
        const photoStyle = box.querySelector('.feed-photo') ? box.querySelector('.feed-photo').getAttribute('style') : '';
        const overlays = [...box.querySelectorAll('.feed-photo')].filter(e => getComputedStyle(e).position === 'fixed').length;
        return { withHandlers, imgs, photoStyle, overlays, pwned: window.__pwned || 0, styleHasSecondUrl: /evil\.example/.test(photoStyle) && /background:url/.test(photoStyle.replace(/%[0-9A-F]{2}/g, '')) };
      });
      await page.waitForTimeout(300);
      check('no elements with injected event handlers', result.withHandlers === 0);
      check('script from names/avatars/photos never ran', result.pwned === 0 && (await page.evaluate(() => window.__pwned || 0)) === 0);
      check('hostile avatar URL never becomes an <img>', result.imgs.length === 0, JSON.stringify(result.imgs));
      check('hostile photo URL cannot inject extra CSS', !result.styleHasSecondUrl);
      check('entity-encoded CSS breakout cannot restyle the card', result.overlays === 0);
      check('no dialogs / page errors', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // ---------------------------------------------------------------- 3. check-in via the server
    console.log('\n3. check-in is verified and scored by the server');
    {
      const target = landmarks[10];
      let resolveRpc; let calls = 0;
      const fake = baseFake(landmarks);
      fake.rpc.checkin_landmark = () => 'PENDING';   // replaced below in page
      const { ctx, page, errors } = await newPage(browser, base, fake, { storageState: seenOnboarding });
      // deterministic in-page GPS (Chromium's emulated provider stalls one-shot requests while a watch is active)
      await page.addInitScript(pos => {
        const fix = { coords: { latitude: pos.lat, longitude: pos.lon, accuracy: 20, altitude: null, heading: null, speed: null }, timestamp: Date.now() };
        Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
          getCurrentPosition: ok => setTimeout(() => ok(fix), 20), watchPosition: ok => { setTimeout(() => ok(fix), 20); return 1; }, clearWatch() {} } });
      }, { lat: target.lat, lon: target.lon });
      await page.addInitScript(() => {
        window.__FAKE.rpc.checkin_landmark = args => new Promise(resolve => {
          window.__checkinArgs = (window.__checkinArgs || []).concat([args]);
          setTimeout(() => resolve({ data: window.__checkinResponse, error: null }), 80);
        });
        window.__checkinResponse = { ok: true, already: false, first_conquest: true, base_xp: 20, total_granted: 40,
          bonuses: [{ type: 'first_destination', xp: 10 }, { type: 'new_region', xp: 5 }, { type: 'new_category', xp: 5 }],
          visit: { id: 'v-new', user_id: '11111111-1111-1111-1111-111111111111', landmark_id: 'lm10', visited_at: new Date().toISOString(), photo_url: null, points_awarded: 40 } };
      });
      await page.goto(base + '/#/map', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__t && window.__t.LANDMARKS.length === 1500 && document.getElementById('loadingScreen').classList.contains('hidden'));
      await page.evaluate(() => window.__t.startCheckin(window.__t.lmById['lm10']));
      await page.waitForSelector('#photoStep:not(.hidden)', { timeout: 10000 }).catch(async e => { console.log('  status:', await page.evaluate(() => document.getElementById('gpsStatus') && document.getElementById('gpsStatus').innerText), errors.join(' | ')); throw e; });
      check('GPS verification unlocks the confirm button', true);
      await page.dblclick('#confirmCheckin');   // double click on purpose
      await page.waitForTimeout(600);
      const args = await page.evaluate(() => window.__checkinArgs || []);
      check('double click sends exactly one server request', args.length === 1, `${args.length} calls`);
      check('request carries the verified GPS fix', args[0] && Math.abs(args[0].p_lat - target.lat) < 0.001 && Math.abs(args[0].p_lon - target.lon) < 0.001 && args[0].p_accuracy != null);
      check('request contains no client-computed points', args[0] && !Object.keys(args[0]).some(k => /point|xp|score/i.test(k)));
      const writes = await page.evaluate(() => window.__FAKE.calls.filter(c => ['visits', 'landmark_conquests', 'xp_bonus_grants'].includes(c.table) && c.op !== 'select'));
      check('client wrote nothing directly to visits / conquests / bonuses', writes.length === 0, JSON.stringify(writes));
      const celebration = await page.evaluate(() => document.body.innerText);
      check('celebration shows the server-decided points and bonuses', /עוד מקום נכבש/.test(celebration) && /40/.test(celebration) && /יעד ראשון/.test(celebration), celebration.match(/עוד מקום נכבש|סה"כ[^\n]*/g) + '');

      // server rejection -> friendly message, sheet stays usable
      await page.evaluate(() => { window.__checkinResponse = { ok: false, error: 'too_far' }; document.querySelectorAll('.celebrate-overlay').forEach(e => e.remove()); });
      await page.evaluate(() => { window.__t.myVisits.length = 0; window.__t.startCheckin(window.__t.lmById['lm11']); });
      await page.waitForSelector('#photoStep:not(.hidden)', { timeout: 10000 }).catch(() => {});
      const rejected = await page.evaluate(() => document.getElementById('gpsStatus') && document.getElementById('gpsStatus').className);
      check('a landmark far from the GPS fix cannot be confirmed', /bad/.test(rejected || ''), rejected);
      check('failed verification offers a retry button', await page.$('#gpsRetryBtn') !== null);
      check('no uncaught page errors during check-in', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // ---------------------------------------------------------------- 4. resilience
    console.log('\n4. failed landmark load: cached copy, or a retry screen (never blank)');
    {
      // (a) first visit succeeds and fills the cache
      const fake = baseFake(landmarks);
      const a = await newPage(browser, base, fake, { storageState: seenOnboarding });
      await a.page.goto(base + '/#/map', { waitUntil: 'domcontentloaded' });
      await a.page.waitForFunction(() => window.__t && window.__t.LANDMARKS.length === 1500);
      await a.page.waitForFunction(() => !!localStorage.getItem('magalim-landmarks-cache-v1'), null, { timeout: 8000 }).catch(() => {});
      check('landmarks cached locally after a successful load', await a.page.evaluate(() => !!localStorage.getItem('magalim-landmarks-cache-v1')));
      const state = await a.ctx.storageState();
      await a.ctx.close();
      // (b) second visit: server down -> cached list
      const down = baseFake(landmarks, { failLandmarks: true });
      const b = await newPage(browser, base, down, { storageState: state });
      await b.page.goto(base + '/#/map', { waitUntil: 'domcontentloaded' });
      await b.page.waitForFunction(() => window.__t && window.__t.LANDMARKS.length === 1500, null, { timeout: 20000 });
      check('app still shows all places from the cache when the server is unreachable', true);
      await b.ctx.close();
      // (c) no cache and server down -> explicit error with retry
      const c = await newPage(browser, base, baseFake(landmarks, { failLandmarks: true }), { storageState: seenOnboarding });
      await c.page.goto(base + '/#/map', { waitUntil: 'domcontentloaded' });
      await c.page.waitForSelector('#bootRetryBtn', { timeout: 20000 });
      const msg = await c.page.evaluate(() => document.getElementById('loadingScreen').innerText);
      check('retry screen instead of a blank page', /נסו שוב/.test(msg) && !/Failed to fetch|undefined|null/.test(msg), msg.replace(/\s+/g, ' ').slice(0, 100));
      await c.ctx.close();
    }

    // ---------------------------------------------------------------- 5. offline queue sync
    console.log('\n5. offline check-ins sync safely after reconnect');
    {
      const uid = '11111111-1111-1111-1111-111111111111', target = landmarks[10];
      const ts = new Date(Date.now() - 3600e3).toISOString();
      const queue = [
        { uid, landmarkId: 'lm10', ts, lat: target.lat, lon: target.lon, accuracy: 15, note: 'offline hi', dataUrl: null },
        { uid: '99999999-9999-9999-9999-999999999999', landmarkId: 'lm11', ts, lat: 1, lon: 1, accuracy: 5, dataUrl: null },   // someone else's, same device
        { uid, landmarkId: 'lm12', ts, dataUrl: null },                                                                            // legacy item, no verified fix
      ];
      const state = { cookies: [], origins: [{ origin: base, localStorage: [...seenOnboarding.origins[0].localStorage, { name: 'magalim-pending-checkins-v1', value: JSON.stringify(queue) }] }] };
      const fake = baseFake(landmarks);
      const { ctx, page, errors } = await newPage(browser, base, fake, { storageState: state });
      await page.addInitScript(() => {
        window.__FAKE.rpc.checkin_landmark = args => { window.__syncArgs = (window.__syncArgs || []).concat([args]); return Promise.resolve({ data: { ok: true, already: false, first_conquest: true, base_xp: 10, total_granted: 10, bonuses: [], visit: { id: 'v1', landmark_id: args.p_landmark_id } }, error: null }); };
      });
      await page.goto(base + '/#/map', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => (window.__syncArgs || []).length > 0, null, { timeout: 20000 });
      await page.waitForTimeout(500);
      const sent = await page.evaluate(() => window.__syncArgs);
      check('only the signed-in user\'s verified item is sent', sent.length === 1 && sent[0].p_landmark_id === 'lm10', JSON.stringify(sent.map(s => s.p_landmark_id)));
      check('original capture time and fix are preserved', sent[0].p_client_ts === ts && Math.abs(sent[0].p_lat - target.lat) < 1e-9 && sent[0].p_note === 'offline hi');
      const left = await page.evaluate(() => JSON.parse(localStorage.getItem('magalim-pending-checkins-v1') || '[]'));
      check('synced + unverifiable items leave the queue, other users\' items stay', left.length === 1 && left[0].landmarkId === 'lm11', JSON.stringify(left.map(l => l.landmarkId)));
      check('no uncaught page errors during sync', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failures ? `\n${failures} check(s) failed` : '\nall smoke checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
