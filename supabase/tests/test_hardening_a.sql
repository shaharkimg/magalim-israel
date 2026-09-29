-- Phase A: after migrations_hardening_1_rpcs.sql (server RPCs + guards), before lockdown.
\set ON_ERROR_STOP on
\set QUIET on
create schema if not exists tt;
create or replace function tt.ok(c boolean, msg text) returns void language plpgsql as $$
begin
  if c is not true then raise exception 'ASSERT FAILED: %', msg; end if;
  raise notice 'PASS  %', msg;
end $$;
create or replace function tt.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u, ''), false); end $$;
create or replace function tt.fails(q text) returns text language plpgsql as $$
begin execute q; return null; exception when others then return sqlerrm; end $$;
grant usage on schema tt to public;
grant execute on all functions in schema tt to public;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'd@example.com');

set role authenticated;

-- ---------- check-in: authentication and input validation ----------
select tt.as_user('');
select public.checkin_landmark('masada', 31.3157, 35.3529) as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'not_authenticated', 'checkin requires a session');

select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.checkin_landmark('masada', 32.0, 35.0) as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'too_far', 'checkin far from the landmark is rejected');
select public.checkin_landmark('masada', null, null) as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'no_location', 'checkin without a location is rejected');
select public.checkin_landmark('masada', 31.3157, 35.3529, 5000) as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'poor_accuracy', 'checkin with an unusable accuracy is rejected');
select public.checkin_landmark('nope', 31.3157, 35.3529) as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'landmark_not_found', 'unknown landmark is rejected');
select public.checkin_landmark('masada', 31.3157, 35.3529, 10, 'https://evil.example/x.jpg') as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'invalid_photo', 'foreign photo url is rejected');
select public.checkin_landmark('masada', 31.3157, 35.3529, 10, 'https://abc.supabase.co/storage/v1/object/public/checkin-photos/bbbbbbbb-0000-0000-0000-000000000002/x.jpg') as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'invalid_photo', 'another user''s photo folder is rejected');

