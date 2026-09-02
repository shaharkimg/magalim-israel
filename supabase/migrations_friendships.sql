-- Multi-user isolation — Phase 3: Friendships
-- הרץ פעם אחת ב-Supabase Dashboard → SQL Editor → New query → Run
--
-- מעבירים את מודל ה"חברים" ממעקב חד-כיווני (`follows`, שנשאר כפי שהוא לעת עתה ועדיין
-- מזין את ה-leaderboard/פיד הקיימים) לחברות אמיתית דו-כיוונית עם בקשה+אישור. הטבלה הזו
-- היא היעד הסופי למושג "חברים" באפליקציה; המעבר של leaderboard/פיד אליה קורה ב-Phase 6,
-- יחד עם נעילת ה-SELECT הציבורי הקיים על profiles/visits/follows/groups (כדי לא לשבור
-- אותם באמצע, כמו שהוסבר ב-Phase 2).

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','blocked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  -- עמודות מחושבות שמזהות את הזוג באופן בלתי-תלוי-כיוון, כדי למנוע גם בקשה כפולה וגם
  -- שתי שורות מקבילות עבור אותו זוג (A→B ו-B→A) — יכולה להתקיים רק שורה אחת לכל זוג משתמשים.
  user_low uuid generated always as (least(requester_id, addressee_id)) stored,
  user_high uuid generated always as (greatest(requester_id, addressee_id)) stored,
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (user_low, user_high)
);

alter table public.friendships enable row level security;

-- קריאה: רק שני הצדדים המעורבים בקשר יכולים לראות אותו — לא צד שלישי, גם אם הוא יודע
-- את ה-id של השורה (IDOR מחסום ברמת ה-DB, לא רק ב-frontend).
create policy "involved users can view their friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- יצירת בקשה: רק כמבקש את עצמך, ותמיד מתחילה כ-pending (לא ניתן ליצור "חברות מאושרת" ישר).
create policy "users can send friend requests as themselves"
  on public.friendships for insert
  with check (auth.uid() = requester_id and status = 'pending');

-- רק הצד המוזמן (addressee) יכול לאשר/לדחות בקשה ממתינה.
create policy "addressee can accept or decline a pending request"
  on public.friendships for update
  using (auth.uid() = addressee_id and status = 'pending')
  with check (auth.uid() = addressee_id and status in ('accepted','declined'));

-- כל אחד מהצדדים יכול לחסום את הקשר (ללא קשר לסטטוס הנוכחי).
create policy "either party can block"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check ((auth.uid() = requester_id or auth.uid() = addressee_id) and status = 'blocked');

-- הסרת חברות / ביטול בקשה / ניקוי בקשה שנדחתה — כל אחד מהצדדים.
create policy "either party can delete the friendship"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
