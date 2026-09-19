-- תיקון לפיצ'ר גלריית-התמונות (migrations_landmark_photo_gallery.sql): המשתמש דיווח
-- שתמונה שנייה שהעלה לאותו יעד לא הצטרפה לגלריה. הסיבה: get_landmark_photo_gallery
-- קראה מ-public.visits, וב-visits יש unique(user_id, landmark_id) - למשתמש אחד יש
-- לכל היותר שורה אחת ליעד נתון, אז "עריכת ביקורת" (saveReview) שמעלה תמונה חדשה
-- בפועל *דרסה* את photo_url של אותה שורה קיימת, במקום להוסיף רשומה חדשה. הגלריה
-- מעולם לא יכלה להראות יותר מתמונה אחת למשתמש לכל יעד.
--
-- הפתרון: טבלה ייעודית שבה כל תמונה היא שורה נפרדת - לא כפופה ל-unique(user,landmark)
-- של visits. visits/photo_url נשאר כפי שהוא (עדיין ה"תמונה שלי" להצגה בכרטיס-הביקור
-- שלי, ולתאימות אחורה) - זה רק המקור לגלריה-של-כולם.

create table public.landmark_photos (
  id uuid primary key default gen_random_uuid(),
  landmark_id text not null references public.landmarks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  photo_url text not null,
  created_at timestamptz not null default now()
);
create index landmark_photos_landmark_idx on public.landmark_photos(landmark_id, created_at desc);

alter table public.landmark_photos enable row level security;

-- אותו דפוס בדיוק כמו visits: אין select ציבורי על הטבלה עצמה (אף פעם לא חושפים
-- who-photographed-what) - גישה רק דרך get_landmark_photo_gallery ה-security-definer
-- למטה, בדיוק כמו ש-get_landmark_photos/get_landmark_visit_counts עוקפות את הנעילה
-- על visits.
create policy "users can insert their own landmark photos"
  on public.landmark_photos for insert
  with check (auth.uid() = user_id);

create policy "users can delete their own landmark photos"
  on public.landmark_photos for delete
  using (auth.uid() = user_id);

-- backfill - כל תמונה שכבר קיימת ב-visits (מצ'ק-אין או מעריכת-ביקורת קודמת) מקבלת שורה
-- תואמת כאן, כדי שהגלריה הקיימת לא "תתרוקן" אחרי המעבר.
insert into public.landmark_photos (landmark_id, user_id, photo_url, created_at)
select landmark_id, user_id, photo_url, visited_at
from public.visits
where photo_url is not null;

create or replace function public.get_landmark_photo_gallery(p_landmark_id text, p_limit int default 24)
returns table(photo_url text, visited_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select photo_url, created_at as visited_at
  from public.landmark_photos
  where landmark_id = p_landmark_id
  order by created_at desc
  limit greatest(1, least(p_limit, 100));
$$;
grant execute on function public.get_landmark_photo_gallery(text, int) to authenticated, anon;
