-- Multi-user isolation — Phase 8: Waitlist
-- הרץ פעם אחת ב-Supabase Dashboard → SQL Editor → New query → Run

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','invited','registered'))
);

alter table public.waitlist enable row level security;

-- כל אחד (גם אנונימי לגמרי - זו בדיוק הנקודה: ההרשמה סגורה, אין להם session) יכול
-- להצטרף. ה-unique constraint על email דואג שלא תהיה כפילות ברמת ה-DB.
create policy "anyone can join the waitlist"
  on public.waitlist for insert
  with check (true);

-- רק admin רואה/מנהל את הרשימה - לא חושפים את כתובות המייל של הממתינים לאף אחד אחר.
create policy "admins can view the waitlist"
  on public.waitlist for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "admins can update waitlist entries"
  on public.waitlist for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ============ בדיקת מצב הרשמה — ציבורית ובטוחה ============
-- מסך ההרשמה צריך לדעת *לפני* שהמשתמש בכלל ממלא טופס אם יש טעם בכלל לנסות (registration
-- סגורה / מלאה / invite-only) - כדי להראות ישר את מסך רשימת ההמתנה במקום לתת להם למלא
-- טופס ואז להיכשל. חושף רק booleans, אף פעם לא ספירת משתמשים מדויקת/PII.
create or replace function public.get_registration_status()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'registration_enabled', s.registration_enabled,
    'invite_only', s.invite_only,
    'is_full', (s.max_users is not null and (select count(*) from public.profiles) >= s.max_users)
  )
  from public.app_settings s where s.id = 1;
$$;
grant execute on function public.get_registration_status() to authenticated, anon;
