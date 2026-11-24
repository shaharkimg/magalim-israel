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

// Labels mirror app.js (CATEGORIES, REGIONS, DIFF_TIERS, SEASON_LABEL).
const CATEGORIES = {
  nature: 'טבע ונופים', mountains: 'מסלולי הרים', water: 'מים ומעיינות', heritage: 'מורשת והיסטוריה',
  archaeology: 'ארכיאולוגיה', viewpoints: 'תצפיות', religious: 'אתרים דתיים', parks: 'פארקים לאומיים',
  reserves: 'שמורות טבע', urban: 'אתרים אורבניים',
};
const REGIONS = { north: 'צפון', center: 'מרכז', jerusalem: 'ירושלים', south: 'דרום', deadsea: 'ים המלח', eilat: 'אילת' };
// "in the north" etc. — Hebrew folds the article into the preposition (ב+הצפון = בצפון), so it is spelled out
const REGION_IN = { north: 'בצפון', center: 'במרכז', jerusalem: 'בירושלים', south: 'בדרום', deadsea: 'בים המלח', eilat: 'באילת' };
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

const CSS = `/* אותה זהות כמו האפליקציה ("לילה בדרך"): Karantina לכותרות, IBM Plex Sans Hebrew לטקסט, ירוק לפעולה */
:root{--bg:#F1F4F8;--surface:#fff;--sunk:#E6EBF1;--text:#0C1320;--muted:#566173;--border:#E3E8EF;--go:#22C46E;--go-text:#0A7A3D;--go-ink:#04140B;--deep:#0E1624;--radius:20px;
--display:Karantina,"IBM Plex Sans Hebrew",Heebo,system-ui,sans-serif;--sans:"IBM Plex Sans Hebrew",Heebo,system-ui,-apple-system,"Segoe UI",Arial,sans-serif}
@media (prefers-color-scheme:dark){:root{--bg:#0B111C;--surface:#161F2D;--sunk:#121A27;--text:#EEF2F6;--muted:#97A1B2;--border:#1F2837;--go:#3DDB84;--go-text:#4BE08E;--deep:#151E2D}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.7 var(--sans)}
a{color:var(--go-text)}
.wrap{max-width:760px;margin:0 auto;padding:0 16px}
.top{background:var(--deep);color:#EEF2F6}
.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:60px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#EEF2F6;font:700 34px/1 var(--display);padding-top:4px}
.brand img{width:32px;height:32px;border-radius:9px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:10px 20px;border-radius:16px;font-weight:700;text-decoration:none;border:0;background:var(--sunk);color:var(--text)}
.btn-primary{background:linear-gradient(180deg,color-mix(in srgb,var(--go) 88%,#fff),var(--go) 55%,#13A85A);color:var(--go-ink)}
.top .btn{background:#1D2738;color:#EEF2F6}
.crumbs{font-size:14px;color:var(--muted);margin:18px 0 6px}.crumbs a{color:var(--muted)}
h1{font:700 clamp(48px,13vw,76px)/.92 var(--display);margin:8px 0 16px;text-wrap:balance}
h2{font:700 36px/1 var(--display);margin:40px 0 14px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px;padding:0;list-style:none}
.chips li{background:var(--sunk);color:var(--text);border-radius:999px;padding:5px 13px;font-size:14px;font-weight:600}
.chips li:first-child{background:color-mix(in srgb,var(--go) 16%,transparent);color:var(--go-text)}
figure{margin:0 -16px 20px;position:relative}
figure img{width:100%;height:min(56vh,460px);object-fit:cover;display:block;background:var(--deep)}
figcaption{font-size:12.5px;color:var(--muted);margin:6px 16px 0}
@media (min-width:792px){figure{margin:0 0 20px}figure img{border-radius:24px}figcaption{margin-inline:0}}
.lead{font-size:18.5px;line-height:1.7}
.facts{display:grid;grid-template-columns:max-content 1fr;gap:8px 18px;background:var(--surface);border-radius:var(--radius);padding:18px;margin:20px 0}
.facts dt{color:var(--muted)}.facts dd{margin:0;font-weight:700}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}
.list{list-style:none;padding:0;margin:0;display:grid;gap:0}
.list a{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border);padding:14px 2px;text-decoration:none;color:var(--text);font-weight:600}
.list .sub{color:var(--muted);font-size:14px;font-weight:400;white-space:nowrap}
.cols{columns:2 220px;column-gap:24px;padding:0;list-style:none}.cols li{break-inside:avoid;padding:4px 0}
.cta{background:var(--deep);color:#EEF2F6;border-radius:24px;padding:24px;margin:40px 0}
.cta p{margin:0 0 14px}.cta strong{display:block;font:700 34px/1 var(--display);margin-bottom:6px}
footer{margin-top:40px;padding:24px 0 36px;color:var(--muted);font-size:14px;border-top:1px solid var(--border)}
footer a{color:var(--muted);margin-inline-end:12px}
h2 .sub{font:400 16px var(--sans);color:var(--muted)}
@media (max-width:520px){.facts{gap:6px 12px;padding:14px}.top .btn{min-height:40px;padding:8px 14px}}
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
<meta name="theme-color" content="#0B111C">
<meta property="og:type" content="website">
<meta property="og:site_name" content="מגלים">
<meta property="og:locale" content="he_IL">
<meta property="og:url" content="${esc(SITE + canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Karantina:wght@700&family=IBM+Plex+Sans+Hebrew:wght@400;600;700&display=swap" rel="stylesheet">
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
  const region = REGIONS[l.region], regionIn = REGION_IN[l.region];
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

  const descText = l.description || `${l.name} – ${cat} ${regionIn}.`;
  const metaDesc = clip(`${l.name} – ${cat} ${regionIn}. ${l.description && !l.description.startsWith(l.name) ? l.description + ' ' : ''}`
    + `${DIFFICULTY[l.difficulty] ? `רמת קושי ${DIFFICULTY[l.difficulty]}, ` : ''}${free ? 'כניסה חינם' : 'כניסה בתשלום'}. ניווט, פרטים ויעדים קרובים במגלים.`, 160);
  const title = `${l.name} – ${cat} ${regionIn} | מגלים`;
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
<p><a href="${regionUrl(l.region)}">כל היעדים ${esc(regionIn)} ←</a></p>
</section>
<aside class="cta">
<p><strong>טיילתם ב${esc(l.name)}?</strong> במגלים עושים צ'ק-אין במקום, צוברים נקודות ותגים ורואים לאן החברים שלכם יצאו.</p>
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
  const the = REGION_IN[r];
  const byCat = {};
  for (const l of list) (byCat[l.category] = byCat[l.category] || []).push(l);
  const cats = Object.keys(byCat).sort((a, b) => byCat[b].length - byCat[a].length);
  const catNames = cats.slice(0, 4).map(c => CATEGORIES[c]).filter(Boolean).join(', ');
  const crumbs = [['מגלים', '/'], ['יעדים', '/places/'], [REGIONS[r], regionUrl(r)]];
  const body = `${crumbsHtml(crumbs)}
<h1>יעדי טיול ${esc(the)}</h1>
<p class="lead">${list.length} מקומות לטייל בהם ${esc(the)} – ${esc(catNames)} ועוד. לכל מקום יש דף עם פרטים, ניווט ויעדים קרובים.</p>
<div class="actions"><a class="btn btn-primary" href="/#/map">לכל היעדים על המפה</a></div>
${cats.map(c => `<section><h2>${esc(CATEGORIES[c] || 'עוד יעדים')} <span class="sub">(${byCat[c].length})</span></h2>
<ul class="cols">${byCat[c].map(l => `<li><a href="${placeUrl(l.id)}">${esc(l.name)}</a></li>`).join('')}</ul></section>`).join('\n')}`;
  return layout({
    title: `יעדי טיול ${the} – ${list.length} מקומות | מגלים`,
    description: clip(`${list.length} יעדי טיול ${the}: ${catNames}. פרטים, ניווט ויעדים קרובים לכל מקום – במגלים, מפת הטיולים של ישראל.`, 160),
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

if (require.main === module) main().catch(e => { console.error(e.message || e); process.exit(1); });
module.exports = { fetchRows, normalize, haversineKm, REGIONS, CATEGORIES };
