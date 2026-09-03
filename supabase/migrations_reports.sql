-- App Essentials Phase 0C, Rounds 2-3 — Report User + Report Incorrect Place Info.
-- שתי טבלאות דיווח פשוטות, לא מערכת moderation מורכבת: כל אחת רק אוספת דיווח (סיבה +
-- טקסט חופשי אופציונלי) שאדמין יכול לראות בהמשך. לא קשור ל-field_reports הקיים (זה
-- דיווח מצב-שטח מים/עומס/חניה בזמן צ'ק-אין, נושא אחר לגמרי).

create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  message text,
  created_at timestamptz not null default now()
);

alter table public.user_reports enable row level security;

create policy "users can submit reports about others"
  on public.user_reports for insert
  with check (reporter_id = auth.uid() and reporter_id <> reported_user_id);

-- reuse: אותה פונקציית security-definer שכבר קיימת ונבדקה (migrations_fix_rls_recursion.sql,
-- וכבר בשימוש ב-migrations_feedback.sql)
create policy "admins can view user reports"
  on public.user_reports for select
  using (public.current_profile_is_admin());

create table public.place_corrections (
  id uuid primary key default gen_random_uuid(),
  landmark_id text not null references public.landmarks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  message text,
  created_at timestamptz not null default now()
);

alter table public.place_corrections enable row level security;

-- פתוח גם לאורח (user_id nullable) - דיווח על מידע שגוי לא צריך חשבון
create policy "anyone can submit place corrections"
  on public.place_corrections for insert
  with check (user_id is null or user_id = auth.uid());

create policy "admins can view place corrections"
  on public.place_corrections for select
  using (public.current_profile_is_admin());
