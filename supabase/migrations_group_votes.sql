-- הצבעה קבוצתית על היעד הבא לטיול. טבלה חדשה לגמרי, תוספתית - לא נוגעת בטבלאות קיימות.
-- מפתח ראשי (group_id, user_id) מבטיח הצבעה פעילה אחת לכל משתמש בקבוצה - upsert משמש לשינוי הצבעה.

create table public.group_destination_votes (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  landmark_id text not null references public.landmarks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_destination_votes enable row level security;

create policy "group votes are publicly readable"
  on public.group_destination_votes for select
  using (true);

create policy "users can vote for themselves"
  on public.group_destination_votes for insert
  with check (auth.uid() = user_id);

create policy "users can change their own vote"
  on public.group_destination_votes for update
  using (auth.uid() = user_id);

create policy "users can remove their own vote"
  on public.group_destination_votes for delete
  using (auth.uid() = user_id);
