-- App Essentials Phase 0F, Round 6 — תשתית אנליטיקס אמיתית (לא מזויפת).
-- טבלה תוספתית + פונקציית ספירה אחת (security definer, אותו דפוס מדויק כמו
-- get_admin_stats() ב-migrations_admin.sql), נצרכות ע"י סט מצומצם ואמיתי של אירועים
-- שכבר קיימים בפועל באפליקציה (לא רשימה תיאורטית). INSERT פתוח גם לאורח (user_id
-- nullable) כי חלק מהאירועים (חיפוש, שיתוף) קורים גם למי שעוד לא נרשם.

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

create policy "anyone can log an analytics event"
  on public.analytics_events for insert
  with check (user_id is null or user_id = auth.uid());

create policy "admins can view analytics events"
  on public.analytics_events for select
  using (public.current_profile_is_admin());

create or replace function public.get_event_counts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_adm boolean;
  result jsonb;
begin
  select is_admin into is_adm from public.profiles where id = auth.uid();
  if not coalesce(is_adm, false) then
    raise exception 'not_authorized';
  end if;
  select coalesce(jsonb_object_agg(event_name, cnt), '{}'::jsonb) into result
  from (
    select event_name, count(*) as cnt
    from public.analytics_events
    where created_at >= now() - interval '7 days'
    group by event_name
  ) t;
  return result;
end;
$$;
grant execute on function public.get_event_counts() to authenticated;
