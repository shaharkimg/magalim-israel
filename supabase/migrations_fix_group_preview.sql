-- FIX — get_group_preview() לא נוצרה בפועל כשmigrations_circles.sql רץ (כנראה נכשלה
-- בשקט כסטייטמנט אחרון בקובץ, בלי שהמשתמש ראה שגיאה מפורשת). נוצרת מחדש כאן, בנפרד.
create or replace function public.get_group_preview(gid uuid)
returns table(id uuid, name text)
language sql
security definer
set search_path = public
as $$
  select id, name from public.groups where id = gid;
$$;

grant execute on function public.get_group_preview(uuid) to authenticated;
