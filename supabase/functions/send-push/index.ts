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

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
    case "friend_checkin":
      return { title: "חבר/ה כבש/ה יעד", body: `${visitor} כבש/ה ${landmark || "יעד חדש"}${pts}`, url: destUrl };
    case "group_checkin":
      return { title: "כיבוש חדש בקבוצה", body: `${visitor} כבש/ה ${landmark || "יעד חדש"}${pts}`, url: destUrl };
    default:
      return { title: "מגלים", body: "יש לכם עדכון חדש", url: "/" };
  }
}

Deno.serve(async (req) => {
  // אימות: רק מי שמחזיק ב-service role key (כלומר ה-Webhook עצמו) רשאי להפעיל.
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!SERVICE_ROLE_KEY || token !== SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
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
