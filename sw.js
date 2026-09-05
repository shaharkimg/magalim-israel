// App Essentials Phase 0D, Round 2 — Service Worker: app-shell caching only.
//
// עקרון בטיחות מרכזי: לעולם לא cache-first, ולעולם לא נוגעים ב-Supabase/Leaflet/OSM -
// רק allowlist קצר ומפורש של קבצי ה-shell, network-first עם נפילה ל-cache רק בכשל רשת
// אמיתי (offline). האפליקציה כבר יש לה מנגנון בדיקת-גרסה משלה (checkForNewVersion ב-
// app.js, ששולף index.html עם cache:"no-store") - אם ה-SW יעשה cache-first הוא ישבור
// את זה. CACHE_VERSION כאן חייב להתעדכן יחד עם APP_VERSION (app.js) וה-?v= ב-index.html
// בכל דיפלוי, כדי שגרסה ישנה תימחק אוטומטית ב-activate.

const CACHE_VERSION = "20260905a2";
const CACHE_NAME = "magalim-shell-" + CACHE_VERSION;
const SHELL_PATHS = ["/", "/index.html", "/config.js", "/logo.png", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_PATHS).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function isShellRequest(url) {
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname;
  if (path.startsWith("/app.js")) return true;
  return SHELL_PATHS.includes(path);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!isShellRequest(url)) return; // כל דבר אחר (Supabase, מפות, פונטים) עובר בלי לגעת

  event.respondWith(
    fetch(req).then((res) => {
      const resClone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
      return res;
    }).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const exact = await cache.match(req);
      if (exact) return exact;
      if (url.pathname.startsWith("/app.js")) {
        const anyVersion = await cache.match("/app.js", { ignoreSearch: true });
        if (anyVersion) return anyVersion;
      }
      return cache.match("/index.html");
    })
  );
});
