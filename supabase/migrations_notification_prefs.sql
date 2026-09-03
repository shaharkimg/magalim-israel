-- App Essentials Phase 0B, Round 2 — Notification Preferences (אמיתי, לא toggle מזויף).
-- מהבקשה המקורית (חברים/קבוצות/הצבעות/אתגרים/הישגים/המלצות/מקומות-ששמרתי) רק "חברים"
-- ו"קבוצות" תואמים סוג-התראה שקיים בפועל היום (Phase 9: friend_request/friend_accepted/
-- friend_checkin -> חברים, circle_joined -> קבוצות). שאר הקטגוריות ייבנו כשתיווצר להן
-- תשתית אמיתית - toggle לקטגוריה שלעולם לא מפיקה התראה הוא בדיוק Fake Functionality.
--
-- הכיבוי אמיתי: הבדיקה בתוך ה-trigger עצמו, לפני ה-insert - לא רק הסתרה בתצוגה.

alter table public.profiles
  add column if not exists notification_prefs jsonb not null default '{"enabled":true,"friends":true,"groups":true}'::jsonb;

create or replace function public.notify_friend_request()
returns trigger as $$
declare
  requester_name text;
  prefs jsonb;
begin
  if new.status = 'pending' then
    select notification_prefs into prefs from public.profiles where id = new.addressee_id;
    if coalesce((prefs->>'enabled')::boolean, true) and coalesce((prefs->>'friends')::boolean, true) then
      select name into requester_name from public.profiles where id = new.requester_id;
      insert into public.notifications (user_id, type, payload)
      values (new.addressee_id, 'friend_request',
        jsonb_build_object('from_id', new.requester_id, 'from_name', coalesce(requester_name,'מטייל/ת'), 'friendship_id', new.id));
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.notify_friend_accepted()
returns trigger as $$
declare
  addressee_name text;
  prefs jsonb;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select notification_prefs into prefs from public.profiles where id = new.requester_id;
    if coalesce((prefs->>'enabled')::boolean, true) and coalesce((prefs->>'friends')::boolean, true) then
      select name into addressee_name from public.profiles where id = new.addressee_id;
      insert into public.notifications (user_id, type, payload)
      values (new.requester_id, 'friend_accepted',
        jsonb_build_object('from_id', new.addressee_id, 'from_name', coalesce(addressee_name,'מטייל/ת'), 'friendship_id', new.id));
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.notify_circle_join()
returns trigger as $$
declare
  joiner_name text;
  circle_name text;
begin
  select name into joiner_name from public.profiles where id = new.user_id;
  select name into circle_name from public.groups where id = new.group_id;
  insert into public.notifications (user_id, type, payload)
  select gm.user_id, 'circle_joined',
    jsonb_build_object('joiner_id', new.user_id, 'joiner_name', coalesce(joiner_name,'מטייל/ת'), 'circle_id', new.group_id, 'circle_name', coalesce(circle_name,'המעגל'))
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
  where gm.group_id = new.group_id and gm.user_id <> new.user_id
    and coalesce((p.notification_prefs->>'enabled')::boolean, true)
    and coalesce((p.notification_prefs->>'groups')::boolean, true);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.notify_friend_checkin()
returns trigger as $$
declare
  visitor_name text;
  landmark_name text;
begin
  select name into visitor_name from public.profiles where id = new.user_id;
  select name into landmark_name from public.landmarks where id = new.landmark_id;
  insert into public.notifications (user_id, type, payload)
  select
    case when f.requester_id = new.user_id then f.addressee_id else f.requester_id end,
    'friend_checkin',
    jsonb_build_object('visitor_id', new.user_id, 'visitor_name', coalesce(visitor_name,'מטייל/ת'), 'landmark_id', new.landmark_id, 'landmark_name', coalesce(landmark_name,''))
  from public.friendships f
  join public.profiles p on p.id = (case when f.requester_id = new.user_id then f.addressee_id else f.requester_id end)
  where f.status = 'accepted' and (f.requester_id = new.user_id or f.addressee_id = new.user_id)
    and coalesce((p.notification_prefs->>'enabled')::boolean, true)
    and coalesce((p.notification_prefs->>'friends')::boolean, true);
  return new;
end;
$$ language plpgsql security definer set search_path = public;
