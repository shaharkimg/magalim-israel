// Push Notifications — שלב 3: השולח.
//
// ============ התקנה (פעם אחת) ============
//
// 1) סודות. ב-Supabase Dashboard → Edge Functions → Secrets, או:
//      npx supabase secrets set VAPID_PUBLIC_KEY=...  --project-ref jkyeaewedkzkacjndumd
//      npx supabase secrets set VAPID_PRIVATE_KEY=... --project-ref jkyeaewedkzkacjndumd
//      npx supabase secrets set VAPID_SUBJECT=mailto:shaharcohen.adv@gmail.com --project-ref jkyeaewedkzkacjndumd
//    (המפתח הציבורי חייב להיות זהה ל-VAPID_PUBLIC_KEY שב-config.js, אחרת שירות ה-Push
//     ידחה כל שליחה עם 403 - זו התקלה הנפוצה ביותר בהקמה הזו.)
//    SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY מוזרקים אוטומטית, אין להגדיר אותם ידנית.
//
// 2) פריסה:
//      npx supabase functions deploy send-push --project-ref jkyeaewedkzkacjndumd
//
// 3) Webhook. Dashboard → Database → Webhooks → Create:
//      Table: public.notifications | Events: Insert | Type: Supabase Edge Function
//      Function: send-push
//      HTTP Header: Authorization: Bearer <SERVICE_ROLE_KEY>
//    ה-header הזה הוא מה שמאשר את הקריאה - הפונקציה דוחה כל בקשה בלעדיו (ראו למטה),
//    כך שאי אפשר להפעיל אותה מבחוץ כדי להציף משתמשים בהתראות.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:shaharcohen.adv@gmail.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// סוד ייעודי ל-Webhook. נוסף אחרי שהתברר שאי אפשר להסתמך על השוואה מול
// SUPABASE_SERVICE_ROLE_KEY: סופאבייס עברה לפורמט מפתחות חדש (sb_secret_...), בעוד
// שהמשתנה המוזרק נשאר ה-JWT הישן - כך ששני צדדים תקינים לגמרי פשוט לא משתווים.
// סוד נפרד מנתק את האימות שלנו מפורמט המפתחות של הפלטפורמה.
const PUSH_HOOK_SECRET = Deno.env.get("PUSH_HOOK_SECRET") ?? "";

// האתחול נדחה לתוך הבקשה ולא ברמת המודול בכוונה: setVapidDetails זורק כשהמפתחות
// חסרים או פגומים, וברמת המודול זה מפיל את כל הפונקציה ל-WORKER_ERROR אטום - בלי
// שום רמז שהבעיה היא סוד שלא הוגדר. כאן הכישלון חוזר כהודעה קריאה.
let vapidReady = false;
let initError = "";
let admin: ReturnType<typeof createClient> | null = null;

function ensureReady() {
  if (vapidReady || initError) return;
  const missing: string[] = [];
  if (!VAPID_PUBLIC_KEY) missing.push("VAPID_PUBLIC_KEY");
  if (!VAPID_PRIVATE_KEY) missing.push("VAPID_PRIVATE_KEY");
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    initError = "missing secrets: " + missing.join(", ");
    return;
  }
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    vapidReady = true;
  } catch (e: any) {
    initError = "init failed: " + (e?.message ?? String(e));
  }
}

type NotificationRecord = {
  id?: string;
  user_id?: string;
  type?: string;
  payload?: Record<string, unknown>;
};

