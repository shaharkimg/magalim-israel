-- App Essentials Phase 0A, Round 1 — Edit Profile: שם + תמונה + סגנון טיולים.
-- עמודת travel_preferences יחידה (לא טבלה נפרדת - זה בלוק-נתונים קטן ששייך למשתמש אחד),
-- ו-bucket חדש לתמונות פרופיל באותו דפוס מדויק כמו checkin-photos הקיים (schema.sql).

alter table public.profiles
  add column if not exists travel_preferences jsonb not null default '{}'::jsonb;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
