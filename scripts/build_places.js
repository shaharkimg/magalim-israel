#!/usr/bin/env node
// Builds a static, crawlable HTML page for every landmark, a page per region, a hub page,
// and the sitemap — so Google can index each place on its own ("עין חמד", "בריכת צנאן"…).
//
// The app itself routes with "#/destination/<id>", and Google never indexes anything after
// a "#". These pages are the indexable counterpart: plain HTML, no JS, each one linking into
// the app (/#/destination/<id>) for the full experience.
//
//   node scripts/build_places.js                    fetch from Supabase (anon key, public data)
//   node scripts/build_places.js --from rows.json   build from a JSON array of landmark rows
//   node scripts/build_places.js --out <dir>        write somewhere other than the repo root
//
// GENERATED OUTPUT — do not edit by hand: places/, regions/ and sitemap.xml are wiped and
// rewritten on every run. Runs daily in GitHub Actions (.github/workflows/places.yml).
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SITE = 'https://www.megalim-israel.co.il';
// Refuse to publish if the database hands back far fewer places than expected — an outage or
// an RLS change must not wipe a thousand indexed pages.
const MIN_ROWS = 100;

const args = process.argv.slice(2);
const argVal = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const OUT = path.resolve(argVal('--out') || root);
const FROM = argVal('--from');

// Labels mirror app.js (CATEGORIES, REGIONS, REGION_THE, DIFF_TIERS, SEASON_LABEL).
const CATEGORIES = {
  nature: 'טבע ונופים', mountains: 'מסלולי הרים', water: 'מים ומעיינות', heritage: 'מורשת והיסטוריה',
  archaeology: 'ארכיאולוגיה', viewpoints: 'תצפיות', religious: 'אתרים דתיים', parks: 'פארקים לאומיים',
  reserves: 'שמורות טבע', urban: 'אתרים אורבניים',
};
const REGIONS = { north: 'צפון', center: 'מרכז', jerusalem: 'ירושלים', south: 'דרום', deadsea: 'ים המלח', eilat: 'אילת' };
const REGION_THE = { north: 'הצפון', center: 'המרכז', jerusalem: 'ירושלים', south: 'הדרום', deadsea: 'ים המלח', eilat: 'אילת' };
const REGION_ORDER = ['north', 'center', 'jerusalem', 'south', 'deadsea', 'eilat'];
const DIFFICULTY = { easy: 'קל', medium: 'בינוני', hard: 'מאתגר', extreme: 'קשה' };
const SEASON = { spring: 'אביב', summer: 'קיץ', autumn: 'סתיו', winter: 'חורף' };

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
// JSON inside <script type="application/ld+json">: "</script>" in a description must not end the block
const jsonLd = obj => JSON.stringify(obj).replace(/</g, '\\u003c');
const safeUrl = u => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u)) ? u : null;
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const placeUrl = id => `/places/${id}/`;
const regionUrl = r => `/regions/${r}/`;

function haversineKm(a, b) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtKm = km => km < 1 ? `${Math.round(km * 1000)} מ'` : `${km < 10 ? km.toFixed(1) : Math.round(km)} ק"מ`;

