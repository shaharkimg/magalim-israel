# מגלים

אפליקציית טיולים חברתית-תחרותית לישראל. מפה אינטראקטיבית של 25 יעדים, צ'ק-אין מבוסס GPS + תמונה,
ניקוד ותגים, טבלת דירוג ופיד חברתי — הכל חי מול Supabase (Postgres + Auth + Storage + Realtime).

## הרצה מקומית

זהו אתר סטטי ללא build step — HTML/CSS/JavaScript טהורים (ES modules), ללא framework.

צריך שרת סטטי כלשהו (לא ניתן לפתוח את index.html ישירות מהדיסק, כי מודולי ES חוסמים בקשות מ-`file://`). כל שרת סטטי מתאים, למשל:

```bash
npx serve .
```

או כל שרת אחר שמגיש קבצים סטטיים מהתיקייה הזו.

## מבנה הפרויקט

- `index.html` — כל המבנה וה-CSS.
- `app.js` — כל הלוגיקה (מפה, אימות, צ'ק-אין, דירוג, פיד).
- `config.js` — פרטי החיבור ל-Supabase (URL + anon key הציבורי).
- `supabase/schema.sql` — סכמת מסד הנתונים המלאה. יש להריץ פעם אחת ב-SQL Editor של הפרויקט.

## פריסה (Deploy)

מחובר ל-Vercel/Netlify — כל push ל-`main` מפרסם גרסה חדשה אוטומטית. אין build step, אז הגדרת הפרויקט
בפלטפורמת האחסון היא "Static Site" עם Output Directory = תיקיית השורש.

**חשוב לאחר הפריסה הראשונה:** בדשבורד של Supabase → Authentication → URL Configuration, יש לעדכן את
ה-Site URL לכתובת האמיתית של האתר (`https://megalim-israel.co.il`), אחרת קישורי אימות מייל
יפנו לכתובת שגויה.

### מעבר דומיין

הדומיין הרשמי הוא `megalim-israel.co.il`. בריפו הוא מופיע ב-`SITE_HOST` שב-`app.js`
(מוטבע על תמונת-השיתוף) וב-`twa/twa-manifest.json`; `node scripts/check_twa.js` מוודא
שהשניים מסכימים ושלא נשארה כתובת ישנה.

**מקום אחד מחוץ לריפו שובר התחברות אם לא מעדכנים אותו:**
Supabase ← Authentication ← URL Configuration — Site URL ו-Redirect URLs.

‏Google ו-Facebook **לא** צריכים עדכון של redirect URI: ה-OAuth מפנה חזרה ל-Supabase
(`<project>.supabase.co/auth/v1/callback`), לא לאתר, ורק Supabase מפנה משם לדומיין
שלנו. מה שכן כדאי לעדכן שם הוא קישורי מדיניות הפרטיות והתנאים — לא שובר כלום, אבל
מוצג למשתמש במסך ההסכמה.

**להשאיר גם את הכתובת הישנה** ב-Redirect URLs של Supabase. קישורי הזמנה
(`#/invite/<code>`) שכבר נשלחו למשתמשים מפנים אליה, והסרתה תשבור אותם.

הפירוט המלא: [`docs/OAUTH-DOMAIN.md`](docs/OAUTH-DOMAIN.md).

## אבטחה

`config.js` מכיל את ה-`anon key` הציבורי בלבד — הוא בטוח לחשיפה כי כל הגישה למידע מוגנת ע"י כללי
Row Level Security שמוגדרים ב-`schema.sql`. אין בשום קובץ את ה-`service_role key`.
