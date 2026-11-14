-- Weekly mystery: the answer never reaches a client, hints unlock on the server's clock,
-- guesses are capped, and only admins can schedule riddles (and only future ones).
\set ON_ERROR_STOP on
\set QUIET on
reset role;
insert into auth.users (id, email) values
  ('a1a1a1a1-0000-0000-0000-000000000011', 'myst-admin@example.com'),
  ('b2b2b2b2-0000-0000-0000-000000000012', 'myst-u1@example.com'),
  ('c3c3c3c3-0000-0000-0000-000000000013', 'myst-u2@example.com')
on conflict do nothing;
insert into public.profiles (id, name, is_admin) values
  ('a1a1a1a1-0000-0000-0000-000000000011', 'Mystery Admin', true),
  ('b2b2b2b2-0000-0000-0000-000000000012', 'Player One', false),
  ('c3c3c3c3-0000-0000-0000-000000000013', 'Player Two', false)
on conflict (id) do update set is_admin = excluded.is_admin;
insert into public.landmarks (id, name, description, category, difficulty, region, lat, lon, duration, distance_km) values
  ('myst-answer', 'מקום החידה', 'x', 'water', 'easy', 'north', 33.0, 35.5, 'שעה', 1),
  ('myst-other',  'מקום אחר',   'x', 'water', 'easy', 'north', 32.5, 35.0, 'שעה', 1)
on conflict (id) do nothing;
delete from public.weekly_mysteries;
-- released an hour ago: riddle only
insert into public.weekly_mysteries (id, landmark_id, release_at, riddle, hint, area_lat, area_lon)
values ('d4d4d4d4-0000-0000-0000-000000000014', 'myst-answer', now() - interval '1 hour',
        'חידת בדיקה על מקום', 'רמז בדיקה', 33.05, 35.45);

-- ---- reading
set role anon;
select tt.as_user('');
select public.get_weekly_mystery() as g \gset
select tt.ok((:'g'::jsonb->'mystery'->>'riddle') = 'חידת בדיקה על מקום', 'guest sees the riddle');
select tt.ok((:'g'::jsonb->'mystery'->>'answer') is null, 'guest never gets the answer');
select tt.ok(position('myst-answer' in :'g') = 0, 'the answer id appears nowhere in the payload');
select tt.ok((:'g'::jsonb->'mystery'->>'hint') is null, 'hint is locked on day 0');
select tt.ok((:'g'::jsonb->'mystery'->'area') = 'null'::jsonb, 'map area is locked on day 0');
select tt.ok(tt.fails($$select * from public.weekly_mysteries$$) is not null, 'guest cannot read the mysteries table');
select tt.ok(tt.fails($$select public.guess_mystery('d4d4d4d4-0000-0000-0000-000000000014', 'myst-answer')$$) is not null, 'guest cannot guess');

set role authenticated;
select tt.as_user('b2b2b2b2-0000-0000-0000-000000000012');
select tt.ok(tt.fails($$select landmark_id from public.weekly_mysteries$$) is not null, 'user cannot read the answer column');
select tt.ok(tt.fails($$insert into public.mystery_solves (mystery_id, user_id) values ('d4d4d4d4-0000-0000-0000-000000000014', 'b2b2b2b2-0000-0000-0000-000000000012')$$) is not null, 'user cannot mark themselves as solved');
select tt.ok(tt.fails($$select * from public.mystery_guesses$$) is not null, 'user cannot read other people''s guesses');

-- ---- guessing
select public.guess_mystery('d4d4d4d4-0000-0000-0000-000000000014', 'myst-other') as r \gset
select tt.ok((:'r'::jsonb->>'correct')::boolean = false and (:'r'::jsonb->>'guesses_left')::int = 7, 'wrong guess: 7 left');
select tt.ok((:'r'::jsonb->>'answer') is null, 'a wrong guess does not reveal the answer');
select public.guess_mystery('d4d4d4d4-0000-0000-0000-000000000014', 'myst-other') from generate_series(1, 7);
select tt.ok((public.guess_mystery('d4d4d4d4-0000-0000-0000-000000000014', 'myst-answer')->>'error') = 'no_guesses_left', 'after 8 guesses even the right answer is refused');
select tt.ok((public.get_weekly_mystery()->'mystery'->>'guesses_left')::int = 0, 'guesses_left reaches 0');

