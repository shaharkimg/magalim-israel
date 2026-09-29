-- Phase B: after migrations_hardening_2_lockdown.sql. Direct client write paths must be closed,
-- privacy holes shut, and the server RPCs must still work (SECURITY DEFINER bypasses the revokes).
\set ON_ERROR_STOP on
\set QUIET on
-- state left by phase A: B owns group :gid-equivalent, B has a visit at tzfat with a photo.
reset role;
select id as gid from public.groups limit 1 \gset
set role authenticated;

select tt.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select tt.ok(tt.fails($$insert into public.visits (user_id, landmark_id, points_awarded) values (auth.uid(), 'masada', 99999)$$) like '%permission denied%', 'direct visit insert is closed');
select tt.ok(tt.fails($$insert into public.landmark_conquests (user_id, landmark_id, xp_awarded, difficulty_at_conquest) values (auth.uid(), 'masada', 99999, 'easy')$$) like '%permission denied%', 'direct conquest insert is closed');
select tt.ok(tt.fails($$insert into public.xp_bonus_grants (user_id, bonus_type, xp_awarded) values (auth.uid(), 'x', 99999)$$) like '%permission denied%', 'direct bonus insert is closed');
select tt.ok(tt.fails($$update public.visits set points_awarded = 99999 where user_id = auth.uid()$$) like '%permission denied%', 'points_awarded cannot be edited');
select tt.ok(tt.fails($$update public.visits set user_id = 'dddddddd-0000-0000-0000-000000000004' where user_id = auth.uid()$$) like '%permission denied%', 'visit ownership cannot be reassigned');
select tt.ok(tt.fails($$update public.visits set note = 'nice place' where user_id = auth.uid()$$) is null, 'note can still be edited');
select tt.ok(tt.fails($$update public.visits set photo_url = 'https://evil.example/pixel.gif' where user_id = auth.uid()$$) like '%invalid_photo_url%', 'foreign photo url cannot be attached');
select tt.ok(tt.fails($$update public.visits set photo_url = 'https://x.supabase.co/storage/v1/object/public/checkin-photos/bbbbbbbb-0000-0000-0000-000000000002/ok.jpg' where user_id = auth.uid()$$) is null, 'own photo url can be attached');
select tt.ok(tt.fails($$update public.visits set photo_url = 'https://x.supabase.co/storage/v1/object/public/checkin-photos/bbbbbbbb-0000-0000-0000-000000000002/a" onerror="x.jpg' where user_id = auth.uid()$$) like '%invalid_photo_url%', 'attribute-breaking photo url rejected');

select tt.ok(tt.fails($$insert into public.groups (name, created_by) values ('x', auth.uid())$$) like '%permission denied%', 'direct group insert is closed');
select tt.as_user('dddddddd-0000-0000-0000-000000000004');
select tt.ok(tt.fails(format($f$insert into public.group_members (group_id, user_id, role) values (%L, auth.uid(), 'owner')$f$, :'gid')) like '%permission denied%', 'cannot self-insert into a group (or as owner)');
select tt.ok(tt.fails($$insert into public.invites (code, created_by, invite_type) values ('MINE', auth.uid(), 'friend')$$) like '%permission denied%', 'direct invite insert is closed');
select tt.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select tt.ok(tt.fails($$update public.invites set uses = 0, max_uses = null where created_by = auth.uid()$$) like '%permission denied%', 'invite counters cannot be edited');

-- friendships: cannot be re-pointed at another user
select tt.as_user('dddddddd-0000-0000-0000-000000000004');
insert into public.friendships (requester_id, addressee_id) values ('dddddddd-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000002');
select tt.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select tt.ok(tt.fails($$update public.friendships set requester_id = 'cccccccc-0000-0000-0000-000000000003', status = 'accepted' where addressee_id = auth.uid()$$) like '%permission denied%', 'friendship parties cannot be rewritten');
select tt.ok(tt.fails($$update public.friendships set status = 'accepted', accepted_at = now() where addressee_id = auth.uid()$$) is null, 'addressee can still accept');

