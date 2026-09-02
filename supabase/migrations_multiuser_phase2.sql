-- Multi-user isolation — Phase 2: Authentication isolation + profiles + RLS foundation
-- הרץ פעם אחת ב-Supabase Dashboard → SQL Editor → New query → Run
--
-- היקף הפאזה הזו (לפי סדר העבודה שהוגדר): הרחבת טבלת profiles + נעילת privilege escalation.
-- הפרטת הקריאה של leaderboard/feed/groups (Phase 6) נדחית בכוונה עד שיהיו friendships (Phase 3)
-- ו-circles (Phase 4) לסנן לפיהם — נעילה מוקדמת מדי הייתה שוברת פיצ'רים חיים כרגע (leaderboard,
-- פיד, קבוצות) בלי מנגנון תחליפי לקריאה לגיטימית בין משתמשים.

-- ============ הרחבת profiles ============
alter table public.profiles
  add column if not exists username text unique,
  add column if not exists is_admin boolean not null default false,
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active','suspended','banned')),
  add column if not exists onboarding_completed boolean not null default false;

-- ============ נעילת privilege escalation ============
-- המדיניות הקיימת (`using (auth.uid() = id)` בלבד) הייתה מאפשרת למשתמש לעדכן את עצמו
-- ל-is_admin=true או לשנות את account_status של עצמו. ה-with check החדש נועל בפירוש את שתי
-- העמודות הרגישות האלה לערך הנוכחי שלהן — עדכון של שם/avatar/username עדיין מותר, שינוי
-- הרשאות/סטטוס לא (ייעשה רק ע"י service role / admin API בפאזה 7).
drop policy if exists "users can update their own profile" on public.profiles;

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = (select p.is_admin from public.profiles p where p.id = profiles.id)
    and account_status = (select p.account_status from public.profiles p where p.id = profiles.id)
  );
