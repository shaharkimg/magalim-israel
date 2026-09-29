# מוכנות ל-Production — מה השתנה, איך מפרסמים, איך חוזרים אחורה

מסמך זה מלווה את סבב ההקשחה. הוא מתאר את סדר הפריסה (חשוב!), את הפעולות הידניות שנדרשות
בשירותים חיצוניים, ואת אופן החזרה לגרסה קודמת.

## מודל האבטחה בקצרה

האפליקציה היא אתר סטטי שמדבר ישירות עם Supabase. **הדפדפן אינו נאמן**: כל מי שמחזיק ב-anon key
(שגלוי ב-`config.js` ובכוונה) ובחשבון משלו יכול לקרוא ל-API בלי האפליקציה. לכן כל כלל עסקי
נאכף בשרת (Postgres):

| נושא | איפה נאכף |
|---|---|
| ניקוד, אימות קרבה, אנטי-רמאות בצ'ק-אין | `checkin_landmark` (RPC). הלקוח שולח מיקום בלבד; אין insert ישיר ל-`visits` / `landmark_conquests` / `xp_bonus_grants` |
| הצטרפות / יצירת קבוצות, הזמנות | `create_group`, `join_group`, `create_invite`, `redeem_invite` (אין insert ישיר ל-`groups` / `group_members` / `invites`) |
| פרטיות (פרופילים, ביקורים, קבוצות, הצבעות, דיווחי שטח, קבצי תמונות) | RLS + `visit_visible_to` + `is_group_member` |
| הגבלת קצב | טבלת `rate_limits` + `rl_hit()`; טריגרים על טבלאות פתוחות לאורחים |
| קלט | אילוצי CHECK (אורך / סוג), אימות `photo_url` (רק קובץ בתיקיית המשתמש), אימות נקודת-קצה של Push |

## סדר פריסה — חשוב

מיגרציית ההקשחה מחולקת לשתי פעימות כדי שלא תהיה חלון שבו האפליקציה שבורה:

