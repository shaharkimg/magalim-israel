-- החידה השבועית: חידה על מקום, שמתפרסמת כל שישי ב-08:00 (שעון ישראל) ופעילה שבוע.
--
-- התשובה (landmark_id) נשמרת רק כאן. לטבלאות אין שום מדיניות קריאה ללקוח - הלקוח מקבל רק
-- את הרמזים דרך get_weekly_mystery(), וניחוש נבדק בשרת ב-guess_mystery(), שמחזירה רק
-- "נכון/לא נכון". אחרת כל מי שפותח את כלי הפיתוח בדפדפן היה רואה את התשובה.
--
-- הרמזים נפתחים לפי לוח זמנים שהשרת אוכף (לא הלקוח):
--   שישי 08:00  - החידה
--   ראשון 08:00 - רמז נוסף (טקסט שהמנהל כותב, לא חובה)
--   שלישי 08:00 - אזור על המפה: עיגול ברדיוס 15 ק"מ שהמקום בתוכו. המרכז מוזז אקראית
--                 (עד 60% מהרדיוס) כדי שמרכז העיגול לא יהיה התשובה.
-- 8 ניחושים לחידה למשתמש, כדי שאי אפשר יהיה פשוט לנסות את כל ~1,500 היעדים.
--
-- כתיבה רק דרך admin_save_mystery / admin_delete_mystery (בודקות is_admin בפנים, אותו דפוס
-- כמו admin_add_landmark). אפשר ליצור/לערוך/למחוק רק חידה שעוד לא פורסמה.
-- בטוח להרצה חוזרת.

