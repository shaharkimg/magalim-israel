# מגלים את ישראל

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
ה-Site URL לכתובת האמיתית של האתר (למשל `https://magalim-israel.vercel.app`), אחרת קישורי אימות מייל
יפנו לכתובת שגויה.

## אבטחה

`config.js` מכיל את ה-`anon key` הציבורי בלבד — הוא בטוח לחשיפה כי כל הגישה למידע מוגנת ע"י כללי
Row Level Security שמוגדרים ב-`schema.sql`. אין בשום קובץ את ה-`service_role key`.
