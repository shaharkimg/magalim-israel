-- Trip partners: runs after the lockdown phase (the final schema state).
\set ON_ERROR_STOP on
\set QUIET on
reset role;
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'd@example.com')
on conflict do nothing;
insert into public.profiles (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Alice Cohen'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Bob'),
  ('cccccccc-0000-0000-0000-000000000003', 'Carol'),
  ('dddddddd-0000-0000-0000-000000000004', 'Dan')
on conflict (id) do update set name = excluded.name;
set role authenticated;

-- guests: nothing
select tt.as_user('');
select tt.ok((public.create_trip_post('masada', current_date + 3, 1, 'x')->>'error') = 'not_authenticated', 'guest cannot post');
select tt.ok((select count(*) from public.get_trip_posts()) = 0, 'guest sees no posts');

-- direct writes are closed
select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select tt.ok(tt.fails($$insert into public.trip_posts (user_id, landmark_id, trip_date) values ('aaaaaaaa-0000-0000-0000-000000000001', 'masada', current_date + 2)$$) is not null, 'direct insert into trip_posts is denied');
select tt.ok(tt.fails($$update public.trip_posts set status = 'closed'$$) is not null, 'direct update of trip_posts is denied');
select tt.ok(tt.fails($$insert into public.trip_requests (post_id, user_id) values (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001')$$) is not null, 'direct insert into trip_requests is denied');

-- validation
select (public.create_trip_post('nope', current_date + 3, 1, null))->>'error' as e \gset
select tt.ok(:'e' = 'landmark_not_found', 'unknown landmark is rejected');
select (public.create_trip_post('masada', current_date - 1, 1, null))->>'error' as e \gset
select tt.ok(:'e' = 'invalid_date', 'past date is rejected');
select (public.create_trip_post('masada', current_date + 400, 1, null))->>'error' as e \gset
select tt.ok(:'e' = 'invalid_date', 'date too far ahead is rejected');
select (public.create_trip_post('masada', current_date + 3, 0, null))->>'error' as e \gset
select tt.ok(:'e' = 'invalid_count', 'zero partners is rejected');
select (public.create_trip_post('masada', current_date + 3, 1, repeat('x', 201)))->>'error' as e \gset
select tt.ok(:'e' = 'note_too_long', 'long note is rejected');

-- happy path
select public.create_trip_post('masada', current_date + 3, 2, E'  נעלה לפני הזריחה\x01 ') as r \gset
select tt.ok((:'r'::jsonb->>'ok')::boolean, 'post created');
select (:'r'::jsonb->>'id')::uuid as pid \gset
select tt.ok((select note from public.trip_posts where id = :'pid') = 'נעלה לפני הזריחה', 'note is sanitised');
select (public.create_trip_post('masada', current_date + 3, 2, null))->>'error' as e \gset
select tt.ok(:'e' = 'duplicate', 'same landmark+date twice is rejected');

-- a stranger sees it, with first name only
select tt.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select tt.ok((select count(*) from public.get_trip_posts('masada')) = 1, 'stranger sees the open post');
select tt.ok((select poster_name from public.get_trip_posts('masada')) = 'Alice', 'only the first name is exposed');
select tt.ok((select count(*) from public.get_trip_posts('other')) = 0, 'landmark filter works');
select tt.ok((select count(*) from public.trip_posts) = 0, 'stranger cannot read trip_posts directly');
select tt.ok((select count(*) from public.get_trip_requests(:'pid')) = 0, 'stranger cannot read requests of someone else''s post');

-- request flow
select (public.request_join_trip(:'pid', 'אשמח להצטרף'))->>'ok' as ok \gset
select tt.ok(:'ok' = 'true', 'stranger can request to join');
select (public.request_join_trip(:'pid', null))->>'already' as a \gset
select tt.ok(:'a' = 'true', 'repeat request is idempotent');
select tt.ok((select my_request_status from public.get_trip_posts('masada')) = 'pending', 'requester sees pending status');
select tt.ok((select count(*) from public.notifications where type = 'trip_request') = 0, 'notifications of the owner are not visible to the requester');
select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select tt.ok((select count(*) from public.notifications where type = 'trip_request') = 1, 'owner is notified of the request');
select (public.request_join_trip(:'pid', null))->>'error' as e \gset
select tt.ok(:'e' = 'own_post', 'cannot request to join your own post');
select tt.ok((select count(*) from public.get_trip_requests(:'pid')) = 1, 'owner sees the request');
select id as rid from public.get_trip_requests(:'pid') \gset

-- only the owner responds
select tt.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select (public.respond_trip_request(:'rid', true))->>'error' as e \gset
select tt.ok(:'e' = 'not_found', 'requester cannot approve their own request');

select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.respond_trip_request(:'rid', true) as r \gset
select tt.ok(:'r'::jsonb->>'status' = 'accepted', 'owner accepts');
select (:'r'::jsonb->>'group_id')::uuid as gid \gset
select tt.ok((select count(*) from public.group_members where group_id = :'gid') = 2, 'group has owner and accepted member');
select tt.ok((select role from public.group_members where group_id = :'gid' and user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'owner', 'poster owns the group');
select tt.ok((select count(*) from public.get_trip_posts('masada')) = 1, 'post stays open while spots remain');

-- second accepted request fills the post and closes it
select tt.as_user('cccccccc-0000-0000-0000-000000000003');
select public.request_join_trip(:'pid', null) as r \gset
select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select id as rid2 from public.get_trip_requests(:'pid') where status = 'pending' \gset
select public.respond_trip_request(:'rid2', true) as r \gset
select tt.ok((:'r'::jsonb->>'group_id')::uuid = :'gid', 'second partner joins the same group');
select tt.ok((select status from public.trip_posts where id = :'pid') = 'closed', 'post closes when full');
select tt.as_user('dddddddd-0000-0000-0000-000000000004');
select tt.ok((select count(*) from public.get_trip_posts('masada')) = 0, 'closed post is hidden');
select (public.request_join_trip(:'pid', null))->>'error' as e \gset
select tt.ok(:'e' = 'post_unavailable', 'cannot request a closed post');

-- cancel a request, then ask again
select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select (public.create_trip_post('masada', current_date + 6, 1, null))->>'id' as pidc \gset
select tt.as_user('dddddddd-0000-0000-0000-000000000004');
select public.request_join_trip(:'pidc', null);
select tt.ok((public.cancel_trip_request(:'pidc')->>'ok') = 'true', 'requester cancels a pending request');
select tt.ok((select my_request_status from public.get_trip_posts('masada') where id = :'pidc') is null, 'cancelled request shows as no request');
select tt.ok((public.request_join_trip(:'pidc', 'שוב')->>'already') = 'false', 'a cancelled request can be sent again');
select tt.ok((select my_request_status from public.get_trip_posts('masada') where id = :'pidc') = 'pending', 're-sent request is pending');
select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.cancel_trip_post(:'pidc');

-- decline + cancel + block
select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select (public.create_trip_post('masada', current_date + 5, 1, null))->>'id' as pid2 \gset
select tt.as_user('dddddddd-0000-0000-0000-000000000004');
select (public.request_join_trip(:'pid2', null))->>'ok' as ok \gset
select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select id as rid3 from public.get_trip_requests(:'pid2') \gset
select (public.respond_trip_request(:'rid3', false))->>'status' as s \gset
select tt.ok(:'s' = 'declined', 'owner declines');
select tt.as_user('dddddddd-0000-0000-0000-000000000004');
select tt.ok((select count(*) from public.notifications where type = 'trip_accepted') = 0, 'decline sends no notification');

select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select tt.ok((public.cancel_trip_post(:'pid2')->>'ok') = 'true', 'owner cancels own post');
select tt.ok((public.cancel_trip_post(:'pid2')->>'ok') = 'false', 'cancelling twice reports not_found');

reset role;
insert into public.friendships (requester_id, addressee_id, status)
  values ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'blocked');
set role authenticated;
select tt.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select (public.create_trip_post('masada', current_date + 9, 1, null))->>'id' as pid3 \gset
select tt.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select tt.ok((select count(*) from public.get_trip_posts('masada')) = 0, 'blocked pair cannot see each other''s posts');
select (public.request_join_trip(:'pid3', null))->>'error' as e \gset
select tt.ok(:'e' = 'post_unavailable', 'blocked user cannot request to join');

-- suspended account cannot post
reset role;
update public.profiles set account_status = 'suspended' where id = 'cccccccc-0000-0000-0000-000000000003';
set role authenticated;
select tt.as_user('cccccccc-0000-0000-0000-000000000003');
select (public.create_trip_post('masada', current_date + 4, 1, null))->>'error' as e \gset
select tt.ok(:'e' = 'account_unavailable', 'suspended account cannot post');