1. **`supabase/migrations_hardening_1_rpcs.sql`** ב-SQL Editor. תוספתי בלבד — הגרסה הישנה של
   האפליקציה ממשיכה לעבוד. ניתן להריץ שוב (idempotent). מנקה גם ערכים ישנים לא תקינים
   (אווטאר שאינו https וכו') כדי שהאילוצים החדשים לא ימנעו ממשתמשים לעדכן פרופיל.
2. **לפרוס את האפליקציה** (push ל-`main` → Vercel). הגרסה החדשה קוראת ל-RPC-ים מהשלב הקודם.
3. **`supabase/migrations_hardening_2_lockdown.sql`** — סוגר את הנתיבים הישירים הישנים. להריץ רק
   אחרי שהגרסה החדשה חיה (בדקו שהאתר מציג את הגרסה החדשה, ושצ'ק-אין אחד עובד).
   גרסה ישנה שעדיין פתוחה אצל משתמש (PWA) תיכשל בצ'ק-אין אחרי הצעד הזה עד שתתרענן —
   באנר "יש גרסה חדשה" של האפליקציה יופיע לה.
4. (מומלץ) להריץ את שאילתות הביקורת ב-`supabase/queries_audit_monitoring.sql` סעיף 1, כדי לזהות
   ניקוד מזויף שנצבר לפני ההקשחה. השאילתות לקריאה בלבד; התיקון (מוער) הוא החלטה שלכם.

> אם שלב 1 נכשל על "relation does not exist" — מיגרציה ישנה יותר לא רצה אצלכם. הריצו אותה
> (הרשימה ב-`supabase/tests/migration_order.txt`) ואז את שלב 1 שוב.

## החזרה לגרסה קודמת (Rollback)

* **קוד האתר:** Vercel → Deployments → הפריסה הקודמת → **Promote to Production** (מיידי, בלי build).
  שימו לב: אחרי שלב 3 (lockdown) גרסה ישנה של הקוד לא תוכל לכתוב צ'ק-אין ישירות. לכן ב-rollback
  של הקוד צריך להחזיר גם את ה-lockdown (ראו הבא).
* **Lockdown בלבד:** להחזיר כתיבה ישירה (חירום בלבד, מחזיר את פרצת הניקוד):
  ```sql
  grant insert on public.visits to authenticated;
  create policy "users can insert their own visits" on public.visits for insert with check (auth.uid() = user_id);
  ```
  (ואותו דבר ל-`landmark_conquests`, `xp_bonus_grants`, `group_members`, `groups`, `invites` לפי הצורך.)
* **מיגרציה 1** לא מוחקת ולא משנה נתוני משתמש (מלבד הניקוי החד-פעמי של ערכים לא תקינים), ולכן אין
  צורך להחזיר אותה. אילוץ בעייתי אפשר להסיר: `alter table ... drop constraint <name>;`.
* **גרסה בקליינט:** הגרסה בשלושה מקומות (`app.js` `APP_VERSION`, `index.html` `?v=`, `sw.js`
  `CACHE_VERSION`) — `node scripts/check_version.js` מוודא שהם זהים. חובה להעלות אותם בכל פריסה.

## גיבויים ושלמות נתונים

* מחיקת יעד (`delete from landmarks`) הייתה מוחקת בשרשור את כל הביקורים וה-XP של משתמשים ביעד.
  עכשיו טריגר חוסם אותה. לאיחוד כפילויות: `select public.merge_landmarks('<כפילות>', '<נשאר>');`
  (מעביר ביקורים / כיבושים / מועדפים / תמונות ואז מוחק).
* מחיקת חשבון: קבוצות שיש בהן חברים אחרים עוברות לבעלות החבר הוותיק ביותר (קודם הקבוצה נמחקה לכולם).
* גיבוי: ראו "פעולות ידניות" — Supabase מגבה יום-יום בתוכנית Pro; PITR אופציונלי.

## בדיקות

| מה | פקודה |
|---|---|
| כל הבדיקות הסטטיות והלוגיקה | ראו `README.md` → בדיקות |
| הרשאות, RLS, צ'ק-אין, כפילויות, הזמנות (Postgres אמיתי) | `PGHOST=... PGUSER=... bash supabase/tests/run.sh` |
| התאמת נוסחאות הניקוד בין הלקוח לשרת | `node scripts/test_xp_parity.js` (אחרי `run.sh`) |
| דפדפן אמיתי מול Supabase מדומה (1,500 יעדים, XSS, צ'ק-אין, כשל טעינה) | `node scripts/test_app_smoke.js` |
| אבטחה סטטית (אין כתיבה ישירה לניקוד, XSS, סודות) | `node scripts/check_security.js` |

הכל רץ אוטומטית ב-GitHub Actions (`.github/workflows/checks.yml`), כולל job נפרד ל-Postgres.

---

## ⚠️ MANUAL ACTION REQUIRED — פעולות שרק אתם יכולים לבצע

סדר לפי דחיפות. שום דבר כאן לא חוסם את הפריסה של הקוד.

1. **להריץ את שתי המיגרציות** לפי הסדר שלמעלה (SQL Editor). *דחוף — בלי זה ההקשחה לא בתוקף.*
2. **Supabase → Authentication → Providers → Email:** להגדיר Minimum password length ל-8 לפחות
   (הלקוח דורש 6 כברירת מחדל) ולהפעיל **Leaked password protection** אם התוכנית מאפשרת.
3. **Supabase → Authentication → Rate Limits:** לוודא שמגבלות ההתחברות / הרשמה / שליחת מייל
   פעילות בערכים ברירת-המחדל או מחמירים יותר. אלה מגבלות ה-brute-force של ההתחברות עצמה
   (ההגנה שהוספנו בקוד מכסה צ'ק-אין, הזמנות, קבוצות ושאר ה-RPC-ים; ההתחברות היא של Supabase Auth).
4. **(אופציונלי, מומלץ לפני הרשמה פתוחה)** להפעיל CAPTCHA בהרשמה: Authentication → Attack
   Protection → CAPTCHA (Cloudflare Turnstile / hCaptcha). דורש מפתח site ואינטגרציה קטנה בטופס.
5. **Auth Hook להרשמה:** אם עדיין לא הופעל — Authentication → Hooks → *Before User Created* →
   `public.hook_check_registration_gate` (מתואר ב-`migrations_auth_hook_registration_gate.sql`).
6. **גיבויים:** Supabase → Database → Backups. לוודא שגיבוי יומי פעיל; לשקול Point-in-Time Recovery
   לפני שיש משתמשים אמיתיים בכמות. *מומלץ לבצע גיבוי ידני לפני הרצת שלב 1.*
7. **ניטור והתראות (אין שירות חיצוני מוגדר בפרויקט):**
   * **שגיאות לקוח:** Database → Webhooks → Create → טבלה `client_errors`, אירוע Insert → כתובת Slack
     incoming-webhook או Edge Function שמעבירה למייל. (הקוד כבר כותב לטבלה; כתובת האתר מנוקה מקודי הזמנה.)
   * **זמינות:** UptimeRobot / BetterStack על `https://megalim-israel.co.il` ועל
     `https://megalim-israel.co.il/.well-known/assetlinks.json`.
   * **שגיאות שרת ו-Auth:** Supabase → Logs; אפשר להגדיר Log Drain / התראות בתוכנית Pro.
   * **שאילתות מוכנות:** `supabase/queries_audit_monitoring.sql` (שגיאות, כשלי צ'ק-אין לפי סיבה, משפך).
8. **Push:** לוודא שהסודות של `send-push` מוגדרים (`VAPID_PRIVATE_KEY`, `PUSH_HOOK_SECRET`) ושה-Webhook
   על `notifications` שולח את ה-header `x-push-secret` (ראו הערות בראש `supabase/functions/send-push/index.ts`).
   אם יש לכם Custom Domain ל-Supabase (לא `*.supabase.co`) — יש לעדכן את תבנית הכתובת ב-`is_own_checkin_photo`.
9. **אפליקציית אנדרואיד (TWA):** `.well-known/assetlinks.json` עדיין מכיל
   `REPLACE_WITH_SHA256_FROM_PLAY_CONSOLE`. חובה להחליף בטביעת האצבע האמיתית לפני פרסום ב-Play.
   קובץ ה-keystore לא בריפו (נוסף ל-`.gitignore`) — לשמור אותו בגיבוי מאובטח.
10. **הגדרות Google/Facebook OAuth ו-Site URL:** לפי `docs/OAUTH-DOMAIN.md` (לא השתנה בסבב זה).
11. **סיבוב מפתחות:** לא נמצא שום סוד בריפו או בהיסטוריה שלו (רק anon key ו-VAPID ציבורי), ולכן אין
    חובה לסובב. אם ה-service_role או מפתח VAPID פרטי הודבקו אי-פעם בצ'אט/מייל — לסובב אותם.
12. **בדיקה על מכשירים אמיתיים:** בדיקות הדפדפן האוטומטיות רצות ב-Chromium בגודל טלפון בלבד.
    יש לבדוק ידנית ב-iPhone Safari ו-Android Chrome: מצלמה, GPS, שיתוף, ניווט ל-Waze, התראות Push,
    מקלדת מעל טפסים ו-safe area.
