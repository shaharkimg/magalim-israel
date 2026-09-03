-- App Essentials Phase 0F, Round 5 — לוגינג שגיאות-קליינט אמיתי (לא מזויף).
-- אין service_role/גישת-דשבורד באפליקציה הזו (כרגיל בכל הסבבים בשיחה) - אז אין "שירות
-- ניטור חיצוני" אמיתי; זו תשתית מינימלית שכן עושה משהו אמיתי: window.onerror/
-- unhandledrejection נכתבים לטבלה, אדמין יכול לקרוא (SQL Editor, כמו feedback_submissions -
-- לא נבנה מסך-אדמין ייעודי בסבב הזה, זה scope נפרד). INSERT פתוח גם לאורח (user_id
-- nullable) כי שגיאות קורות גם למי שעוד לא נרשם.

create table public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  message text not null,
  stack text,
  url text,
  created_at timestamptz not null default now()
);

alter table public.client_errors enable row level security;

create policy "anyone can report a client error"
  on public.client_errors for insert
  with check (user_id is null or user_id = auth.uid());

-- reuse: אותה פונקציית security-definer שכבר קיימת ונבדקה (migrations_fix_rls_recursion.sql)
create policy "admins can view client errors"
  on public.client_errors for select
  using (public.current_profile_is_admin());
