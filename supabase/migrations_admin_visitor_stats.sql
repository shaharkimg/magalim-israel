-- לוח ניהול: ספירת כניסות לאפליקציה כולל אורחים שלא נרשמו.
-- מבוסס על אירוע session_started שכבר נכתב ל-analytics_events גם לאורח (user_id null).
-- visits = טעינות אפליקציה (session_id), visitors = מכשירים ייחודיים (payload.visitor_id,
-- מזהה אנונימי אקראי ב-localStorage; אירועים ישנים בלי visitor_id נספרים לפי session_id).
-- בדיקת is_admin בתוך הפונקציה, אותו דפוס כמו get_admin_stats(). בטוח להרצה חוזרת.
create or replace function public.get_visitor_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false) then
    raise exception 'not_authorized';
  end if;

  select jsonb_build_object(
    'visits_today',   count(distinct session_id) filter (where created_at >= date_trunc('day', now())),
    'visits_7d',      count(distinct session_id) filter (where created_at >= now() - interval '7 days'),
    'visits_30d',     count(distinct session_id),
    'visitors_today', count(distinct coalesce(payload->>'visitor_id', session_id)) filter (where created_at >= date_trunc('day', now())),
    'visitors_7d',    count(distinct coalesce(payload->>'visitor_id', session_id)) filter (where created_at >= now() - interval '7 days'),
    'visitors_30d',   count(distinct coalesce(payload->>'visitor_id', session_id)),
    'guest_visits_7d',  count(distinct session_id) filter (where user_id is null and created_at >= now() - interval '7 days'),
    'member_visits_7d', count(distinct session_id) filter (where user_id is not null and created_at >= now() - interval '7 days')
  ) into result
  from public.analytics_events
  where event_name = 'session_started'
    and created_at >= now() - interval '30 days';
  return result;
end;
$$;
revoke execute on function public.get_visitor_stats() from public, anon;
grant execute on function public.get_visitor_stats() to authenticated;