-- ---------- check-in: happy path, server-computed points ----------
select public.checkin_landmark('masada', 31.3157, 35.3529, 25, null, E'  hi\x01 there  ', now() - interval '2 hours') as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean and not (:'r'::jsonb->>'already')::boolean, 'first checkin succeeds');
select tt.ok((:'r'::jsonb->>'first_conquest')::boolean, 'first checkin is a first conquest');
select tt.ok((:'r'::jsonb->>'total_granted')::int = (:'r'::jsonb#>>'{visit,points_awarded}')::int, 'points_awarded equals what was granted');
select tt.ok((:'r'::jsonb->>'base_xp')::int = public.points_for_landmark(l), 'base xp comes from the landmark row, not the client')
  from public.landmarks l where l.id = 'masada';
select tt.ok((select string_agg(x->>'type', ',' order by x->>'type') from jsonb_array_elements(:'r'::jsonb->'bonuses') x) like '%first_destination%new_category%new_region%',
  'first-time bonuses granted');
select tt.ok(:'r'::jsonb#>>'{visit,note}' = 'hi there', 'note is sanitised');
select tt.ok((select coalesce(sum(xp_awarded),0) from public.landmark_conquests where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
            + (select coalesce(sum(xp_awarded),0) from public.xp_bonus_grants where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
            = (:'r'::jsonb->>'total_granted')::int, 'stored xp matches the response');

-- idempotency
select public.checkin_landmark('masada', 31.3157, 35.3529) as r2 \gset
select tt.ok((:'r2'::jsonb->>'already')::boolean and (:'r2'::jsonb->>'total_granted')::int = 0, 'repeat checkin grants nothing');
select tt.ok((select count(*) from public.visits where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1, 'repeat checkin creates no duplicate visit');
select tt.ok((select count(*) from public.landmark_conquests where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1, 'repeat checkin creates no duplicate conquest');

-- travel plausibility
select public.checkin_landmark('eingedi', 31.4618, 35.3822, 20) as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean, 'plausible second checkin (17 km in 2 h) is accepted');
select public.checkin_landmark('hermon', 33.2988, 35.7666, 20) as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'impossible_travel', 'teleporting 200+ km in minutes is rejected');

-- a backdated (offline-style) checkin cannot dodge the speed check by claiming an earlier time
select public.checkin_landmark('hermon', 33.2988, 35.7666, 20, null, null, now() - interval '2 hours 5 minutes') as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'impossible_travel', 'backdating a far checkin before an existing visit is rejected');

-- a photo the user owns is accepted and lands in the gallery
select tt.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select public.checkin_landmark('tzfat', 32.9646, 35.4960, 20, 'https://abc.supabase.co/storage/v1/object/public/checkin-photos/bbbbbbbb-0000-0000-0000-000000000002/tzfat-1.jpg') as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean, 'own photo url is accepted');
reset role;
select tt.ok((select count(*) from public.landmark_photos where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 1, 'photo added to gallery atomically');
set role authenticated;

-- brute-force limiter
select tt.as_user('cccccccc-0000-0000-0000-000000000003');
select count(*) filter (where public.checkin_landmark('masada', 32.0, 35.0)->>'error' = 'rate_limited') as limited
  from generate_series(1, 70) \gset
select tt.ok(:limited > 0, 'repeated attempts hit the rate limiter');

-- ---------- groups ----------
select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.create_group('   ') as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'invalid_name', 'empty group name rejected');
select public.create_group('הקבוצה שלי') as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean, 'group created');
select (:'r'::jsonb#>>'{group,id}') as gid \gset
select tt.ok((select role from public.group_members where group_id = :'gid' and user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'owner', 'creator is the owner');

select tt.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select public.join_group(:'gid') as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean and not (:'r'::jsonb->>'already')::boolean, 'join by id works');
select public.join_group(:'gid') as r \gset
select tt.ok((:'r'::jsonb->>'already')::boolean, 'joining twice is idempotent');
select tt.ok((select count(*) from public.group_members where group_id = :'gid') = 2, 'no duplicate membership');
select tt.ok((select role from public.group_members where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' and group_id = :'gid') = 'member', 'joiner cannot pick a role');

select tt.as_user('cccccccc-0000-0000-0000-000000000003');
select tt.ok((select count(*) from public.groups) = 0, 'non-member cannot read the group');
select tt.ok((select count(*) from public.group_members) = 0, 'non-member cannot read the roster');
select public.join_group('00000000-0000-0000-0000-000000000009') as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'group_not_found', 'joining an unknown group fails');

-- ---------- invites ----------
select public.create_invite('circle', :'gid') as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'not_a_member', 'cannot invite into a circle you are not in');

select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.create_invite('friend') as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean and length(:'r'::jsonb->>'code') = 10, 'server-generated invite code');
select (:'r'::jsonb->>'code') as code \gset
select public.create_invite('friend') as r \gset
select tt.ok(:'r'::jsonb->>'code' = :'code', 'existing valid invite is reused (no quota burn)');

select tt.as_user('cccccccc-0000-0000-0000-000000000003');
select public.redeem_invite(:'code') as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean and not (:'r'::jsonb->>'already')::boolean, 'invite redeemed');
select tt.ok((select status from public.friendships where user_low = 'aaaaaaaa-0000-0000-0000-000000000001' and user_high = 'cccccccc-0000-0000-0000-000000000003') = 'accepted', 'friendship created');
select public.redeem_invite(:'code') as r \gset
select tt.ok((:'r'::jsonb->>'already')::boolean, 'redeeming twice is a no-op');
select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select tt.ok((select uses from public.invites where code = :'code') = 1, 'uses counted once');
select public.redeem_invite(:'code') as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'own_invite', 'cannot redeem your own invite');
select public.redeem_invite('NOPE') as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'invite_not_found', 'unknown code rejected');

