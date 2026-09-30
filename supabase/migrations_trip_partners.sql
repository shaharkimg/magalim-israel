-- "חיפוש שותף לטיול": משתמש מפרסם הצעה לטיול אחד ספציפי (יעד + תאריך), וכל משתמש מחובר אחר
-- יכול לבקש להצטרף. המפרסם/ת מאשר/ת ידנית; באישור נוצרת קבוצה רגילה (groups/group_members) עם
-- המשתתפים, ומשם ממשיכים בכלים הקיימים של קבוצה (הצבעה, התראות צ'ק-אין).
--
-- פרטיות: profiles נעולה לזרים (migrations_multiuser_phase6), ולכן ההצעות והבקשות נקראות רק דרך
-- פונקציות security definer שמחזירות שם פרטי ותמונה בלבד - בלי אימייל, בלי מיקום, בלי טלפון.
-- כתיבה רק דרך RPC-ים (כמו create_group/join_group): אין policy ל-insert/update/delete ישיר.
-- דורש את migrations_hardening_1_rpcs.sql (current_user_active, rl_hit).

create table public.trip_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  landmark_id text not null references public.landmarks(id) on delete cascade,
  trip_date date not null,
  looking_for smallint not null default 1 check (looking_for between 1 and 10),
  note text check (note is null or char_length(note) <= 200),
  status text not null default 'open' check (status in ('open','closed','cancelled')),
  group_id uuid references public.groups(id) on delete set null,
  created_at timestamptz not null default now()
);
create index trip_posts_open_idx on public.trip_posts (landmark_id, trip_date) where status = 'open';
create index trip_posts_user_idx on public.trip_posts (user_id, created_at desc);

create table public.trip_requests (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.trip_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text check (message is null or char_length(message) <= 200),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  constraint trip_requests_unique unique (post_id, user_id)
);
create index trip_requests_user_idx on public.trip_requests (user_id, created_at desc);

alter table public.trip_posts enable row level security;
alter table public.trip_requests enable row level security;

-- קריאה ישירה: רק שלך. כל השאר עובר דרך get_trip_posts / get_trip_requests.
create policy "owners read their trip posts" on public.trip_posts for select using (user_id = auth.uid());
create policy "requesters read their own requests" on public.trip_requests for select using (user_id = auth.uid());
revoke insert, update, delete on public.trip_posts from anon, authenticated;
revoke insert, update, delete on public.trip_requests from anon, authenticated;
revoke all on public.trip_posts, public.trip_requests from anon;

-- חסימה הדדית (friendships.status = 'blocked') מסתירה הצעות ומונעת בקשות בשני הכיוונים
create or replace function public.trip_users_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'blocked'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;
revoke execute on function public.trip_users_blocked(uuid, uuid) from public, anon, authenticated;

create or replace function public.trip_today()
returns date language sql stable as $$ select (now() at time zone 'Asia/Jerusalem')::date $$;
revoke execute on function public.trip_today() from public, anon, authenticated;

