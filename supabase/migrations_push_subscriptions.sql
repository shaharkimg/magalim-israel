-- Push Notifications — שלב 1: תשתית מנויי Push
-- הרץ פעם אחת ב-Supabase Dashboard → SQL Editor → New query → Run
--
-- שורה אחת לכל מכשיר/דפדפן שאישר התראות. ה-endpoint שייך לדפדפן עצמו ולא למשתמש,
-- ולכן הוא unique: מכשיר משותף שעבר ממשתמש א' למשתמש ב' צריך להעביר בעלות על אותה
-- שורה, ולא לייצר שתי שורות שישלחו את ההתראות של שניהם לאותו מכשיר פיזי.
--
-- שם העמודה הוא auth_key ולא auth בכוונה - כדי שלא תיווצר אי-בהירות מול סכמת auth
-- של Supabase בתוך פונקציות plpgsql.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "users can view their own push subscriptions" on public.push_subscriptions;
create policy "users can view their own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "users can delete their own push subscriptions" on public.push_subscriptions;
create policy "users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- אין policy ל-insert/update בכוונה: השמירה עוברת רק דרך ה-RPC הזה. כך אפשר להעביר
-- endpoint שכבר רשום על משתמש אחר (אותו מכשיר, משתמש אחר) בלי לפתוח מדיניות update
-- גורפת שתאפשר לכתוב על שורה של מישהו אחר. הפונקציה תמיד כותבת auth.uid() כבעלים -
-- הלקוח לא יכול לבחור בשם מי לרשום.
create or replace function public.save_push_subscription(
  _endpoint text,
  _p256dh text,
  _auth_key text,
  _user_agent text default null
) returns void as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key, user_agent, last_seen_at)
  values (auth.uid(), _endpoint, _p256dh, _auth_key, left(coalesce(_user_agent,''), 300), now())
  on conflict (endpoint) do update
    set user_id      = excluded.user_id,
        p256dh       = excluded.p256dh,
        auth_key     = excluded.auth_key,
        user_agent   = excluded.user_agent,
        last_seen_at = now();
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.save_push_subscription(text, text, text, text) from anon, public;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