async function fetchRows() {
  const cfg = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const url = (cfg.match(/SUPABASE_URL = "([^"]+)"/) || [])[1];
  const key = (cfg.match(/SUPABASE_ANON_KEY = "([^"]+)"/) || [])[1];
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY not found in config.js');
  const cols = 'id,name,description,category,difficulty,region,lat,lon,duration,distance_km,family_friendly,dog_friendly,accessible,has_water,price_type,season,official_url,stock_photo_url,stock_photo_credit';
  const rows = [], PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/landmarks?select=${cols}&order=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + PAGE - 1}` },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

function normalize(rows) {
  const out = [], seen = new Set();
  for (const r of rows) {
    if (!r || r.lat == null || r.lon == null || r.lat === '' || r.lon === '') continue;  // Number(null) is 0, not NaN
    const lat = Number(r.lat), lon = Number(r.lon);
    if (!r || typeof r.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(r.id) || seen.has(r.id)) continue;
    if (!r.name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (!REGIONS[r.region]) continue;
    seen.add(r.id);
    out.push({ ...r, lat, lon, name: String(r.name).trim(), description: String(r.description || '').trim() });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'he'));
}

const CSS = `:root{--bg:#F7F5EF;--surface:#fff;--text:#202622;--muted:#5F6762;--border:#E4E1D8;--primary:#1E7A50;--primary-dark:#145C3C;--primary-light:#E5F0EC;--ink:#fff;--radius:18px}
@media (prefers-color-scheme:dark){:root{--bg:#171E1A;--surface:#242D27;--text:#F1F3EE;--muted:#A9B3AC;--border:#374039;--primary:#4CBB88;--primary-dark:#63CC9D;--primary-light:#1D3A32;--ink:#0B211B}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 Heebo,system-ui,-apple-system,"Segoe UI",Arial,sans-serif}
a{color:var(--primary-dark)}
.wrap{max-width:760px;margin:0 auto;padding:0 16px}
.top{background:var(--surface);border-bottom:1px solid var(--border)}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:60px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text);font-weight:800;font-size:20px}
.brand img{width:36px;height:36px;border-radius:10px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:10px 18px;border-radius:14px;font-weight:700;text-decoration:none;border:1px solid var(--border);background:var(--surface);color:var(--text)}
.btn-primary{background:var(--primary);border-color:var(--primary);color:var(--ink)}
.crumbs{font-size:14px;color:var(--muted);margin:18px 0 6px}.crumbs a{color:var(--muted)}
h1{font-size:30px;line-height:1.25;margin:4px 0 12px}h2{font-size:21px;margin:32px 0 12px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px;padding:0;list-style:none}
.chips li{background:var(--primary-light);color:var(--primary-dark);border-radius:999px;padding:4px 12px;font-size:14px;font-weight:600}
figure{margin:0 0 18px}figure img{width:100%;max-height:420px;object-fit:cover;border-radius:var(--radius);display:block;background:var(--border)}
figcaption{font-size:12.5px;color:var(--muted);margin-top:6px}
.lead{font-size:18px}
.facts{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin:18px 0}
.facts dt{color:var(--muted)}.facts dd{margin:0;font-weight:600}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}
.list{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.list a{display:flex;justify-content:space-between;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;text-decoration:none;color:var(--text)}
.list .sub{color:var(--muted);font-size:14px;white-space:nowrap}
.cols{columns:2 220px;column-gap:24px;padding:0;list-style:none}.cols li{break-inside:avoid;padding:3px 0}
.cta{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin:32px 0}
.cta p{margin:0 0 12px}
footer{border-top:1px solid var(--border);margin-top:40px;padding:20px 0 32px;color:var(--muted);font-size:14px}
footer a{color:var(--muted);margin-inline-end:12px}
h2 .sub{font-weight:400;color:var(--muted);font-size:16px}
@media (max-width:520px){h1{font-size:25px}.facts{gap:6px 12px;padding:14px}.top .btn{min-height:40px;padding:8px 14px}}
`;

function layout({ title, description, canonical, image, body, ld }) {
  const img = image || `${SITE}/icon-512.png`;
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(SITE + canonical)}">
<link rel="icon" type="image/png" href="/logo.png">
<meta name="theme-color" content="#1E7A50">
<meta property="og:type" content="website">
<meta property="og:site_name" content="מגלים">
<meta property="og:locale" content="he_IL">
<meta property="og:url" content="${esc(SITE + canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/places/places.css">
${ld.map(o => `<script type="application/ld+json">${jsonLd(o)}</script>`).join('\n')}
</head>
<body>
<header class="top"><div class="wrap">
<a class="brand" href="/"><img src="/icon-192.png" alt="" width="36" height="36">מגלים</a>
<a class="btn btn-primary" href="/">לאפליקציה</a>
</div></header>
<main class="wrap">
${body}
</main>
<footer><div class="wrap">
<p><a href="/places/">כל היעדים</a>${REGION_ORDER.map(r => `<a href="${regionUrl(r)}">${esc(REGIONS[r])}</a>`).join('')}</p>
<p>מגלים – מפת טיולים חברתית לישראל. המידע נועד להשראה; לפני יציאה כדאי לבדוק שעות פתיחה, תנאי שטח ומזג אוויר.</p>
</div></footer>
</body>
</html>
`;
}

const crumbsLd = items => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + url })),
});
const crumbsHtml = items => `<nav class="crumbs" aria-label="פירורי לחם">${items.map(([name, url], i) =>
  i === items.length - 1 ? `<span aria-current="page">${esc(name)}</span>` : `<a href="${url}">${esc(name)}</a>`).join(' › ')}</nav>`;

