-- הוספת עמודת הערה קצרה (אופציונלית) לצ'ק-אינים, שתוצג בפיד החברתי
alter table public.visits add column if not exists note text;
