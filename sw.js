// App Essentials Phase 0D, Round 2 — Service Worker: app-shell caching only.
//
// עקרון בטיחות מרכזי: לעולם לא cache-first, ולעולם לא נוגעים ב-Supabase/Leaflet/OSM -
// רק allowlist קצר ומפורש של קבצי ה-shell, network-first עם נפילה ל-cache רק בכשל רשת
// אמיתי (offline). האפליקציה כבר יש לה מנגנון בדיקת-גרסה משלה (checkForNewVersion ב-
// app.js, ששולף index.html עם cache:"no-store") - אם ה-SW יעשה cache-first הוא ישבור
// את זה. CACHE_VERSION כאן חייב להתעדכן יחד עם APP_VERSION (app.js) וה-?v= ב-index.html
// בכל דיפלוי, כדי שגרסה ישנה תימחק אוטומטית ב-activate.

const CACHE_VERSION = "20260919d1";
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

// ============ Web Push ============
// המנוי נרשם עם userVisibleOnly:true, כלומר הדפדפן מחייב אותנו להציג התראה גלויה על
// כל הודעת push שמגיעה - אחרת הוא מציג התראה גנרית משלו ("אתר זה עודכן ברקע") ובסופו
// של דבר שולל את ההרשאה. לכן כל נתיב כאן מסתיים ב-showNotification, גם כשה-payload
// פגום או ריק.
const NOTIF_BASE = { icon: "/icon-192.png", badge: "/icon-192.png", dir: "rtl", lang: "he" };

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }
  const url = data.url || "/";
  const tag = data.tag;

  event.waitUntil((async () => {
    // בלי tag - התראה בודדת, כל אחת עומדת בפני עצמה.
    if (!tag) {
      return self.registration.showNotification(data.title || "מגלים", {
        ...NOTIF_BASE, body: data.body || "", data: { url },
      });
    }

    // עם tag: אם כבר מוצגת התראה מאותה משפחה, מחליפים אותה בסיכום עם מונה במקום
    // לערום עוד שורה. כך פרץ של חמישה כיבושים בקבוצה נראה כהתראה אחת שמתעדכנת,
    // ולא כחמש הודעות נפרדות. המונה מתאפס מאליו ברגע שהמשתמש סוגר את ההתראה,
    // כי getNotifications מחזיר רק התראות שעדיין מוצגות בפועל.
    const existing = await self.registration.getNotifications({ tag });
    const prev = existing.length ? (existing[0].data && existing[0].data.count) || 1 : 0;

    if (prev === 0) {
      return self.registration.showNotification(data.title || "מגלים", {
        ...NOTIF_BASE, body: data.body || "", tag, data: { url, count: 1 },
      });
    }

    const count = prev + 1;
    const body = (data.summaryBody || "{n} עדכונים חדשים").replace("{n}", String(count));
    return self.registration.showNotification(data.summaryTitle || "מגלים", {
      ...NOTIF_BASE, body, tag, renotify: true,
      data: { url: data.summaryUrl || url, count },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // אם האפליקציה כבר פתוחה איפשהו - מביאים אותה לחזית ומנווטים בתוכה, במקום
      // לפתוח חלון שני שיאבד את ה-state (מפה, sheet פתוח, תור אופליין).
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin)) {
          return client.focus().then((focused) => {
            const c = focused || client;
            if ("navigate" in c) return c.navigate(target).catch(() => {});
          });
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