select tt.as_user('c3c3c3c3-0000-0000-0000-000000000013');
select public.guess_mystery('d4d4d4d4-0000-0000-0000-000000000014', 'myst-answer') as r \gset
select tt.ok((:'r'::jsonb->>'correct')::boolean and (:'r'::jsonb->>'answer') = 'myst-answer' and (:'r'::jsonb->>'rank')::int = 1, 'right guess: solved, first');
select tt.ok((public.guess_mystery('d4d4d4d4-0000-0000-0000-000000000014', 'myst-other')->>'already')::boolean, 'guessing again after solving changes nothing');
select public.get_weekly_mystery() as g \gset
select tt.ok((:'g'::jsonb->'mystery'->>'solved')::boolean and (:'g'::jsonb->'mystery'->>'answer') = 'myst-answer', 'solver sees the answer');
select tt.ok((:'g'::jsonb->'mystery'->>'solvers')::int = 1 and (:'g'::jsonb->>'my_total_solves')::int = 1, 'solver counts');
select tt.ok((public.guess_mystery('00000000-0000-0000-0000-000000000000', 'myst-answer')->>'error') = 'not_active', 'unknown mystery is not active');

-- ---- hints unlock on the server clock
reset role;
update public.weekly_mysteries set release_at = now() - interval '2 days 1 hour' where id = 'd4d4d4d4-0000-0000-0000-000000000014';
set role anon; select tt.as_user('');
select public.get_weekly_mystery() as g \gset
select tt.ok((:'g'::jsonb->'mystery'->>'hint') = 'רמז בדיקה', 'hint unlocks after 2 days');
select tt.ok((:'g'::jsonb->'mystery'->'area') = 'null'::jsonb, 'area still locked after 2 days');
reset role;
update public.weekly_mysteries set release_at = now() - interval '4 days 1 hour' where id = 'd4d4d4d4-0000-0000-0000-000000000014';
set role anon; select tt.as_user('');
select public.get_weekly_mystery() as g \gset
select tt.ok((:'g'::jsonb->'mystery'->'area'->>'radius_km')::numeric = 15, 'map area unlocks after 4 days');
reset role;
update public.weekly_mysteries set release_at = now() - interval '7 days 1 hour' where id = 'd4d4d4d4-0000-0000-0000-000000000014';
set role anon; select tt.as_user('');
select tt.ok((public.get_weekly_mystery()->'mystery') = 'null'::jsonb, 'a week later the mystery is over');
reset role;
update public.weekly_mysteries set release_at = now() + interval '1 day' where id = 'd4d4d4d4-0000-0000-0000-000000000014';
set role anon; select tt.as_user('');
select tt.ok((public.get_weekly_mystery()->'mystery') = 'null'::jsonb, 'a future mystery is invisible before release');

-- ---- admin
set role authenticated;
select tt.as_user('b2b2b2b2-0000-0000-0000-000000000012');
select tt.ok((public.admin_save_mystery('{"release_date":"2099-01-02","landmark_id":"myst-answer","riddle":"חידה חדשה"}')->>'error') = 'not_authorized', 'non-admin cannot schedule a mystery');
select tt.ok((public.admin_list_mysteries()->>'error') = 'not_authorized', 'non-admin cannot list mysteries (with answers)');

select tt.as_user('a1a1a1a1-0000-0000-0000-000000000011');
-- 2099-01-02 is a Friday, 2099-01-03 a Saturday
select tt.ok((public.admin_save_mystery('{"release_date":"2099-01-03","landmark_id":"myst-answer","riddle":"חידה חדשה"}')->>'error') = 'not_friday', 'only Fridays');
select tt.ok((public.admin_save_mystery('{"release_date":"2020-01-03","landmark_id":"myst-answer","riddle":"חידה חדשה"}')->>'error') = 'already_released', 'cannot schedule in the past');
select tt.ok((public.admin_save_mystery('{"release_date":"nope","landmark_id":"myst-answer","riddle":"חידה חדשה"}')->>'error') = 'invalid_date', 'bad date is rejected');
select tt.ok((public.admin_save_mystery('{"release_date":"2099-01-02","landmark_id":"no-such-place","riddle":"חידה חדשה"}')->>'error') = 'invalid_landmark', 'unknown landmark is rejected');
select tt.ok((public.admin_save_mystery('{"release_date":"2099-01-02","landmark_id":"myst-answer","riddle":"קצר"}')->>'error') = 'invalid_riddle', 'too-short riddle is rejected');
select public.admin_save_mystery('{"release_date":"2099-01-02","landmark_id":"myst-answer","riddle":"חידה חדשה","hint":"רמז"}') as s \gset
select tt.ok((:'s'::jsonb->'mystery'->>'id') is not null, 'admin schedules a Friday mystery');
reset role;
select tt.ok((select to_char(release_at at time zone 'Asia/Jerusalem', 'HH24:MI') from public.weekly_mysteries where id = (:'s'::jsonb->'mystery'->>'id')::uuid) = '08:00', 'released at 08:00 Israel time');
select tt.ok((select 6371 * 2 * asin(sqrt(power(sin(radians(area_lat - 33.0) / 2), 2) + cos(radians(33.0)) * cos(radians(area_lat)) * power(sin(radians(area_lon - 35.5) / 2), 2))) < 15
              from public.weekly_mysteries where id = (:'s'::jsonb->'mystery'->>'id')::uuid), 'the place is inside the map circle');
