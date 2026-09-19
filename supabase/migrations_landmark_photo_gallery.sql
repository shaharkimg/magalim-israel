-- גלריית תמונות-קהילה לכל יעד: עד עכשיו get_landmark_photos() (מ-phase6) החזירה רק
-- תמונה בודדת (האחרונה) לכל landmark_id - משמשת כתמונת-hero לכרטיס/עמוד-היעד. הפיצ'ר
-- המבוקש כאן הוא אמיתי: "תמונה שמשתמש משתף מצטרפת לספריית-התמונות של המקום" - כלומר
-- רשימה של כל התמונות (לא רק האחרונה), לתצוגה כגלריה בעמוד-היעד.
--
-- אותו דפוס בדיוק כמו get_landmark_photos/get_landmark_visit_counts הקיימות: security
-- definer שחושף רק landmark_id/photo_url/visited_at אנונימיים (לעולם לא user_id), כדי
-- לעקוף את ה-RLS על visits (שמגביל select לשורות של המשתמש עצמו) בלי לחשוף מי צילם מה.

create or replace function public.get_landmark_photo_gallery(p_landmark_id text, p_limit int default 24)
returns table(photo_url text, visited_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select photo_url, visited_at
  from public.visits
  where landmark_id = p_landmark_id and photo_url is not null
  order by visited_at desc
  limit greatest(1, least(p_limit, 100));
$$;
grant execute on function public.get_landmark_photo_gallery(text, int) to authenticated, anon;