function placePage(l, all) {
  const cat = CATEGORIES[l.category] || 'יעד טיול';
  const region = REGIONS[l.region], regionThe = REGION_THE[l.region];
  const photo = safeUrl(l.stock_photo_url);
  const official = safeUrl(l.official_url);
  const km = Number(l.distance_km);
  const free = l.price_type !== 'paid';

  const suits = [l.family_friendly && 'משפחות', l.dog_friendly && 'כלבים', l.accessible && 'נגיש', l.has_water && 'יש מים'].filter(Boolean);
  const facts = [
    ['אזור', region], ['סוג', cat],
    DIFFICULTY[l.difficulty] && ['רמת קושי', DIFFICULTY[l.difficulty]],
    l.duration && ['משך', l.duration],
    km > 0 && ['אורך מסלול', `כ-${km} ק"מ`],
    ['כניסה', free ? 'חינם' : 'בתשלום'],
    SEASON[l.season] && ['עונה מומלצת', SEASON[l.season]],
    suits.length && ['מתאים ל', suits.join(' · ')],
  ].filter(Boolean);
  const chips = [region, cat, DIFFICULTY[l.difficulty] && `רמת קושי: ${DIFFICULTY[l.difficulty]}`, free ? 'כניסה חינם' : null,
    l.family_friendly && 'מתאים למשפחות', l.dog_friendly && 'מותר עם כלבים'].filter(Boolean);

  const nearby = all.filter(o => o.id !== l.id).map(o => ({ o, d: haversineKm(l, o) }))
    .sort((a, b) => a.d - b.d).slice(0, 8);

  const descText = l.description || `${l.name} – ${cat} ב${regionThe}.`;
  const metaDesc = clip(`${l.name} – ${cat} ב${regionThe}. ${l.description && !l.description.startsWith(l.name) ? l.description + ' ' : ''}`
    + `${DIFFICULTY[l.difficulty] ? `רמת קושי ${DIFFICULTY[l.difficulty]}, ` : ''}${free ? 'כניסה חינם' : 'כניסה בתשלום'}. ניווט, פרטים ויעדים קרובים במגלים.`, 160);
  const title = `${l.name} – ${cat} ב${regionThe} | מגלים`;
  const crumbs = [['מגלים', '/'], ['יעדים', '/places/'], [region, regionUrl(l.region)], [l.name, placeUrl(l.id)]];
  const appLink = `/#/destination/${encodeURIComponent(l.id)}`;
  const waze = `https://waze.com/ul?q=${encodeURIComponent(l.name)}&ll=${l.lat},${l.lon}&navigate=yes`;
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lon}`;

  const body = `${crumbsHtml(crumbs)}
