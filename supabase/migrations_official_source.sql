-- App Essentials Phase 0E, Round 1 — Official Source (תשתית בלבד).
-- עמודה ריקה כברירת מחדל - אין מקור-אמת שמור ל-259 היעדים היום, ואי אפשר לבנות URL
-- על בסיס ניחוש (איסור מפורש בבקשה המקורית). ה-UI לא מציג כלום עד שערך אמיתי יוזן
-- ידנית (SQL Editor) ליעד ספציפי - זו תשתית מוכנה-להרחבה, לא נתון מזויף.

alter table public.landmarks
  add column if not exists official_url text;
