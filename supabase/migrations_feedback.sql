-- App Essentials Phase 0A, Round 6 — Help & Feedback: "דווח על בעיה" / "שלח רעיון".
-- טבלה חדשה תוספתית, לא קשורה ל-field_reports הקיימת (זו דיווח מצב-שטח מים/עומס/חניה
-- בזמן צ'ק-אין - נושא אחר לגמרי). INSERT פתוח גם לאורח (user_id nullable) כדי שגם מי
-- שעוד לא נרשם יוכל לדווח על בעיה שנתקל בה.

create table public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('bug','idea')),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback_submissions enable row level security;

create policy "anyone can submit feedback"
  on public.feedback_submissions for insert
  with check (user_id is null or user_id = auth.uid());

-- reuse: אותה פונקציית security-definer שכבר קיימת ונבדקה (migrations_fix_rls_recursion.sql)
create policy "admins can view feedback"
  on public.feedback_submissions for select
  using (public.current_profile_is_admin());