select area_lat as lat1 from public.weekly_mysteries where id = (:'s'::jsonb->'mystery'->>'id')::uuid \gset
set role authenticated; select tt.as_user('a1a1a1a1-0000-0000-0000-000000000011');
select public.admin_save_mystery('{"release_date":"2099-01-02","landmark_id":"myst-answer","riddle":"חידה ערוכה"}') as s2 \gset
reset role;
select tt.ok((select riddle = 'חידה ערוכה' and area_lat = :lat1 and hint is null from public.weekly_mysteries where release_at = ('2099-01-02 08:00'::timestamp at time zone 'Asia/Jerusalem')), 'editing keeps the same circle');
set role authenticated; select tt.as_user('a1a1a1a1-0000-0000-0000-000000000011');
select tt.ok(jsonb_array_length(public.admin_list_mysteries()->'mysteries') >= 1, 'admin lists mysteries');
select tt.ok((public.admin_delete_mystery((:'s'::jsonb->'mystery'->>'id')::uuid)->>'deleted')::boolean, 'admin deletes an unreleased mystery');
reset role;
update public.weekly_mysteries set release_at = now() - interval '1 hour' where id = 'd4d4d4d4-0000-0000-0000-000000000014';
set role authenticated; select tt.as_user('a1a1a1a1-0000-0000-0000-000000000011');
select tt.ok((public.admin_delete_mystery('d4d4d4d4-0000-0000-0000-000000000014')->>'error') = 'already_released', 'a released mystery cannot be deleted');
reset role;

-- ---- alternate answers (round 2): the same place listed twice must not be "wrong"
reset role;
insert into public.landmarks (id, name, description, category, difficulty, region, lat, lon, duration, distance_km) values
  ('myst-answer-dup', 'מקום החידה - חוף', 'x', 'water', 'easy', 'north', 33.001, 35.501, 'שעה', 1)
on conflict (id) do nothing;
insert into public.weekly_mysteries (id, landmark_id, alt_landmark_ids, release_at, riddle, area_lat, area_lon)
values ('e5e5e5e5-0000-0000-0000-000000000015', 'myst-answer', array['myst-answer-dup'], now() - interval '6 days 23 hours', 'חידה עם תשובה חלופית', 33.05, 35.45);
delete from public.weekly_mysteries where id = 'd4d4d4d4-0000-0000-0000-000000000014';
set role anon; select tt.as_user('');
select tt.ok(position('myst-answer-dup' in public.get_weekly_mystery()::text) = 0, 'alternate answers are not leaked either');
set role authenticated;
select tt.as_user('b2b2b2b2-0000-0000-0000-000000000012');
select public.guess_mystery('e5e5e5e5-0000-0000-0000-000000000015', 'myst-answer-dup') as r \gset
select tt.ok((:'r'::jsonb->>'correct')::boolean, 'an alternate entry of the same place is accepted');
select tt.ok((:'r'::jsonb->>'answer') = 'myst-answer', 'the canonical answer is what the solver is shown');
select tt.as_user('c3c3c3c3-0000-0000-0000-000000000013');
select tt.ok((public.guess_mystery('e5e5e5e5-0000-0000-0000-000000000015', 'myst-other')->>'correct')::boolean = false, 'a different place is still wrong');
reset role;