-- group votes are members-only
select tt.as_user('cccccccc-0000-0000-0000-000000000003');
select tt.ok(tt.fails(format($f$insert into public.group_destination_votes (group_id, user_id, landmark_id) values (%L, auth.uid(), 'masada')$f$, :'gid')) like '%row-level security%', 'non-member cannot vote');
select tt.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select tt.ok(tt.fails(format($f$insert into public.group_destination_votes (group_id, user_id, landmark_id) values (%L, auth.uid(), 'masada')$f$, :'gid')) is null, 'member can vote');
select tt.as_user('cccccccc-0000-0000-0000-000000000003');
select tt.ok((select count(*) from public.group_destination_votes) = 0, 'non-member cannot read votes');

-- field reports: need a visit, never publicly readable, RPC hides the author
select tt.as_user('dddddddd-0000-0000-0000-000000000004');
select tt.ok(tt.fails($$insert into public.field_reports (user_id, landmark_id, crowding) values (auth.uid(), 'tzfat', 'quiet')$$) like '%row-level security%', 'field report requires a visit');
select tt.ok(tt.fails($$insert into public.landmark_photos (landmark_id, user_id, photo_url) values ('tzfat', auth.uid(), 'https://x.supabase.co/storage/v1/object/public/checkin-photos/dddddddd-0000-0000-0000-000000000004/a.jpg')$$) like '%row-level security%', 'gallery photo requires a visit');
select tt.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select tt.ok(tt.fails($$insert into public.field_reports (user_id, landmark_id, crowding) values (auth.uid(), 'tzfat', 'quiet')$$) is null, 'visitor can file a field report');
select tt.as_user('dddddddd-0000-0000-0000-000000000004');
select tt.ok((select count(*) from public.field_reports) = 0, 'field_reports table is not public');
select tt.ok((select count(*) from public.get_landmark_field_reports('tzfat')) = 1, 'aggregate RPC still serves the report');
select tt.ok(not exists (select 1 from information_schema.columns where table_name = 'get_landmark_field_reports'), 'sanity');

-- badges are checked against real visits
select tt.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select tt.ok(tt.fails($$insert into public.user_badges (user_id, badge_id) values (auth.uid(), 'milestone50')$$) like '%badge_not_earned%', 'cannot claim a badge you did not earn');
select tt.ok(tt.fails($$insert into public.user_badges (user_id, badge_id) values (auth.uid(), 'first')$$) is null, 'earned badge is recorded');

-- storage listing no longer leaks who visited where
reset role;
insert into storage.objects (bucket_id, name) values ('checkin-photos', 'bbbbbbbb-0000-0000-0000-000000000002/tzfat-1.jpg');
set role authenticated;
select tt.as_user('cccccccc-0000-0000-0000-000000000003');
select tt.ok((select count(*) from storage.objects where bucket_id = 'checkin-photos') = 0, 'other users cannot list checkin photos');
select tt.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select tt.ok((select count(*) from storage.objects where bucket_id = 'checkin-photos') = 1, 'owner can still list own photos');
select tt.ok((select file_size_limit from storage.buckets where id = 'checkin-photos') = 2097152, 'photo size limit applied');

-- the server path still works once direct writes are closed
select tt.as_user('dddddddd-0000-0000-0000-000000000004');
select public.checkin_landmark('masada', 31.3157, 35.3529, 30) as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean and (:'r'::jsonb->>'total_granted')::int > 0, 'checkin RPC works after lockdown');
select public.checkin_landmark('masada', 31.3157, 35.3529, 30) as r \gset
select tt.ok((:'r'::jsonb->>'already')::boolean, 'and stays idempotent');
select public.create_group('אחרי הנעילה') as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean, 'create_group works after lockdown');
select public.join_group(:'gid') as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean, 'join_group works after lockdown');
select tt.ok(tt.fails($$select count(*) from public.landmark_conquests where user_id = auth.uid()$$) is null, 'own conquests still readable');
select tt.ok((select coalesce(sum(xp_awarded), 0) from public.landmark_conquests where user_id = auth.uid()) > 0, 'xp readable by owner');
