-- Multi-user isolation — Phase 9: Notifications
-- הרץ פעם אחת ב-Supabase Dashboard → SQL Editor → New query → Run
--
-- כל ההתראות נוצרות אך ורק דרך triggers (SECURITY DEFINER) על הטבלאות הרלוונטיות, לא
-- דרך INSERT מהלקוח — כך שאין מדיניות INSERT בכלל על notifications, ואף אחד לא יכול
-- "לשלוח" התראה מזויפת למשתמש אחר דרך קריאת API ישירה.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "users can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- ============ בקשת חברות חדשה ============
create or replace function public.notify_friend_request()
returns trigger as $$
declare
  requester_name text;
begin
  if new.status = 'pending' then
    select name into requester_name from public.profiles where id = new.requester_id;
    insert into public.notifications (user_id, type, payload)
    values (new.addressee_id, 'friend_request',
      jsonb_build_object('from_id', new.requester_id, 'from_name', coalesce(requester_name,'מטייל/ת'), 'friendship_id', new.id));
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_friendship_insert
  after insert on public.friendships
  for each row execute procedure public.notify_friend_request();

-- ============ בקשת חברות אושרה ============
create or replace function public.notify_friend_accepted()
returns trigger as $$
declare
  addressee_name text;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select name into addressee_name from public.profiles where id = new.addressee_id;
    insert into public.notifications (user_id, type, payload)
    values (new.requester_id, 'friend_accepted',
      jsonb_build_object('from_id', new.addressee_id, 'from_name', coalesce(addressee_name,'מטייל/ת'), 'friendship_id', new.id));
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_friendship_update
  after update on public.friendships
  for each row execute procedure public.notify_friend_accepted();

-- ============ הצטרפות חדשה למעגל — מודיע לחברים הקיימים ============
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
  where gm.group_id = new.group_id and gm.user_id <> new.user_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_group_member_insert
  after insert on public.group_members
  for each row execute procedure public.notify_circle_join();

-- ============ חבר כבש יעד חדש ============
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
  where f.status = 'accepted' and (f.requester_id = new.user_id or f.addressee_id = new.user_id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_visit_insert
  after insert on public.visits
  for each row execute procedure public.notify_friend_checkin();