<article>
<h1>${esc(l.name)}</h1>
<ul class="chips">${chips.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
${photo ? `<figure><img src="${esc(photo)}" alt="${esc(l.name)}" loading="eager" decoding="async">${l.stock_photo_credit ? `<figcaption>צילום: ${esc(l.stock_photo_credit)}</figcaption>` : ''}</figure>` : ''}
<p class="lead">${esc(descText)}</p>
<dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
<div class="actions">
<a class="btn btn-primary" href="${appLink}">פתיחה במפה של מגלים</a>
<a class="btn" href="${esc(waze)}" rel="nofollow noopener" target="_blank">ניווט ב-Waze</a>
<a class="btn" href="${esc(gmaps)}" rel="nofollow noopener" target="_blank">Google Maps</a>
${official ? `<a class="btn" href="${esc(official)}" rel="noopener" target="_blank">אתר רשמי</a>` : ''}
</div>
</article>
<section>
<h2>יעדים קרובים ל${esc(l.name)}</h2>
<ul class="list">${nearby.map(({ o, d }) => `<li><a href="${placeUrl(o.id)}"><span>${esc(o.name)}</span><span class="sub">${esc(CATEGORIES[o.category] || '')} · ${fmtKm(d)}</span></a></li>`).join('')}</ul>
<p><a href="${regionUrl(l.region)}">כל היעדים ב${esc(regionThe)} ←</a></p>
</section>
<aside class="cta">
<p><strong>טיילתם ב${esc(l.name)}?</strong> במגלים עושים צ'ק-אין במקום, צוברים נקודות ותגים, ורואים לאן החברים שלכם יצאו.</p>
<a class="btn btn-primary" href="${appLink}">לצ'ק-אין במגלים</a>
</aside>`;

  const attraction = {
    '@context': 'https://schema.org', '@type': 'TouristAttraction',
    name: l.name, description: descText, url: SITE + placeUrl(l.id),
    geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lon },
    isAccessibleForFree: free,
    containedInPlace: { '@type': 'AdministrativeArea', name: `${region}, ישראל` },
  };
  if (photo) attraction.image = photo;
  if (official) attraction.sameAs = official;
  return layout({ title, description: metaDesc, canonical: placeUrl(l.id), image: photo, body, ld: [attraction, crumbsLd(crumbs)] });
}

function regionPage(r, list) {
  const the = REGION_THE[r];
  const byCat = {};
  for (const l of list) (byCat[l.category] = byCat[l.category] || []).push(l);
  const cats = Object.keys(byCat).sort((a, b) => byCat[b].length - byCat[a].length);
  const catNames = cats.slice(0, 4).map(c => CATEGORIES[c]).filter(Boolean).join(', ');
  const crumbs = [['מגלים', '/'], ['יעדים', '/places/'], [REGIONS[r], regionUrl(r)]];
  const body = `${crumbsHtml(crumbs)}
<h1>יעדי טיול ב${esc(the)}</h1>
<p class="lead">${list.length} מקומות לטייל בהם ב${esc(the)} – ${esc(catNames)} ועוד. לכל מקום יש דף עם פרטים, ניווט ויעדים קרובים.</p>
<div class="actions"><a class="btn btn-primary" href="/#/map">לכל היעדים על המפה</a></div>
${cats.map(c => `<section><h2>${esc(CATEGORIES[c] || 'עוד יעדים')} <span class="sub">(${byCat[c].length})</span></h2>
<ul class="cols">${byCat[c].map(l => `<li><a href="${placeUrl(l.id)}">${esc(l.name)}</a></li>`).join('')}</ul></section>`).join('\n')}`;
  return layout({
    title: `יעדי טיול ב${the} – ${list.length} מקומות | מגלים`,
    description: clip(`${list.length} יעדי טיול ב${the}: ${catNames}. פרטים, ניווט ויעדים קרובים לכל מקום – במגלים, מפת הטיולים של ישראל.`, 160),
    canonical: regionUrl(r), body, ld: [crumbsLd(crumbs)],
  });
}

function hubPage(byRegion, total) {
  const crumbs = [['מגלים', '/'], ['יעדים', '/places/']];
  const body = `${crumbsHtml(crumbs)}
<h1>יעדי טיול בישראל</h1>
<p class="lead">${total} מקומות לטייל בהם – מעיינות, שמורות טבע, גנים לאומיים, תצפיות ואתרי מורשת, מהגולן ועד אילת.</p>
<ul class="list">${REGION_ORDER.filter(r => byRegion[r]).map(r => `<li><a href="${regionUrl(r)}"><span>${esc(REGIONS[r])}</span><span class="sub">${byRegion[r].length} יעדים</span></a></li>`).join('')}</ul>
<aside class="cta"><p><strong>מגלים</strong> היא מפת טיולים חברתית: עושים צ'ק-אין במקומות, צוברים נקודות ותגים ומתחרים עם חברים.</p>
<a class="btn btn-primary" href="/">לאפליקציה</a></aside>`;
  return layout({
    title: `יעדי טיול בישראל – ${total} מקומות לפי אזור | מגלים`,
    description: clip(`${total} יעדי טיול בישראל לפי אזור: צפון, מרכז, ירושלים, דרום, ים המלח ואילת. מעיינות, שמורות, גנים לאומיים ותצפיות.`, 160),
    canonical: '/places/', body, ld: [crumbsLd(crumbs)],
  });
}

function sitemap(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${esc(SITE + u)}</loc></url>`).join('\n')}
</urlset>
`;
}

function writeFile(rel, content) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

async function main() {
  const raw = FROM ? JSON.parse(fs.readFileSync(FROM, 'utf8')) : await fetchRows();
  const all = normalize(Array.isArray(raw) ? raw : []);
  if (all.length < MIN_ROWS && !args.includes('--allow-few')) {
    throw new Error(`only ${all.length} valid landmarks (expected at least ${MIN_ROWS}) — refusing to overwrite the pages`);
  }
  for (const dir of ['places', 'regions']) fs.rmSync(path.join(OUT, dir), { recursive: true, force: true });

  const byRegion = {};
  for (const l of all) (byRegion[l.region] = byRegion[l.region] || []).push(l);

  writeFile('places/places.css', CSS);
  writeFile('places/index.html', hubPage(byRegion, all.length));
  for (const r of REGION_ORDER) if (byRegion[r]) writeFile(`regions/${r}/index.html`, regionPage(r, byRegion[r]));
  for (const l of all) writeFile(`places/${l.id}/index.html`, placePage(l, all));

  const urls = ['/', '/places/', ...REGION_ORDER.filter(r => byRegion[r]).map(regionUrl), ...all.map(l => placeUrl(l.id))];
  writeFile('sitemap.xml', sitemap(urls));
  console.log(`built ${all.length} place pages, ${Object.keys(byRegion).length} region pages, sitemap with ${urls.length} URLs`);
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
