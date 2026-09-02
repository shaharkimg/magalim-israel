-- FIX — הצטרפות לקבוצה (INSERT ... RETURNING) נכשלת: כשמשתמש מוסיף את עצמו ל-group_members,
-- ה-SELECT policy הנוכחית (is_group_member(group_id), מבוססת EXISTS על אותה טבלה) לא רואה
-- את השורה שזה עתה הוכנסה באותה פקודה (מגבלת command-visibility רגילה ב-Postgres) — התוצאה
-- "new row violates row-level security policy for table group_members" בכל הצטרפות לקבוצה.
-- הפתרון: כל משתמש תמיד רואה את שורת החברות של עצמו ישירות (ללא תלות בפונקציה), בנוסף
-- לראיית שאר החברים כשהוא כבר חבר.

drop policy if exists "members can view their circle's roster" on public.group_members;
create policy "members can view their circle's roster"
  on public.group_members for select
  using (user_id = auth.uid() or public.is_group_member(group_id));