-- ============ פרסום הצעה ============
create or replace function public.create_trip_post(p_landmark_id text, p_trip_date date, p_looking_for int default 1, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean text := nullif(btrim(regexp_replace(coalesce(p_note, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F]', '', 'g')), '');
  pid uuid;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not public.current_user_active() then return jsonb_build_object('ok', false, 'error', 'account_unavailable'); end if;
  if not exists (select 1 from public.landmarks where id = p_landmark_id) then
    return jsonb_build_object('ok', false, 'error', 'landmark_not_found');
  end if;
  if p_trip_date is null or p_trip_date < public.trip_today() or p_trip_date > public.trip_today() + 180 then
    return jsonb_build_object('ok', false, 'error', 'invalid_date');
  end if;
  if p_looking_for is null or p_looking_for < 1 or p_looking_for > 10 then
    return jsonb_build_object('ok', false, 'error', 'invalid_count');
  end if;
  if clean is not null and char_length(clean) > 200 then
    return jsonb_build_object('ok', false, 'error', 'note_too_long');
  end if;
  if not public.rl_hit('trip:post:' || uid, 5, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  if (select count(*) from public.trip_posts where user_id = uid and status = 'open' and trip_date >= public.trip_today()) >= 5 then
    return jsonb_build_object('ok', false, 'error', 'too_many_posts');
  end if;
  if exists (select 1 from public.trip_posts where user_id = uid and landmark_id = p_landmark_id
             and trip_date = p_trip_date and status = 'open') then
    return jsonb_build_object('ok', false, 'error', 'duplicate');
  end if;
  insert into public.trip_posts (user_id, landmark_id, trip_date, looking_for, note)
  values (uid, p_landmark_id, p_trip_date, p_looking_for, clean) returning id into pid;
  return jsonb_build_object('ok', true, 'id', pid);
end;
$$;
revoke execute on function public.create_trip_post(text, date, int, text) from public, anon;
grant execute on function public.create_trip_post(text, date, int, text) to authenticated;

create or replace function public.cancel_trip_post(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  update public.trip_posts set status = 'cancelled' where id = p_post_id and user_id = uid and status <> 'cancelled';
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  update public.trip_requests set status = 'cancelled' where post_id = p_post_id and status = 'pending';
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.cancel_trip_post(uuid) from public, anon;
grant execute on function public.cancel_trip_post(uuid) to authenticated;

-- ============ רשימת ההצעות (גלוי לכל משתמש מחובר, לא לאורחים) ============
create or replace function public.get_trip_posts(p_landmark_id text default null, p_limit int default 30)
returns table (
  id uuid, landmark_id text, trip_date date, looking_for smallint, spots_left int, note text,
  poster_id uuid, poster_name text, poster_avatar text, is_mine boolean, my_request_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  return query
  select t.id, t.landmark_id, t.trip_date, t.looking_for,
         greatest(t.looking_for - (select count(*)::int from public.trip_requests r where r.post_id = t.id and r.status = 'accepted'), 0),
         t.note,
         t.user_id,
         coalesce(nullif(split_part(btrim(p.name), ' ', 1), ''), 'מטייל/ת'),
         p.avatar_url,
         t.user_id = uid,
         (select nullif(r.status, 'cancelled') from public.trip_requests r where r.post_id = t.id and r.user_id = uid)
  from public.trip_posts t
  join public.profiles p on p.id = t.user_id
  where t.status = 'open'
    and t.trip_date >= public.trip_today()
    and p.account_status = 'active'
    and (p_landmark_id is null or t.landmark_id = p_landmark_id)
    and not public.trip_users_blocked(uid, t.user_id)
  order by t.trip_date, t.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
end;
$$;
revoke execute on function public.get_trip_posts(text, int) from public, anon;
grant execute on function public.get_trip_posts(text, int) to authenticated;

-- ============ בקשת הצטרפות ============
create or replace function public.request_join_trip(p_post_id uuid, p_message text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t record;
  clean text := nullif(btrim(regexp_replace(coalesce(p_message, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F]', '', 'g')), '');
  me text;
  lm text;
  rid uuid;
  prev text;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not public.current_user_active() then return jsonb_build_object('ok', false, 'error', 'account_unavailable'); end if;
  if clean is not null and char_length(clean) > 200 then
    return jsonb_build_object('ok', false, 'error', 'message_too_long');
  end if;
  select * into t from public.trip_posts where id = p_post_id;
  if not found or t.status <> 'open' or t.trip_date < public.trip_today()
     or public.trip_users_blocked(uid, t.user_id) then
    return jsonb_build_object('ok', false, 'error', 'post_unavailable');
  end if;
  if t.user_id = uid then return jsonb_build_object('ok', false, 'error', 'own_post'); end if;
  -- בקשה קיימת היא אידמפוטנטית; רק בקשה שבוטלה על ידי המבקש/ת עצמו/ה אפשר לשלוח מחדש
  select status into prev from public.trip_requests where post_id = t.id and user_id = uid;
  if found and prev <> 'cancelled' then
    return jsonb_build_object('ok', true, 'already', true, 'status', prev);
  end if;
  if not public.rl_hit('trip:req:' || uid, 15, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  if (select count(*) from public.trip_requests where post_id = t.id and status = 'pending') >= 30 then
    return jsonb_build_object('ok', false, 'error', 'too_many_requests');
  end if;
  insert into public.trip_requests (post_id, user_id, message) values (t.id, uid, clean)
  on conflict (post_id, user_id) do update set status = 'pending', message = excluded.message, created_at = now()
  returning id into rid;
  select name into me from public.profiles where id = uid;
  select name into lm from public.landmarks where id = t.landmark_id;
  insert into public.notifications (user_id, type, payload)
  select t.user_id, 'trip_request',
    jsonb_build_object('from_name', coalesce(nullif(split_part(btrim(me), ' ', 1), ''), 'מטייל/ת'),
                       'post_id', t.id, 'landmark_id', t.landmark_id, 'landmark_name', coalesce(lm, ''))
  from public.profiles p
  where p.id = t.user_id and coalesce((p.notification_prefs->>'enabled')::boolean, true);
  return jsonb_build_object('ok', true, 'already', false, 'id', rid);
end;
$$;
revoke execute on function public.request_join_trip(uuid, text) from public, anon;
grant execute on function public.request_join_trip(uuid, text) to authenticated;

create or replace function public.cancel_trip_request(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  update public.trip_requests set status = 'cancelled'
  where post_id = p_post_id and user_id = uid and status = 'pending';
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke execute on function public.cancel_trip_request(uuid) from public, anon;
grant execute on function public.cancel_trip_request(uuid) to authenticated;

-- ============ הבקשות שהגיעו להצעה שלי (רק המפרסם/ת) ============
create or replace function public.get_trip_requests(p_post_id uuid)
returns table (id uuid, user_id uuid, name text, avatar_url text, message text, status text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not exists (select 1 from public.trip_posts t where t.id = p_post_id and t.user_id = auth.uid()) then
    return;
  end if;
  return query
  select r.id, r.user_id, coalesce(nullif(split_part(btrim(p.name), ' ', 1), ''), 'מטייל/ת'),
         p.avatar_url, r.message, r.status, r.created_at
  from public.trip_requests r
  join public.profiles p on p.id = r.user_id
  where r.post_id = p_post_id and r.status in ('pending', 'accepted')
    and not public.trip_users_blocked(auth.uid(), r.user_id)
  order by r.created_at;
end;
$$;
revoke execute on function public.get_trip_requests(uuid) from public, anon;
grant execute on function public.get_trip_requests(uuid) to authenticated;

-- ============ אישור / דחייה (רק המפרסם/ת) ============
-- באישור הראשון נוצרת קבוצה ("טיול ל<יעד>") והמפרסם/ת הוא/היא הבעלים; כל מאושר מצטרף אליה.
-- כשמתמלאים המקומות ההצעה נסגרת. דחייה שקטה (בלי התראה) - המבקש/ת רואה "לא התאפשר" בצד שלו/ה.
create or replace function public.respond_trip_request(p_request_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r record;
  t record;
  gid uuid;
  lm text;
  gname text;
  accepted int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'not_authenticated'); end if;
  if not public.current_user_active() then return jsonb_build_object('ok', false, 'error', 'account_unavailable'); end if;
  select * into r from public.trip_requests where id = p_request_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into t from public.trip_posts where id = r.post_id for update;
  if t.user_id <> uid then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status <> 'pending' then return jsonb_build_object('ok', true, 'already', true, 'status', r.status); end if;

  if not p_accept then
    update public.trip_requests set status = 'declined' where id = r.id;
    return jsonb_build_object('ok', true, 'status', 'declined');
  end if;

  if t.status <> 'open' or public.trip_users_blocked(uid, r.user_id) then
    return jsonb_build_object('ok', false, 'error', 'post_unavailable');
  end if;
  select count(*) into accepted from public.trip_requests where post_id = t.id and status = 'accepted';
  if accepted >= t.looking_for then return jsonb_build_object('ok', false, 'error', 'full'); end if;

  select name into lm from public.landmarks where id = t.landmark_id;
  gid := t.group_id;
  if gid is null then
    gname := left('טיול ל' || coalesce(lm, 'יעד') || ' · ' || to_char(t.trip_date, 'DD.MM'), 60);
    insert into public.groups (name, created_by) values (gname, uid) returning id into gid;
    insert into public.group_members (group_id, user_id, role, status) values (gid, uid, 'owner', 'active');
    update public.trip_posts set group_id = gid where id = t.id;
  else
    select name into gname from public.groups where id = gid;
  end if;
  insert into public.group_members (group_id, user_id, role, status)
  values (gid, r.user_id, 'member', 'active') on conflict (group_id, user_id) do nothing;
  update public.trip_requests set status = 'accepted' where id = r.id;
  if accepted + 1 >= t.looking_for then
    update public.trip_posts set status = 'closed' where id = t.id;
    update public.trip_requests set status = 'declined' where post_id = t.id and status = 'pending';
  end if;
  insert into public.notifications (user_id, type, payload)
  select r.user_id, 'trip_accepted',
    jsonb_build_object('post_id', t.id, 'landmark_id', t.landmark_id, 'landmark_name', coalesce(lm, ''),
                       'circle_id', gid, 'circle_name', coalesce(gname, ''))
  from public.profiles p
  where p.id = r.user_id and coalesce((p.notification_prefs->>'enabled')::boolean, true);
  return jsonb_build_object('ok', true, 'status', 'accepted', 'group_id', gid);
end;
$$;
revoke execute on function public.respond_trip_request(uuid, boolean) from public, anon;
grant execute on function public.respond_trip_request(uuid, boolean) to authenticated;

-- דיווח על הצעת טיול: poster_id מוחזר מ-get_trip_posts, ולכן הדיווח וגם החסימה משתמשים ב-user_reports
-- ו-friendships הקיימים (הקליינט מוסיף לסיבה את הקידומת "[הצעת טיול]").