select public.create_group('שנייה') as r \gset
select (:'r'::jsonb#>>'{group,id}') as gid2 \gset
select public.create_invite('circle', :'gid2') as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean, 'circle invite for own circle');
select public.create_group('שלישית') as r \gset
select (:'r'::jsonb#>>'{group,id}') as gid3 \gset
select public.create_invite('circle', :'gid3') as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean, 'third invite is within the default quota');
select public.create_group('רביעית') as r \gset
select (:'r'::jsonb#>>'{group,id}') as gid4 \gset
select public.create_invite('circle', :'gid4') as r \gset
select tt.ok(:'r'::jsonb->>'error' = 'quota_exceeded', 'invite quota enforced on the server');

-- ---------- suspended accounts cannot act socially or earn points ----------
reset role;
update public.profiles set account_status = 'suspended' where id = 'dddddddd-0000-0000-0000-000000000004';
set role authenticated;
select tt.as_user('dddddddd-0000-0000-0000-000000000004');
select tt.ok(public.create_group('x')->>'error' = 'account_unavailable', 'suspended account cannot create groups');
select tt.ok(public.join_group(:'gid')->>'error' = 'account_unavailable', 'suspended account cannot join groups');
select tt.ok(public.create_invite('friend')->>'error' = 'account_unavailable', 'suspended account cannot create invites');
select tt.ok(public.redeem_invite(:'code')->>'error' = 'account_unavailable', 'suspended account cannot redeem invites');
select tt.ok(public.checkin_landmark('masada', 31.3157, 35.3529, 10)->>'error' = 'account_unavailable', 'suspended account cannot check in');
reset role;
update public.profiles set account_status = 'active' where id = 'dddddddd-0000-0000-0000-000000000004';
set role authenticated;
select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');

-- ---------- privileges that must never be client-writable ----------
select tt.ok(tt.fails($$update public.profiles set is_admin = true where id = auth.uid()$$) is not null
             or (select is_admin from public.profiles where id = auth.uid()) = false, 'cannot make yourself admin');
select tt.ok((select is_admin from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = false, 'is_admin unchanged');
select tt.ok(tt.fails('select * from public.rate_limits') like '%permission denied%', 'rate_limits not readable by clients');
select tt.ok(tt.fails($$select public.rl_hit('x', 1, interval '1 minute')$$) like '%permission denied%', 'rl_hit not callable by clients');

-- ---------- telemetry abuse controls ----------
select tt.ok(tt.fails($$insert into public.analytics_events (event_name, payload) values ('x', jsonb_build_object('k', repeat('a', 3000)))$$) like '%analytics_payload_size%', 'oversized analytics payload rejected');
select tt.ok(tt.fails($$insert into public.feedback_submissions (type, message) values ('bug', repeat('a', 5000))$$) like '%feedback_message_len%', 'oversized feedback rejected');
select tt.as_user('dddddddd-0000-0000-0000-000000000004');
insert into public.analytics_events (user_id, event_name) select 'dddddddd-0000-0000-0000-000000000004', 'e' from generate_series(1, 260);
reset role;
select tt.ok((select count(*) from public.analytics_events where user_id = 'dddddddd-0000-0000-0000-000000000004') = 200, 'analytics flood is capped at the window limit');
set role authenticated;
select tt.ok(tt.fails($$insert into public.waitlist (email) values ('not-an-email')$$) like '%waitlist_email_ok%', 'invalid waitlist email rejected');

-- ---------- push endpoint validation (SSRF) ----------
select tt.ok(tt.fails($$select public.save_push_subscription('http://fcm.googleapis.com/x', 'k', 'a')$$) like '%invalid endpoint%', 'plain http push endpoint rejected');
select tt.ok(tt.fails($$select public.save_push_subscription('https://169.254.169.254/latest', 'k', 'a')$$) like '%invalid endpoint%', 'IP-literal push endpoint rejected');
select tt.ok(tt.fails($$select public.save_push_subscription('https://db.internal/x', 'k', 'a')$$) like '%invalid endpoint%', 'internal push endpoint rejected');
select tt.ok(tt.fails($$select public.save_push_subscription('https://fcm.googleapis.com/fcm/send/abc', 'k', 'a')$$) is null, 'real push endpoint accepted');

-- ---------- landmark deletion never silently destroys user progress ----------
reset role;
insert into public.landmarks (id, name, description, category, difficulty, region, lat, lon, duration, distance_km)
  values ('dup_a', 'dup a', 'x', 'water', 'easy', 'north', 32.5, 35.5, '1h', 1), ('dup_b', 'dup b', 'x', 'water', 'easy', 'north', 32.5, 35.5, '1h', 1);
insert into public.visits (user_id, landmark_id, points_awarded) values ('bbbbbbbb-0000-0000-0000-000000000002', 'dup_a', 10);
insert into public.landmark_conquests (user_id, landmark_id, xp_awarded, difficulty_at_conquest) values ('bbbbbbbb-0000-0000-0000-000000000002', 'dup_a', 10, 'easy');
select tt.ok(tt.fails($$delete from public.landmarks where id = 'dup_a'$$) like '%merge_landmarks%', 'deleting a landmark with visits is blocked');
select tt.ok((select count(*) from public.visits where landmark_id = 'dup_a') = 1, 'visit survived the blocked delete');
select public.merge_landmarks('dup_a', 'dup_b');
select tt.ok(not exists (select 1 from public.landmarks where id = 'dup_a'), 'duplicate removed by merge');
select tt.ok((select count(*) from public.visits where landmark_id = 'dup_b' and user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 1, 'visit moved to the surviving landmark');
select tt.ok((select count(*) from public.landmark_conquests where landmark_id = 'dup_b') = 1, 'xp moved to the surviving landmark');
select tt.ok(tt.fails($$delete from public.landmarks where id = 'dup_b'$$) is not null, 'guard re-armed after merge');
set role authenticated;
select tt.ok(tt.fails($$select public.merge_landmarks('dup_b', 'masada')$$) like '%permission denied%', 'clients cannot call merge_landmarks');

-- ---------- account deletion keeps other members' group ----------
select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.delete_my_account();
reset role;
select tt.ok(exists (select 1 from public.groups where id = :'gid' and created_by = 'bbbbbbbb-0000-0000-0000-000000000002'), 'group survives owner deletion with a new owner');
select tt.ok((select role from public.group_members where group_id = :'gid' and user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 'owner', 'oldest member became owner');
select tt.ok(not exists (select 1 from public.groups where id = :'gid2'), 'group with no other members is removed');
select tt.ok(not exists (select 1 from public.visits where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'deleted user visits are gone');
