-- Admin add-landmark RPC: runs after the lockdown phase (the final schema state).
\set ON_ERROR_STOP on
\set QUIET on
reset role;
insert into auth.users (id, email) values
  ('eeeeeeee-0000-0000-0000-000000000005', 'admin@example.com'),
  ('ffffffff-0000-0000-0000-000000000006', 'user@example.com')
on conflict do nothing;
insert into public.profiles (id, name, is_admin) values
  ('eeeeeeee-0000-0000-0000-000000000005', 'Admin', true),
  ('ffffffff-0000-0000-0000-000000000006', 'Regular', false)
on conflict (id) do update set is_admin = excluded.is_admin;
set role authenticated;

\set ok_payload '{"name":"מסלול בדיקה","description":"תיאור","category":"water","region":"center","difficulty":"easy","lat":32.3672,"lon":34.9079,"distance_km":3,"duration_hours":1,"family_friendly":true}'

select tt.as_user('');
select tt.ok((public.admin_add_landmark(:'ok_payload'::jsonb)->>'error') = 'not_authenticated', 'guest cannot add a landmark');

select tt.as_user('ffffffff-0000-0000-0000-000000000006');
select tt.ok((public.admin_add_landmark(:'ok_payload'::jsonb)->>'error') = 'not_authorized', 'non-admin cannot add a landmark');
select tt.ok(tt.fails($$insert into public.landmarks (id, name, description, category, difficulty, region, lat, lon, duration, distance_km) values ('x', 'x', 'x', 'water', 'easy', 'center', 32, 35, 'x', 1)$$) is not null, 'direct insert into landmarks is denied');

select tt.as_user('eeeeeeee-0000-0000-0000-000000000005');
select tt.ok((public.admin_add_landmark(jsonb_set(:'ok_payload'::jsonb, '{category}', '"bogus"'))->>'error') = 'invalid_category', 'unknown category is rejected');
select tt.ok((public.admin_add_landmark(jsonb_set(:'ok_payload'::jsonb, '{region}', '"mars"'))->>'error') = 'invalid_region', 'unknown region is rejected');
select tt.ok((public.admin_add_landmark(jsonb_set(:'ok_payload'::jsonb, '{lat}', '40'))->>'error') = 'invalid_location', 'location outside Israel is rejected');
select tt.ok((public.admin_add_landmark(jsonb_set(:'ok_payload'::jsonb, '{lat}', '"abc"'))->>'error') = 'invalid_number', 'non-numeric latitude is rejected');
select tt.ok((public.admin_add_landmark(jsonb_set(:'ok_payload'::jsonb, '{name}', '" "'))->>'error') = 'invalid_name', 'blank name is rejected');
select tt.ok((public.admin_add_landmark(jsonb_set(:'ok_payload'::jsonb, '{official_url}', '"javascript:alert(1)"'))->>'error') = 'invalid_url', 'non-http url is rejected');

select public.admin_add_landmark(:'ok_payload'::jsonb) as r \gset
select tt.ok((:'r'::jsonb->'landmark'->>'id') like 'adm-%', 'admin adds a landmark');
select tt.ok((select count(*) from public.landmarks where name = 'מסלול בדיקה') = 1, 'landmark row exists');
select tt.ok((select family_friendly and not dog_friendly and base_visits = 0 from public.landmarks where name = 'מסלול בדיקה'), 'flags and defaults are stored');
select tt.ok((public.admin_add_landmark(:'ok_payload'::jsonb)->>'error') = 'name_exists', 'duplicate name is rejected');
select tt.ok((public.admin_add_landmark(jsonb_set(:'ok_payload'::jsonb, '{allow_duplicate_name}', 'true'))->'landmark') is not null, 'duplicate name allowed when confirmed');
