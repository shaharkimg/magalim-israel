-- App Essentials Phase 0A, Round 3 — Account Management: מחיקת חשבון אמיתית.
-- אין service_role key בסביבת הפיתוח, אז מחיקה ישירה מ-auth.users לא אפשרית מהלקוח -
-- אבל פונקציית security definer שנוצרת כאן (ע"י בעל הפרויקט, ב-SQL Editor) רצה בהרשאות
-- היוצר ולא הקורא, ויכולה למחוק את שורת auth.users של עצמה. כל הטבלאות התלויות כבר
-- מוגדרות עם "references public.profiles(id) on delete cascade" ו-profiles עצמה עם
-- "references auth.users(id) on delete cascade" - כך שמחיקה אחת מנקה הכל אוטומטית
-- (visits/wishlist/friendships/group_members/notifications/user_badges/field_reports/
-- travel_status) בלי לוגיקת ניקוי ידנית. זו מחיקה אמיתית, לא soft-delete מזויף.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_my_account() to authenticated;
