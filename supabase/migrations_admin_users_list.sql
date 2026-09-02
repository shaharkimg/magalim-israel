-- Admin dashboard addition: list of registered users (name/email/status/joined date).
-- אותו דפוס בדיוק כמו get_admin_stats() — בודקת is_admin *בתוך* הפונקציה (לא סומכת רק
-- על RLS/UI חיצוני), וזורקת exception אם לא-אדמין. profiles לא מכילה email בכוונה
-- (סעיף 3 בבקשה המקורית) — הפונקציה הזו (SECURITY DEFINER) מצטרפת ל-auth.users כדי
-- לחשוף את המייל *רק* לאדמין, לא לאף אחד אחר.
create or replace function public.get_admin_users_list(p_limit int default 100)
returns table(
  id uuid, name text, username text, email text,
  account_status text, is_admin boolean, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false) then
    raise exception 'not_authorized';
  end if;

  return query
    select p.id, p.name, p.username, u.email, p.account_status, p.is_admin, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc
    limit p_limit;
end;
$$;

grant execute on function public.get_admin_users_list(int) to authenticated;
