-- Production Readiness — שלב 1 מתוך 2: תשתית שרת (תוספתי בלבד, בטוח להרצה בכל רגע).
-- הרץ ב-Supabase Dashboard → SQL Editor → New query → Run.
--
-- הקובץ הזה רק מוסיף: rate limiter, פונקציות RPC שהשרת שולט בהן (צ'ק-אין, יצירת קבוצה,
-- הצטרפות לקבוצה, יצירת הזמנה), טריגרי הגנה ואילוצי-קלט. הוא לא מסיר שום הרשאה קיימת, ולכן
-- הגרסה הישנה של האפליקציה ממשיכה לעבוד גם אחרי שהוא רץ.
--
-- סדר הפריסה הבטוח:
--   1. להריץ את הקובץ הזה.
--   2. לפרוס את האפליקציה (app.js החדש קורא ל-RPC-ים שנוצרים כאן).
--   3. להריץ את migrations_hardening_2_lockdown.sql (הוא סוגר את הנתיבים הישירים הישנים:
--      insert ישיר ל-visits / landmark_conquests / xp_bonus_grants / group_members וכו').
--
-- למה זה נדרש: עד עכשיו הלקוח קבע בעצמו את הניקוד (points_awarded / xp_awarded) ואת עצם
-- תקינות הצ'ק-אין (בדיקת ה-GPS רצה רק בדפדפן), וה-RLS הסכים לכל insert של המשתמש לשורה של
-- עצמו. כלומר כל אחד עם ה-anon key ו-JWT משלו יכול היה להעניק לעצמו ניקוד ללא הגבלה.

-- ============ Rate limiter ============
-- חלון קבוע פשוט לכל מפתח. הטבלה נעולה לחלוטין ללקוחות; רק פונקציות SECURITY DEFINER כותבות.
create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits int not null default 0
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- מחזירה true אם הקריאה מותרת. חשוב: לקרוא לה רק מקוד שמסתיים ב-return (לא ב-raise), אחרת
-- הטרנזקציה מתבטלת ומונה הניסיונות מתבטל איתה.
create or replace function public.rl_hit(p_key text, p_max int, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  h int;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start < now() - p_window then now() else r.window_start end,
    hits = case when r.window_start < now() - p_window then 1 else r.hits + 1 end
  returning hits into h;

  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return h <= p_max;
end;
$$;
revoke execute on function public.rl_hit(text, int, interval) from public, anon, authenticated;

-- כתובת הלקוח (best effort) - לחסימת ספאם מאורחים שאין להם auth.uid().
create or replace function public.request_ip()
returns text
language plpgsql
stable
as $$
declare
  hdrs json;
  ip text;
begin
  begin
    hdrs := current_setting('request.headers', true)::json;
  exception when others then
    return null;
  end;
  if hdrs is null then return null; end if;
  ip := coalesce(hdrs->>'cf-connecting-ip', hdrs->>'x-real-ip', split_part(coalesce(hdrs->>'x-forwarded-for', ''), ',', 1));
  ip := nullif(btrim(ip), '');
  return left(ip, 64);
end;
$$;

-- טריגר BEFORE INSERT גנרי: חורג מהמכסה => השורה נזרקת בשקט (return null), לא exception,
-- כדי שהמונה יישמר. שימושי לטבלאות שפתוחות לאורחים (אנליטיקה, שגיאות, פידבק, רשימת המתנה).
-- ארגומנטים: (מקסימום, חלון). אורח בלי כתובת מזוהה מקבל תקרה גבוהה פי 50 (מפתח משותף).
create or replace function public.tg_rate_limit_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lim int;
  win interval;
  who text;
begin
  lim := tg_argv[0]::int;
  win := tg_argv[1]::interval;
  who := coalesce(auth.uid()::text, public.request_ip());
  if who is null then
    who := 'anon';
    lim := lim * 50;
  end if;
  if not public.rl_hit('t:' || tg_table_name || ':' || who, lim, win) then
    return null;
  end if;
  return new;
end;
$$;
revoke execute on function public.tg_rate_limit_insert() from public, anon, authenticated;

do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('analytics_events',   '200', '1 minute'),
      ('client_errors',      '20',  '10 minutes'),
      ('feedback_submissions','5',  '1 hour'),
      ('place_corrections',  '10',  '1 hour'),
      ('user_reports',       '10',  '1 hour'),
      ('waitlist',           '5',   '1 hour'),
      ('field_reports',      '40',  '1 hour'),
      ('landmark_photos',    '40',  '1 hour'),
      ('friendships',        '30',  '1 hour'),
      ('group_destination_votes', '60', '1 minute')
    ) as t(tbl, lim, win)
  loop
    if to_regclass('public.' || spec.tbl) is not null then
      execute format('drop trigger if exists rate_limit_insert on public.%I', spec.tbl);
      execute format(
        'create trigger rate_limit_insert before insert on public.%I for each row execute function public.tg_rate_limit_insert(%L, %L)',
        spec.tbl, spec.lim, spec.win);
    end if;
  end loop;
end $$;

-- ============ אילוצי קלט (NOT VALID = נאכפים על כתיבות חדשות, בלי לשבור שורות ישנות) ============
create or replace function public._add_check(p_table text, p_name text, p_expr text)
returns void
language plpgsql
as $$
begin
  if to_regclass(p_table) is null then
    return;   -- migration של אותה טבלה עוד לא רץ: אין מה לאכוף
  end if;
  if not exists (select 1 from pg_constraint where conname = p_name and conrelid = p_table::regclass) then
    execute format('alter table %s add constraint %I check (%s) not valid', p_table, p_name, p_expr);
  end if;
end;
$$;

-- ניקוי חד-פעמי של ערכים ישנים שלא יעמדו באילוצים (שמות ארוכים / כתובות שאינן https, כולל
-- javascript:), כדי שהאילוצים למטה לא ימנעו ממשתמש קיים לעדכן את הפרופיל או הביקור שלו.
-- מסירים רק ערכים לא תקינים; שום ערך תקין לא משתנה.
do $$
begin
  if to_regclass('public.profiles') is not null then
    update public.profiles set avatar_url = null where avatar_url is not null and (avatar_url !~* '^https://' or char_length(avatar_url) > 1000);
    update public.profiles set name = left(btrim(name), 100) where char_length(name) > 100;
    update public.profiles set username = left(username, 40) where char_length(username) > 40;
  end if;
  if to_regclass('public.visits') is not null then
    update public.visits set photo_url = null where photo_url is not null and (photo_url !~* '^https://' or char_length(photo_url) > 600);
    update public.visits set note = left(note, 300) where char_length(note) > 300;
  end if;
  if to_regclass('public.landmark_photos') is not null then
    delete from public.landmark_photos where photo_url !~* '^https://' or char_length(photo_url) > 600;
  end if;
  if to_regclass('public.groups') is not null then
    update public.groups set name = left(btrim(name), 100) where char_length(name) > 100;
  end if;
end $$;

select public._add_check('public.profiles', 'profiles_name_len', 'char_length(name) between 1 and 100');
select public._add_check('public.profiles', 'profiles_username_len', 'username is null or char_length(username) <= 40');
select public._add_check('public.profiles', 'profiles_avatar_url_ok', $$avatar_url is null or (char_length(avatar_url) <= 1000 and avatar_url ~* '^https://')$$);
select public._add_check('public.groups', 'groups_name_len', 'char_length(name) between 1 and 100');
select public._add_check('public.visits', 'visits_note_len', 'note is null or char_length(note) <= 300');
select public._add_check('public.visits', 'visits_photo_url_ok', $$photo_url is null or (char_length(photo_url) <= 600 and photo_url ~* '^https://')$$);
select public._add_check('public.landmark_photos', 'landmark_photos_url_ok', $$char_length(photo_url) <= 600 and photo_url ~* '^https://'$$);
select public._add_check('public.analytics_events', 'analytics_event_name_len', 'char_length(event_name) between 1 and 64');
select public._add_check('public.analytics_events', 'analytics_session_len', 'session_id is null or char_length(session_id) <= 64');
select public._add_check('public.analytics_events', 'analytics_payload_size', 'octet_length(payload::text) <= 2000');
select public._add_check('public.client_errors', 'client_errors_message_len', 'char_length(message) <= 500');
select public._add_check('public.client_errors', 'client_errors_stack_len', 'stack is null or char_length(stack) <= 4000');
select public._add_check('public.client_errors', 'client_errors_url_len', 'url is null or char_length(url) <= 500');
select public._add_check('public.feedback_submissions', 'feedback_message_len', 'char_length(message) between 1 and 2000');
select public._add_check('public.user_reports', 'user_reports_len', 'char_length(reason) <= 100 and (message is null or char_length(message) <= 1000)');
select public._add_check('public.place_corrections', 'place_corrections_len', 'char_length(reason) <= 100 and (message is null or char_length(message) <= 1000)');
select public._add_check('public.waitlist', 'waitlist_email_ok', $$char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'$$);
select public._add_check('public.user_badges', 'user_badges_id_ok', $$badge_id ~ '^[a-z0-9_]{1,60}$'$$);

drop function public._add_check(text, text, text);

-- ============ תמונות: רק קבצים שהמשתמש העלה בעצמו ל-bucket של התמונות ============
-- עד עכשיו photo_url היה טקסט חופשי לחלוטין, והלקוח הציג אותו כ-<img src="..."> בלי escape
-- (XSS מאוחסן ופיקסל-מעקב אצל כל מי שרואה את הפריט). כאן נחסמת כל כתובת שאינה קובץ בתיקיית
-- המשתמש עצמו ב-checkin-photos של Supabase Storage.
create or replace function public.is_own_checkin_photo(p_url text, p_user uuid)
returns boolean
language sql
immutable
as $$
  select p_url ~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/checkin-photos/' || p_user::text || '/[^/?#[:space:]"''()<>\\]+$');
$$;

create or replace function public.tg_validate_photo_url()
returns trigger
language plpgsql
as $$
begin
  if new.photo_url is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.photo_url is not distinct from old.photo_url then
    return new;
  end if;
  if not public.is_own_checkin_photo(new.photo_url, new.user_id) then
    raise exception 'invalid_photo_url' using errcode = '22023';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['visits', 'landmark_photos'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists validate_photo_url on public.%I', t);
      execute format('create trigger validate_photo_url before insert or update on public.%I for each row execute function public.tg_validate_photo_url()', t);
    end if;
  end loop;
end $$;

-- ============ אינדקסים לשאילתות החמות ============
do $$
declare
  spec record;
begin
  for spec in select * from (values
    ('visits_user_idx', 'visits', '(user_id, visited_at desc)'),
    ('visits_landmark_idx', 'visits', '(landmark_id)'),
    ('likes_visit_idx', 'likes', '(visit_id)'),
    ('group_members_user_idx', 'group_members', '(user_id)'),
    ('notifications_user_idx', 'notifications', '(user_id, created_at desc)'),
    ('invites_creator_idx', 'invites', '(created_by)'),
    ('landmark_conquests_landmark_idx', 'landmark_conquests', '(landmark_id)')
  ) as t(idx, tbl, cols)
  loop
    if to_regclass('public.' || spec.tbl) is not null then
      execute format('create index if not exists %I on public.%I %s', spec.idx, spec.tbl, spec.cols);
    end if;
  end loop;
end $$;

-- ============ חישוב ניקוד בשרת (מראה מדויקת של pointsForLandmark ב-app.js) ============
create or replace function public.points_for_landmark(l public.landmarks)
returns int
language plpgsql
immutable
as $$
declare
  hrs numeric;
  km numeric;
  base int;
  mult numeric;
begin
  km := coalesce(l.distance_km, 0);
  hrs := coalesce(l.duration_hours, case when km > 0 then km / 3.2 else 1.5 end);
  if km <= 1.5 and (hrs <= 1.5 or l.category in ('viewpoints','religious','urban','heritage','archaeology')) then
    base := 10;
  elsif hrs < 2.5 then
    base := 22;
  elsif hrs < 4.5 then
    base := 38;
  else
    base := 58;
  end if;
  mult := case l.difficulty when 'medium' then 1.1 when 'hard' then 1.25 when 'extreme' then 1.4 else 1 end;
  return greatest(5, (round(base * mult / 5) * 5)::int);
end;
$$;

-- מראה של COLLECTIONS ב-app.js
create or replace function public.collection_match(p_col text, l public.landmarks)
returns boolean
language sql
immutable
as $$
  select case p_col
    when 'water' then l.category = 'water' or l.has_water
    when 'heritage' then l.category in ('archaeology', 'heritage')
    when 'mountains' then l.category = 'mountains'
    when 'nature' then l.category = 'nature'
    when 'desertsea' then l.region in ('south', 'deadsea', 'eilat')
    when 'reserves' then l.category in ('reserves', 'parks')
    when 'family' then l.family_friendly
    when 'accessible' then l.accessible
    else false
  end;
$$;

-- מראה של WEEKLY_CHALLENGES / currentWeekKey ב-app.js (שבוע ישראלי: ראשון-שבת, שעון ישראל)
create or replace function public.weekly_challenge_info(p_at timestamptz default now())
returns table(week_key text, challenge_id text)
language plpgsql
stable
as $$
declare
  local_day date := (p_at at time zone 'Asia/Jerusalem')::date;
  wk_start date := local_day - extract(dow from local_day)::int;
  year_start date := make_date(extract(year from wk_start)::int, 1, 1);
  ys_week_start date := year_start - extract(dow from year_start)::int;
  wk_start_ts timestamptz := (wk_start::timestamp) at time zone 'Asia/Jerusalem';
  idx int := (floor(extract(epoch from wk_start_ts) / 604800)::bigint % 6)::int;
begin
  week_key := extract(year from wk_start)::int::text || '-W' || lpad((floor((wk_start - ys_week_start) / 7.0)::int + 1)::text, 2, '0');
  challenge_id := (array['water','family','easy','north','south','accessible'])[idx + 1];
  return next;
end;
$$;

create or replace function public.weekly_challenge_match(p_id text, l public.landmarks)
returns boolean
language sql
immutable
as $$
  select case p_id
    when 'water' then l.has_water
    when 'family' then l.family_friendly
    when 'easy' then l.difficulty = 'easy'
    when 'north' then l.region = 'north'
    when 'south' then l.region = 'south'
    when 'accessible' then l.accessible
    else false
  end;
$$;

-- מרחק הברסין במטרים
create or replace function public.distance_m(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns double precision
language sql
immutable
as $$
  select 2 * 6371000 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  )));
$$;

-- מעניקה בונוס חד-פעמי; מחזירה true רק אם השורה באמת נכנסה (אידמפוטנטי ע"י unique).
create or replace function public.grant_xp_bonus(p_user uuid, p_type text, p_source text, p_xp int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  insert into public.xp_bonus_grants (user_id, bonus_type, source_id, xp_awarded)
  values (p_user, p_type, coalesce(p_source, ''), p_xp)
  on conflict (user_id, bonus_type, source_id) do nothing;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;
revoke execute on function public.grant_xp_bonus(uuid, text, text, int) from public, anon, authenticated;

-- ============ צ'ק-אין: השרת מחליט אם הוא תקין וכמה נקודות מגיעות ============
-- קלט מהלקוח: היעד, מיקום מדווח (+דיוק), תמונה (כתובת בתיקיית המשתמש), הערה, וחותמת-זמן
-- אופציונלית (לצ'ק-אין שנשמר אופליין; מוגבלת ל-7 ימים אחורה ולעולם לא לעתיד).
-- החזרה תמיד jsonb: {ok:true,...} או {ok:false,error:'<code>'}, כדי שגם כישלון לא יבטל
-- את הטרנזקציה (ומונה ה-rate limit יישמר).
--
-- שכבות ההגנה: התחברות + חשבון פעיל, אימות קרבה (1500 מ' מקואורדינטות היעד ב-DB), דיוק
-- מיקום סביר, rate limit (התפרצות ויומי), זיהוי "טלפורטציה" (מהירות בלתי-אפשרית בין שני
-- צ'ק-אינים עוקבים), ואידמפוטנציה מלאה (unique על user+landmark, on conflict do nothing).
-- לא נשמר שום מיקום של המשתמש - רק היעד שנכבש.
create or replace function public.checkin_landmark(
  p_landmark_id text,
  p_lat double precision,
  p_lon double precision,
  p_accuracy double precision default null,
  p_photo_url text default null,
  p_note text default null,
  p_client_ts timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  lm public.landmarks%rowtype;
  status text;
  existing public.visits%rowtype;
  d double precision;
  eff_ts timestamptz;
  clean_note text;
  prev record;
  prev_km double precision;
  hours double precision;
  base_xp int;
  total int := 0;
  bonuses jsonb := '[]'::jsonb;
  n int;
  ins_visit public.visits%rowtype;
  wk record;
  prior_count int;
  region_total int;
  before_cnt int;
  after_cnt int;
  ms record;
  col text;
  photo_ok boolean;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  select account_status into status from public.profiles where id = uid;
  if status is null or status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'account_unavailable');
  end if;
  if not public.rl_hit('checkin:attempt:' || uid, 60, interval '10 minutes') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  select * into lm from public.landmarks where id = p_landmark_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'landmark_not_found');
  end if;

  -- אידמפוטנציה: בקשה חוזרת (דאבל-קליק / retry אחרי ניתוק) מחזירה את הביקור הקיים, בלי ניקוד.
  select * into existing from public.visits where user_id = uid and landmark_id = lm.id;
  if found then
    return jsonb_build_object('ok', true, 'already', true, 'first_conquest', false,
      'base_xp', 0, 'bonuses', '[]'::jsonb, 'total_granted', 0, 'visit', to_jsonb(existing));
  end if;

  if p_lat is null or p_lon is null or p_lat <> p_lat or p_lon <> p_lon
     or p_lat not between -90 and 90 or p_lon not between -180 and 180 then
    return jsonb_build_object('ok', false, 'error', 'no_location');
  end if;
  if p_accuracy is not null and (p_accuracy <> p_accuracy or p_accuracy < 0 or p_accuracy > 1500) then
    return jsonb_build_object('ok', false, 'error', 'poor_accuracy');
  end if;
  d := public.distance_m(p_lat, p_lon, lm.lat, lm.lon);
  if d > 1500 then
    return jsonb_build_object('ok', false, 'error', 'too_far', 'distance_m', round(d));
  end if;

  if not public.rl_hit('checkin:burst:' || uid, 8, interval '10 minutes')
     or not public.rl_hit('checkin:day:' || uid, 20, interval '24 hours') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  if p_photo_url is not null then
    photo_ok := public.is_own_checkin_photo(p_photo_url, uid);
    if not photo_ok then
      return jsonb_build_object('ok', false, 'error', 'invalid_photo');
    end if;
  end if;

  clean_note := nullif(btrim(regexp_replace(coalesce(p_note, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')), '');
  if clean_note is not null then
    clean_note := left(clean_note, 300);
  end if;

  eff_ts := greatest(least(coalesce(p_client_ts, now()), now()), now() - interval '7 days');

  -- זיהוי טלפורטציה: מול הביקור האחרון שקדם לחותמת-הזמן הזו (לפי מיקומי היעדים ב-DB).
  select v.visited_at, l.lat, l.lon into prev
  from public.visits v join public.landmarks l on l.id = v.landmark_id
  where v.user_id = uid and v.visited_at <= eff_ts
  order by v.visited_at desc limit 1;
  if found then
    prev_km := public.distance_m(prev.lat, prev.lon, lm.lat, lm.lon) / 1000.0;
    hours := extract(epoch from (eff_ts - prev.visited_at)) / 3600.0;
    if prev_km > 5 and prev_km / greatest(hours, 1.0 / 60) > 250 then
      return jsonb_build_object('ok', false, 'error', 'impossible_travel');
    end if;
  end if;
  -- ובכיוון ההפוך: צ'ק-אין "מהעבר" (אופליין) לא יכול להקדים ביקור קיים ברחוק בלתי-אפשרי
  select v.visited_at, l.lat, l.lon into prev
  from public.visits v join public.landmarks l on l.id = v.landmark_id
  where v.user_id = uid and v.visited_at > eff_ts
  order by v.visited_at asc limit 1;
  if found then
    prev_km := public.distance_m(prev.lat, prev.lon, lm.lat, lm.lon) / 1000.0;
    hours := extract(epoch from (prev.visited_at - eff_ts)) / 3600.0;
    if prev_km > 5 and prev_km / greatest(hours, 1.0 / 60) > 250 then
      return jsonb_build_object('ok', false, 'error', 'impossible_travel');
    end if;
  end if;

  -- כיבוש ראשון: ה-PK (user,landmark) הוא מנגנון הדה-דופ.
  base_xp := public.points_for_landmark(lm);
  insert into public.landmark_conquests (user_id, landmark_id, xp_awarded, difficulty_at_conquest)
  values (uid, lm.id, base_xp, lm.difficulty)
  on conflict (user_id, landmark_id) do nothing;
  get diagnostics n = row_count;

  if n = 0 then
    base_xp := 0;   -- כבר נכבש בעבר (למשל ביקור שנמחק): נרשם הביקור, בלי נקודות
  else
    total := base_xp;

    select * into wk from public.weekly_challenge_info();
    if public.weekly_challenge_match(wk.challenge_id, lm)
       and public.grant_xp_bonus(uid, 'weekly_challenge', wk.week_key, 50) then
      bonuses := bonuses || jsonb_build_object('type', 'weekly_challenge', 'xp', 50); total := total + 50;
    end if;

    select count(*) into prior_count from public.landmark_conquests where user_id = uid and landmark_id <> lm.id;
    if prior_count = 0 and public.grant_xp_bonus(uid, 'first_destination', '', 10) then
      bonuses := bonuses || jsonb_build_object('type', 'first_destination', 'xp', 10); total := total + 10;
    end if;

    if not exists (select 1 from public.landmark_conquests c join public.landmarks x on x.id = c.landmark_id
                   where c.user_id = uid and c.landmark_id <> lm.id and x.region = lm.region)
       and public.grant_xp_bonus(uid, 'new_region', lm.region, 5) then
      bonuses := bonuses || jsonb_build_object('type', 'new_region', 'xp', 5); total := total + 5;
    end if;
    if not exists (select 1 from public.landmark_conquests c join public.landmarks x on x.id = c.landmark_id
                   where c.user_id = uid and c.landmark_id <> lm.id and x.category = lm.category)
       and public.grant_xp_bonus(uid, 'new_category', lm.category, 5) then
      bonuses := bonuses || jsonb_build_object('type', 'new_category', 'xp', 5); total := total + 5;
    end if;

    select count(*) into region_total from public.landmarks where region = lm.region;
    if region_total > 0 then
      select count(*) into before_cnt from public.landmark_conquests c join public.landmarks x on x.id = c.landmark_id
        where c.user_id = uid and c.landmark_id <> lm.id and x.region = lm.region;
      after_cnt := before_cnt + 1;
      for ms in select * from (values (0.25, 'region_25', 10), (0.5, 'region_50', 20), (0.75, 'region_75', 30), (1.0, 'region_100', 50)) as t(pct, typ, xp)
      loop
        if before_cnt::numeric / region_total < ms.pct and after_cnt::numeric / region_total >= ms.pct
           and public.grant_xp_bonus(uid, ms.typ, lm.region, ms.xp) then
          bonuses := bonuses || jsonb_build_object('type', ms.typ, 'xp', ms.xp); total := total + ms.xp;
        end if;
      end loop;
    end if;

    foreach col in array array['water','heritage','mountains','nature','desertsea','reserves','family','accessible']
    loop
      if public.collection_match(col, lm)
         and not exists (
           select 1 from public.landmarks x
           where public.collection_match(col, x)
             and not exists (select 1 from public.landmark_conquests c where c.user_id = uid and c.landmark_id = x.id)
         )
         and public.grant_xp_bonus(uid, 'collection_complete', col, 20) then
        bonuses := bonuses || jsonb_build_object('type', 'collection_complete', 'id', col, 'xp', 20); total := total + 20;
      end if;
    end loop;
  end if;

  insert into public.visits (user_id, landmark_id, visited_at, photo_url, points_awarded, note)
  values (uid, lm.id, eff_ts, p_photo_url, total, clean_note)
  on conflict (user_id, landmark_id) do nothing
  returning * into ins_visit;
  if ins_visit.id is null then
    select * into ins_visit from public.visits where user_id = uid and landmark_id = lm.id;
    return jsonb_build_object('ok', true, 'already', true, 'first_conquest', false,
      'base_xp', 0, 'bonuses', '[]'::jsonb, 'total_granted', 0, 'visit', to_jsonb(ins_visit));
  end if;

  if p_photo_url is not null then
    insert into public.landmark_photos (landmark_id, user_id, photo_url) values (lm.id, uid, p_photo_url);
  end if;

  return jsonb_build_object('ok', true, 'already', false, 'first_conquest', n > 0,
    'base_xp', base_xp, 'bonuses', bonuses, 'total_granted', total, 'visit', to_jsonb(ins_visit));
end;
$$;
revoke execute on function public.checkin_landmark(text, double precision, double precision, double precision, text, text, timestamptz) from public, anon;
grant execute on function public.checkin_landmark(text, double precision, double precision, double precision, text, text, timestamptz) to authenticated;

-- ============ קבוצות: יצירה והצטרפות דרך השרת ============
create or replace function public.create_group(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  clean text := btrim(coalesce(p_name, ''));
  gid uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if char_length(clean) < 1 or char_length(clean) > 60 then
    return jsonb_build_object('ok', false, 'error', 'invalid_name');
  end if;
  if not public.rl_hit('group:create:' || uid, 5, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  if (select count(*) from public.groups where created_by = uid) >= 20 then
    return jsonb_build_object('ok', false, 'error', 'too_many_groups');
  end if;
  insert into public.groups (name, created_by) values (clean, uid) returning id into gid;
  insert into public.group_members (group_id, user_id, role, status) values (gid, uid, 'owner', 'active');
  return jsonb_build_object('ok', true, 'group', jsonb_build_object('id', gid, 'name', clean, 'created_by', uid));
end;
$$;
revoke execute on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;

-- הצטרפות לפי מזהה קבוצה (הקישורים הישנים ?group=<uuid>). אידמפוטנטי, עם תקרת גודל.
create or replace function public.join_group(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  g record;
  n int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not public.rl_hit('group:join:' || uid, 20, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  select id, name into g from public.groups where id = p_group_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'group_not_found');
  end if;
  if exists (select 1 from public.group_members where group_id = g.id and user_id = uid) then
    return jsonb_build_object('ok', true, 'already', true, 'group', jsonb_build_object('id', g.id, 'name', g.name));
  end if;
  if (select count(*) from public.group_members where group_id = g.id) >= 100 then
    return jsonb_build_object('ok', false, 'error', 'group_full');
  end if;
  insert into public.group_members (group_id, user_id, role, status)
  values (g.id, uid, 'member', 'active')
  on conflict (group_id, user_id) do nothing;
  return jsonb_build_object('ok', true, 'already', false, 'group', jsonb_build_object('id', g.id, 'name', g.name));
end;
$$;
revoke execute on function public.join_group(uuid) from public, anon;
grant execute on function public.join_group(uuid) to authenticated;

-- ============ הזמנות: יצירה בשרת, מימוש אידמפוטנטי ============
-- הקוד נוצר בשרת (אקראיות קריפטוגרפית של Postgres, לא Math.random בדפדפן), יוצר מעגל רק חבר
-- בו (קודם אפשר היה ליצור הזמנה למעגל של מישהו אחר), ומכסת ההזמנות נאכפת כאן ולא רק ב-UI.
create or replace function public.gen_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  -- md5 מפזר אחיד את כל הביטים (ב-UUID גרסה 4 חלק מהבייטים קבועים), והקלט אקראי קריפטוגרפי
  bytes bytea := decode(md5(gen_random_uuid()::text || gen_random_uuid()::text), 'hex');
  code text := '';
  i int;
begin
  for i in 0..9 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end;
$$;

create or replace function public.create_invite(p_type text, p_circle_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row_inv record;
  quota int;
  used int;
  new_code text;
  attempt int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_type not in ('friend', 'circle') or (p_type = 'circle' and p_circle_id is null)
     or (p_type = 'friend' and p_circle_id is not null) then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;
  if not public.rl_hit('invite:create:' || uid, 20, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  if p_type = 'circle' and not public.is_group_member(p_circle_id) then
    return jsonb_build_object('ok', false, 'error', 'not_a_member');
  end if;

  select code into row_inv from public.invites
  where created_by = uid and invite_type = p_type and is_active
    and circle_id is not distinct from p_circle_id
    and (expires_at is null or expires_at > now())
    and (max_uses is null or uses < max_uses)
  order by created_at desc limit 1;
  if found then
    return jsonb_build_object('ok', true, 'code', row_inv.code);
  end if;

  select coalesce((select default_invites_per_user from public.app_settings where id = 1), 3)
       + coalesce((select bonus_invites from public.profiles where id = uid), 0) into quota;
  select count(*) into used from public.invites where created_by = uid;
  if used >= quota then
    return jsonb_build_object('ok', false, 'error', 'quota_exceeded');
  end if;

  for attempt in 1..5 loop
    new_code := public.gen_invite_code();
    begin
      insert into public.invites (code, created_by, invite_type, circle_id, max_uses, expires_at)
      values (new_code, uid, p_type, p_circle_id, 100, now() + interval '180 days');
      return jsonb_build_object('ok', true, 'code', new_code);
    exception when unique_violation then
      null;
    end;
  end loop;
  return jsonb_build_object('ok', false, 'error', 'try_again');
end;
$$;
revoke execute on function public.create_invite(text, uuid) from public, anon;
grant execute on function public.create_invite(text, uuid) to authenticated;

-- תצוגה מקדימה: עכשיו עם rate limit (מונע ניחוש קודים) ודורשת התחברות.
create or replace function public.get_invite_preview(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  inviter_name text;
  circle_name text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not public.rl_hit('invite:probe:' || auth.uid(), 60, interval '10 minutes') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  select * into inv from public.invites where code = p_code and is_active = true;
  if inv is null then
    return jsonb_build_object('ok', false, 'error', 'invite_not_found');
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'invite_expired');
  end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then
    return jsonb_build_object('ok', false, 'error', 'invite_maxed');
  end if;
  if inv.created_by = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'own_invite');
  end if;
  select name into inviter_name from public.profiles where id = inv.created_by;
  if inv.invite_type = 'circle' then
    select name into circle_name from public.groups where id = inv.circle_id;
  end if;
  return jsonb_build_object('ok', true, 'invite_type', inv.invite_type, 'inviter_name', inviter_name, 'circle_name', circle_name);
end;
$$;
revoke execute on function public.get_invite_preview(text) from public, anon;
grant execute on function public.get_invite_preview(text) to authenticated;

-- מימוש: המונה עולה רק כשנוצר קשר חדש בפועל (לחיצה כפולה/רענון לא שורפים שימושים), עם
-- rate limit, חשבון פעיל ותקרת גודל למעגל.
create or replace function public.redeem_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv record;
  n int := 0;
  st text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  select account_status into st from public.profiles where id = uid;
  if st is distinct from 'active' then
    return jsonb_build_object('ok', false, 'error', 'account_unavailable');
  end if;
  if not public.rl_hit('invite:redeem:' || uid, 30, interval '10 minutes') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  select * into inv from public.invites where code = p_code and is_active = true for update;
  if inv is null then
    return jsonb_build_object('ok', false, 'error', 'invite_not_found');
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'invite_expired');
  end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then
    return jsonb_build_object('ok', false, 'error', 'invite_maxed');
  end if;
  if inv.created_by = uid then
    return jsonb_build_object('ok', false, 'error', 'own_invite');
  end if;

  if inv.invite_type = 'friend' then
    insert into public.friendships (requester_id, addressee_id, status, accepted_at)
    values (inv.created_by, uid, 'accepted', now())
    on conflict (user_low, user_high) do nothing;
    get diagnostics n = row_count;
  elsif inv.invite_type = 'circle' then
    if not exists (select 1 from public.groups where id = inv.circle_id) then
      return jsonb_build_object('ok', false, 'error', 'invite_not_found');
    end if;
    if not exists (select 1 from public.group_members where group_id = inv.circle_id and user_id = uid)
       and (select count(*) from public.group_members where group_id = inv.circle_id) >= 100 then
      return jsonb_build_object('ok', false, 'error', 'group_full');
    end if;
    insert into public.group_members (group_id, user_id, role, status)
    values (inv.circle_id, uid, 'member', 'active')
    on conflict (group_id, user_id) do nothing;
    get diagnostics n = row_count;
  end if;

  if n > 0 then
    update public.invites set uses = uses + 1 where id = inv.id;
  end if;

  return jsonb_build_object('ok', true, 'invite_type', inv.invite_type, 'circle_id', inv.circle_id, 'already', n = 0);
end;
$$;
revoke execute on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

-- ============ דיווחי שטח: קריאה ללא זהות הכותב ============
-- הטבלה חשפה user_id + יעד + זמן לכל אחד (היסטוריית מיקומים). ב-lockdown ה-SELECT הציבורי נסגר;
-- הלקוח קורא דרך הפונקציה הזו שמחזירה רק את הנתונים עצמם.
create or replace function public.get_landmark_field_reports(p_landmark_id text)
returns table(water_level text, crowding text, parking text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select water_level, crowding, parking, created_at
  from public.field_reports
  where landmark_id = p_landmark_id
  order by created_at desc
  limit 30;
$$;
grant execute on function public.get_landmark_field_reports(text) to authenticated, anon;

-- ============ Push: אימות נקודת-הקצה (מונע SSRF דרך ה-Edge Function ששולחת אליה) ============
create or replace function public.save_push_subscription(
  _endpoint text,
  _p256dh text,
  _auth_key text,
  _user_agent text default null
) returns void as $$
declare
  host text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if _endpoint is null or char_length(_endpoint) > 1000 or _endpoint !~* '^https://[^/?#@[:space:]]+' then
    raise exception 'invalid endpoint';
  end if;
  host := lower(substring(_endpoint from '^https://([^/:?#]+)'));
  if host is null or host !~ '\.' or host ~ '^[0-9.]+$' or host ~ '(^|\.)(local|localhost|internal|lan|home)$' then
    raise exception 'invalid endpoint';
  end if;
  if _p256dh is null or _auth_key is null or char_length(_p256dh) > 200 or char_length(_auth_key) > 100 then
    raise exception 'invalid keys';
  end if;
  if not public.rl_hit('push:save:' || auth.uid(), 30, interval '1 hour') then
    return;
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
revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- ============ הרשמה: שם מוגבל באורכו ============
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(left(btrim(new.raw_user_meta_data->>'name'), 60), ''), 'מטייל/ת חדש/ה'));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============ מחיקת חשבון: קבוצות עם חברים אחרים עוברות לבעלות חבר אחר ============
-- groups.created_by מוגדר on delete cascade, כלומר מחיקת חשבון של יוצר הייתה מוחקת את הקבוצה
-- כולה, על כל החברים והפעילות שלהם. עכשיו הבעלות עוברת לחבר הוותיק ביותר; קבוצה בלי חברים
-- אחרים נמחקת כרגיל.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  g record;
  new_owner uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  for g in select id from public.groups where created_by = uid loop
    select user_id into new_owner from public.group_members
    where group_id = g.id and user_id <> uid and status = 'active'
    order by (role = 'admin') desc, joined_at asc limit 1;
    if new_owner is not null then
      update public.groups set created_by = new_owner where id = g.id;
      update public.group_members set role = 'owner' where group_id = g.id and user_id = new_owner;
    end if;
  end loop;
  delete from auth.users where id = uid;
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ============ סגירת הרצה אנונימית של פונקציות ניהול ============
revoke execute on function public.get_admin_stats() from public, anon;
revoke execute on function public.get_admin_users_list(int) from public, anon;
revoke execute on function public.get_event_counts() from public, anon;
revoke execute on function public.get_group_preview(uuid) from public, anon;

-- ============ שלמות נתונים: מחיקת יעד לא מוחקת בשקט את הכיבושים של משתמשים ============
-- visits / landmark_conquests / wishlist / ... מוגדרים on delete cascade על landmarks, כך ש-
-- "delete from landmarks" (למשל בניקוי כפילויות) מוחק לכל המשתמשים את הביקורים, ה-XP ואת
-- ההתקדמות שלהם ביעד, בלי שום אזהרה. הטריגר חוסם מחיקה של יעד שיש עליו נתוני משתמשים.
--   * לאיחוד כפילות: select public.merge_landmarks('<כפילות>', '<היעד שנשאר>');
--     (מעביר ביקורים / כיבושים / מועדפים / תמונות ואז מוחק).
--   * למחיקה מכוונת אחרי בדיקה:  set local app.allow_landmark_delete = 'on';  לפני ה-delete.
create or replace function public.tg_guard_landmark_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.allow_landmark_delete', true) = 'on' then
    return old;
  end if;
  if exists (select 1 from public.visits where landmark_id = old.id)
     or exists (select 1 from public.landmark_conquests where landmark_id = old.id) then
    raise exception 'landmark % has user visits/conquests: use merge_landmarks(from, to), or set app.allow_landmark_delete = on to delete on purpose', old.id
      using errcode = '23503';
  end if;
  return old;
end;
$$;
revoke execute on function public.tg_guard_landmark_delete() from public, anon, authenticated;
drop trigger if exists guard_landmark_delete on public.landmarks;
create trigger guard_landmark_delete before delete on public.landmarks
  for each row execute function public.tg_guard_landmark_delete();

create or replace function public.merge_landmarks(p_from text, p_to text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_from is null or p_to is null or p_from = p_to then
    raise exception 'invalid merge arguments';
  end if;
  if not exists (select 1 from public.landmarks where id = p_from) or not exists (select 1 from public.landmarks where id = p_to) then
    raise exception 'unknown landmark';
  end if;
  -- משתמש שכבר יש לו רשומה ביעד הנשאר שומר עליה; השאר עוברות ליעד הנשאר
  delete from public.visits v where v.landmark_id = p_from
    and exists (select 1 from public.visits w where w.user_id = v.user_id and w.landmark_id = p_to);
  update public.visits set landmark_id = p_to where landmark_id = p_from;
  delete from public.landmark_conquests c where c.landmark_id = p_from
    and exists (select 1 from public.landmark_conquests w where w.user_id = c.user_id and w.landmark_id = p_to);
  update public.landmark_conquests set landmark_id = p_to where landmark_id = p_from;
  delete from public.wishlist c where c.landmark_id = p_from
    and exists (select 1 from public.wishlist w where w.user_id = c.user_id and w.landmark_id = p_to);
  update public.wishlist set landmark_id = p_to where landmark_id = p_from;
  delete from public.group_destination_votes c where c.landmark_id = p_from
    and exists (select 1 from public.group_destination_votes w where w.group_id = c.group_id and w.user_id = c.user_id and w.landmark_id = p_to);
  update public.group_destination_votes set landmark_id = p_to where landmark_id = p_from;
  update public.landmark_photos set landmark_id = p_to where landmark_id = p_from;
  update public.field_reports set landmark_id = p_to where landmark_id = p_from;
  update public.place_corrections set landmark_id = p_to where landmark_id = p_from;
  perform set_config('app.allow_landmark_delete', 'on', true);
  delete from public.landmarks where id = p_from;
  perform set_config('app.allow_landmark_delete', 'off', true);
end;
$$;
revoke execute on function public.merge_landmarks(text, text) from public, anon, authenticated;