// מראה של notificationText ב-app.js. מכוון שיהיו שני מקורות-אמת נפרדים ולא ייבוא
// משותף: זה רץ ב-Deno על השרת והשני בדפדפן, וכל שינוי ניסוח צריך להיעשות בשניהם.
function buildMessage(type: string, p: Record<string, any>) {
  const visitor = p.visitor_name || "מטייל/ת";
  const landmark = p.landmark_name || "";
  const points = Number(p.points) || 0;
  const pts = points > 0 ? ` · +${points} נקודות` : "";
  const destUrl = p.landmark_id ? `/#/destination/${encodeURIComponent(String(p.landmark_id))}` : "/";

  switch (type) {
    case "friend_request":
      return { title: "בקשת חברות חדשה", body: `${p.from_name || "מטייל/ת"} שלח/ה לך בקשת חברות`, url: "/#/profile" };
    case "friend_accepted":
      return { title: "בקשת החברות אושרה", body: `${p.from_name || "מטייל/ת"} אישר/ה את בקשת החברות שלך`, url: "/#/profile" };
    case "circle_joined":
      return { title: "הצטרפות לקבוצה", body: `${p.joiner_name || "מטייל/ת"} הצטרפ/ה ל"${p.circle_name || "הקבוצה"}"`, url: "/#/board" };
    // שני סוגי הכיבוש חולקים tag אחד: כשכמה חברים כובשים ברצף, ה-Service Worker
    // מאחד אותם להתראה אחת עם מונה במקום להציף את המסך. ההתראה הראשונה עדיין
    // מציגה את היעד המדויק ומובילה אליו; רק מהשנייה ואילך עוברים לסיכום שמוביל
    // לפיד הפעילות, כי אין יעד יחיד להצביע עליו.
    case "friend_checkin":
      return {
        title: "חבר/ה כבש/ה יעד", body: `${visitor} כבש/ה ${landmark || "יעד חדש"}${pts}`, url: destUrl,
        tag: "checkin", summaryTitle: "כיבושים חדשים", summaryBody: "{n} חברים כבשו יעדים", summaryUrl: "/#/board",
      };
    case "group_checkin":
      return {
        title: "כיבוש חדש בקבוצה", body: `${visitor} כבש/ה ${landmark || "יעד חדש"}${pts}`, url: destUrl,
        tag: "checkin", summaryTitle: "כיבושים חדשים בקבוצה", summaryBody: "{n} חברים כבשו יעדים", summaryUrl: "/#/board",
      };
    default:
      return { title: "מגלים", body: "יש לכם עדכון חדש", url: "/" };
  }
}

Deno.serve(async (req) => {
  // אימות. שני מסלולים קבילים, כי השער של Supabase לבדו לא מספיק - הוא מקבל גם את
  // ה-anon key, שהוא ציבורי לחלוטין (יושב ב-config.js), ולכן בלי בדיקה משלנו כל אחד
  // היה יכול להפעיל את הפונקציה ולהציף משתמשים בהתראות.
  const headerSecret = (req.headers.get("x-push-secret") ?? "").trim();
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const allowed =
    (PUSH_HOOK_SECRET !== "" && headerSecret === PUSH_HOOK_SECRET) ||
    (SERVICE_ROLE_KEY !== "" && bearer === SERVICE_ROLE_KEY);
  if (!allowed) {
    console.error(
      "rejected: x-push-secret " + (headerSecret ? "present but wrong" : "absent") +
      ", bearer " + (bearer ? "present but not service_role" : "absent") +
      ", PUSH_HOOK_SECRET " + (PUSH_HOOK_SECRET ? "configured" : "NOT SET"),
    );
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // אחרי בדיקת ההרשאה: אם משהו בהקמה חסר, מחזירים את הסיבה המדויקת במקום לקרוס.
  ensureReady();
  if (!vapidReady || !admin) {
    console.error(initError);
    return new Response(JSON.stringify({ error: initError }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let record: NotificationRecord | undefined;
  try {
    const body = await req.json();
    record = body?.record;
  } catch {
    record = undefined;
  }

  // מחזירים 200 גם על קלט לא-רלוונטי: תשובת שגיאה תגרום ל-Webhook לנסות שוב בלולאה
  // על אירוע שלעולם לא יצליח.
  if (!record?.user_id || !record?.type) {
    return new Response(JSON.stringify({ skipped: "no record" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", record.user_id);

  if (error) {
    console.error("failed to load subscriptions", error);
    return new Response(JSON.stringify({ error: "db" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!subs?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const msg = buildMessage(record.type, (record.payload ?? {}) as Record<string, any>);
  const body = JSON.stringify(msg);

  let sent = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subs.map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
          body,
        );
        sent++;
      } catch (err: any) {
        const status = err?.statusCode;
        // 404/410 = הדפדפן ביטל את המנוי (הסרת התקנה, ניקוי נתוני אתר). זו התשובה
        // התקנית של שירות ה-Push ל"נקודת-קצה מתה", ולכן גוזמים אותה מיד במקום לצבור
        // שורות שיכשלו לנצח.
        if (status === 404 || status === 410) staleIds.push(s.id);
        else console.error("push send failed", status, err?.body ?? err?.message);
      }
    }),
  );

  if (staleIds.length) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return new Response(JSON.stringify({ sent, pruned: staleIds.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
