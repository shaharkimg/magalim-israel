-- דיווחי שטח: מצב מים / עומס / חניה, נאספים כשאלות אופציונליות בזמן "כבשתי"
-- טבלה חדשה לגמרי, תוספתית - לא נוגעת בטבלאות קיימות

create table public.field_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  landmark_id text not null references public.landmarks(id) on delete cascade,
  created_at timestamptz not null default now(),
  water_level text check (water_level in ('flowing','low','dry')),
  crowding text check (crowding in ('quiet','moderate','crowded')),
  parking text check (parking in ('available','limited','full'))
);

create index field_reports_landmark_idx on public.field_reports (landmark_id, created_at desc);

alter table public.field_reports enable row level security;

-- ציבורי לקריאה: הדיווחים מוצגים בעמוד היעד גם למשתמשי אורח
create policy "field reports are publicly readable"
  on public.field_reports for select
  using (true);

create policy "users can insert their own field reports"
  on public.field_reports for insert
  with check (auth.uid() = user_id);