create table if not exists public.weekly_mysteries (
  id uuid primary key default gen_random_uuid(),
  landmark_id text not null references public.landmarks(id) on delete cascade,
  release_at timestamptz not null unique,
  riddle text not null check (char_length(riddle) between 5 and 500),
  hint text check (hint is null or char_length(hint) <= 300),
  area_lat double precision not null,
  area_lon double precision not null,
  area_radius_km numeric not null default 15,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.mystery_solves (
  mystery_id uuid not null references public.weekly_mysteries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  solved_at timestamptz not null default now(),
  primary key (mystery_id, user_id)
);
create index if not exists mystery_solves_user_idx on public.mystery_solves (user_id);

create table if not exists public.mystery_guesses (
  mystery_id uuid not null references public.weekly_mysteries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  landmark_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists mystery_guesses_user_idx on public.mystery_guesses (mystery_id, user_id);

-- בלי מדיניות = בלי גישה ישירה. גם ה-grants מוסרים, ליתר ביטחון.
alter table public.weekly_mysteries enable row level security;
alter table public.mystery_solves enable row level security;
alter table public.mystery_guesses enable row level security;
revoke all on public.weekly_mysteries, public.mystery_solves, public.mystery_guesses from anon, authenticated;

-- ============ קריאה: החידה הפעילה, בלי התשובה ============
create or replace function public.get_weekly_mystery()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m public.weekly_mysteries%rowtype;
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_solved_at timestamptz;
  v_guesses int := 0;
  v_total int := 0;
begin
  if v_uid is not null then
    select count(*) into v_total from public.mystery_solves where user_id = v_uid;
  end if;
  select * into m from public.weekly_mysteries
    where release_at <= v_now and release_at > v_now - interval '7 days'
    order by release_at desc limit 1;
  if not found then
    return jsonb_build_object('mystery', null, 'my_total_solves', v_total);
  end if;
  if v_uid is not null then
    select solved_at into v_solved_at from public.mystery_solves where mystery_id = m.id and user_id = v_uid;
    select count(*) into v_guesses from public.mystery_guesses where mystery_id = m.id and user_id = v_uid;
  end if;
  return jsonb_build_object(
    'mystery', jsonb_build_object(
      'id', m.id,
      'release_at', m.release_at,
      'ends_at', m.release_at + interval '7 days',
      'riddle', m.riddle,
      'hint', case when v_now >= m.release_at + interval '2 days' then m.hint end,
      'has_hint', m.hint is not null,
      'hint_at', m.release_at + interval '2 days',
      'area', case when v_now >= m.release_at + interval '4 days'
                   then jsonb_build_object('lat', m.area_lat, 'lon', m.area_lon, 'radius_km', m.area_radius_km) end,
      'area_at', m.release_at + interval '4 days',
      'solvers', (select count(*) from public.mystery_solves s where s.mystery_id = m.id),
      'solved', v_solved_at is not null,
      'my_rank', case when v_solved_at is not null then
                   (select count(*) from public.mystery_solves s where s.mystery_id = m.id and s.solved_at <= v_solved_at) end,
      'answer', case when v_solved_at is not null then m.landmark_id end,
      'guesses_left', greatest(0, 8 - v_guesses)
    ),
    'my_total_solves', v_total
  );
end;
$$;
revoke execute on function public.get_weekly_mystery() from public;
grant execute on function public.get_weekly_mystery() to anon, authenticated;

-- ============ ניחוש ============
create or replace function public.guess_mystery(p_mystery_id uuid, p_landmark_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.weekly_mysteries%rowtype;
  v_uid uuid := auth.uid();
  v_guesses int;
  v_rank int;
  v_solved_at timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;
  select * into m from public.weekly_mysteries
    where id = p_mystery_id and release_at <= now() and release_at > now() - interval '7 days';
  if not found then
    return jsonb_build_object('error', 'not_active');
  end if;
  -- ניחושים מקבילים של אותו משתמש לאותה חידה עוברים אחד-אחד, כדי שלא יעקפו את מגבלת ה-8
  perform pg_advisory_xact_lock(hashtext(m.id::text || ':' || v_uid::text));

  select solved_at into v_solved_at from public.mystery_solves where mystery_id = m.id and user_id = v_uid;
  if v_solved_at is not null then
    select count(*) into v_rank from public.mystery_solves where mystery_id = m.id and solved_at <= v_solved_at;
    return jsonb_build_object('correct', true, 'already', true, 'answer', m.landmark_id, 'rank', v_rank);
  end if;

  select count(*) into v_guesses from public.mystery_guesses where mystery_id = m.id and user_id = v_uid;
  if v_guesses >= 8 then
    return jsonb_build_object('error', 'no_guesses_left', 'guesses_left', 0);
  end if;
  insert into public.mystery_guesses (mystery_id, user_id, landmark_id)
    values (m.id, v_uid, left(coalesce(p_landmark_id, ''), 100));

  if p_landmark_id = m.landmark_id then
    insert into public.mystery_solves (mystery_id, user_id) values (m.id, v_uid)
      on conflict do nothing
      returning solved_at into v_solved_at;
    select count(*) into v_rank from public.mystery_solves where mystery_id = m.id and solved_at <= v_solved_at;
    return jsonb_build_object('correct', true, 'answer', m.landmark_id, 'rank', v_rank,
      'my_total_solves', (select count(*) from public.mystery_solves where user_id = v_uid));
  end if;
  return jsonb_build_object('correct', false, 'guesses_left', 8 - v_guesses - 1);
end;
$$;
revoke execute on function public.guess_mystery(uuid, text) from public, anon;
grant execute on function public.guess_mystery(uuid, text) to authenticated;

-- ============ ניהול ============
create or replace function public._is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and coalesce((select pr.is_admin from public.profiles pr where pr.id = auth.uid()), false);
$$;
revoke execute on function public._is_admin() from public, anon, authenticated;

-- p: { release_date: 'YYYY-MM-DD' (יום שישי), landmark_id, riddle, hint? }
-- חידה קיימת לאותו שישי מתעדכנת (רק לפני שפורסמה). מחזירה {"mystery": {...}} או {"error": "..."}.
create or replace function public.admin_save_mystery(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
  v_release timestamptz;
  v_lm public.landmarks%rowtype;
  v_riddle text := btrim(coalesce(p->>'riddle', ''));
  v_hint text := nullif(btrim(coalesce(p->>'hint', '')), '');
  v_existing public.weekly_mysteries%rowtype;
  v_ang double precision;
  v_dist double precision;
  v_lat double precision;
  v_lon double precision;
  row public.weekly_mysteries%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;
  if not public._is_admin() then
    return jsonb_build_object('error', 'not_authorized');
  end if;
  begin
    v_date := (p->>'release_date')::date;
  exception when others then
    return jsonb_build_object('error', 'invalid_date');
  end;
  if v_date is null then
    return jsonb_build_object('error', 'invalid_date');
  end if;
  if extract(isodow from v_date) <> 5 then
    return jsonb_build_object('error', 'not_friday');
  end if;
  v_release := (v_date + time '08:00') at time zone 'Asia/Jerusalem';
  if v_release <= now() then
    return jsonb_build_object('error', 'already_released');
  end if;
  select * into v_lm from public.landmarks where id = p->>'landmark_id';
  if not found then
    return jsonb_build_object('error', 'invalid_landmark');
  end if;
  if char_length(v_riddle) < 5 or char_length(v_riddle) > 500 then
    return jsonb_build_object('error', 'invalid_riddle');
  end if;
  if v_hint is not null and char_length(v_hint) > 300 then
    return jsonb_build_object('error', 'invalid_hint');
  end if;

  select * into v_existing from public.weekly_mysteries where release_at = v_release;
  if found and v_existing.landmark_id = v_lm.id then
    -- אותו מקום: שומרים על אותו עיגול (שלא "יקפוץ" בין עריכות)
    v_lat := v_existing.area_lat; v_lon := v_existing.area_lon;
  else
    v_ang := random() * 2 * pi();
    v_dist := sqrt(random()) * 15 * 0.6;
    v_lat := v_lm.lat + (v_dist * cos(v_ang)) / 111.0;
    v_lon := v_lm.lon + (v_dist * sin(v_ang)) / (111.0 * cos(radians(v_lm.lat)));
  end if;

  insert into public.weekly_mysteries (landmark_id, release_at, riddle, hint, area_lat, area_lon, created_by)
    values (v_lm.id, v_release, v_riddle, v_hint, v_lat, v_lon, auth.uid())
  on conflict (release_at) do update
    set landmark_id = excluded.landmark_id, riddle = excluded.riddle, hint = excluded.hint,
        area_lat = excluded.area_lat, area_lon = excluded.area_lon
  returning * into row;

  return jsonb_build_object('mystery', jsonb_build_object(
    'id', row.id, 'release_at', row.release_at, 'landmark_id', row.landmark_id));
end;
$$;
revoke execute on function public.admin_save_mystery(jsonb) from public, anon;
grant execute on function public.admin_save_mystery(jsonb) to authenticated;

create or replace function public.admin_delete_mystery(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_release timestamptz;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;
  if not public._is_admin() then
    return jsonb_build_object('error', 'not_authorized');
  end if;
  select release_at into v_release from public.weekly_mysteries where id = p_id;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;
  if v_release <= now() then
    return jsonb_build_object('error', 'already_released');
  end if;
  delete from public.weekly_mysteries where id = p_id;
  return jsonb_build_object('deleted', true);
end;
$$;
revoke execute on function public.admin_delete_mystery(uuid) from public, anon;
grant execute on function public.admin_delete_mystery(uuid) to authenticated;

-- החידות הקרובות + 4 האחרונות, עם התשובה (רק למנהל)
create or replace function public.admin_list_mysteries()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public._is_admin() then
    return jsonb_build_object('error', 'not_authorized');
  end if;
  return jsonb_build_object('mysteries', coalesce((
    select jsonb_agg(x order by x.release_at desc) from (
      select m.id, m.release_at, m.landmark_id, l.name as landmark_name, m.riddle, m.hint,
             (select count(*) from public.mystery_solves s where s.mystery_id = m.id) as solvers,
             (select count(distinct g.user_id) from public.mystery_guesses g where g.mystery_id = m.id) as players
      from public.weekly_mysteries m
      left join public.landmarks l on l.id = m.landmark_id
      where m.release_at > now() - interval '28 days'
    ) x), '[]'::jsonb));
end;
$$;
revoke execute on function public.admin_list_mysteries() from public, anon;
grant execute on function public.admin_list_mysteries() to authenticated;

-- ============ 4 החידות הראשונות ============
-- כדי שתהיה חידה כבר בשישי הקרוב. אפשר לערוך או למחוק אותן במסך הניהול עד שהן מתפרסמות.
-- מוכנסות רק אם היעד קיים, ולא דורסות חידה שכבר נקבעה לאותו שישי.
insert into public.weekly_mysteries (landmark_id, release_at, riddle, hint, area_lat, area_lon)
select s.landmark_id, (s.d + time '08:00') at time zone 'Asia/Jerusalem', s.riddle, s.hint,
       l.lat + 0.05, l.lon - 0.04
from (values
  ('roshhanikra', date '2026-11-20',
   'הים חצב כאן מערות בסלע לבן. פעם עברה כאן רכבת בדרך לביירות, והיום יורדים אליו בקרונית.',
   'עוד צעד אחד צפונה, וכבר יוצאים מהארץ.'),
  ('stalactite-cave', date '2026-11-27',
   'פיצוץ במחצבה חשף עולם שגדל סנטימטר אחד בכל כמה מאות שנים. בפנים תמיד אותה טמפרטורה, גם באוגוסט.',
   'הרי ירושלים, לא רחוק מבית שמש.'),
  ('gan-hashlosha', date '2026-12-04',
   'המים כאן בטמפרטורה של אמבטיה כל השנה, ושלושה אנשים נתנו למקום את שמו.',
   'בין הגלבוע לבית שאן.'),
  ('einavdat', date '2026-12-11',
   'קניון לבן במדבר, בריכה ירוקה בתחתיתו ונשרים שמקננים בצוקים. ראש ממשלה ראשון גר לא רחוק משם.',
   'בדרום, מתחת למצוק. אחרי גשם - זהירות משיטפונות.')
) as s(landmark_id, d, riddle, hint)
join public.landmarks l on l.id = s.landmark_id
on conflict (release_at) do nothing;
