-- Multi-user isolation — Phase 6: Private Feed + Leaderboard
-- הרץ פעם אחת ב-Supabase Dashboard → SQL Editor → New query → Run
-- זו הפאזה שנועלת סוף-סוף את ה-SELECT הציבורי שנשאר בכוונה פתוח מ-Phase 2 (profiles/visits/
-- follows/likes) — עד עכשיו זה חיכה כי לא היה מנגנון חוקי (friendships/circles) לקרוא דרכו
-- בלי לשבור leaderboard/פיד/קבוצות חיים. עכשיו יש (Phase 3+4), אז זה קורה כאן.

-- ============ profiles ============
-- מ"כולם רואים הכל" ל: אתה עצמך, מישהו שיש איתך שורת friendships (בכל סטטוס — כולל
-- pending, כדי שבקשת חברות תמשיך להראות את שם השולח/ת), או מישהו ששותף איתך במעגל.
drop policy if exists "profiles are publicly readable" on public.profiles;

create policy "users can view accessible profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = profiles.id)
         or (f.addressee_id = auth.uid() and f.requester_id = profiles.id)
    )
    or exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = profiles.id
    )
  );

-- ============ visits ============
-- אותו עיקרון: עצמך / חבר מאושר / חבר-מעגל משותף. זה מה שהופך את "renderFeed" הקיים
-- (שאין לו כיום שום סינון לפי user_id בכלל!) לפיד פרטי אוטומטית - ה-RLS עושה את הסינון
-- בשקיפות בלי לשנות את הקוד שבצד הלקוח.
drop policy if exists "visits are publicly readable" on public.visits;

create policy "users can view accessible visits"
  on public.visits for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = visits.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = visits.user_id))
    )
    or exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = visits.user_id
    )
  );

-- ============ follows (legacy, נשמר תואם-לאחור) ============
-- follows כבר לא מזין שום מסך חדש (הוחלף ב-friendships), אבל עדיין נכתב דרך קישורי
-- ?ref= ישנים ששותפו בעבר. נועל אותו לאותו עיקרון פרטיות בכל זאת - אין סיבה שיישאר פתוח.
drop policy if exists "follows are publicly readable" on public.follows;

create policy "users can view their own follow relationships"
  on public.follows for select
  using (auth.uid() = follower_id or auth.uid() = followee_id);

-- ============ likes ============
-- לייק גלוי רק אם ה-check-in שהוא מתייחס אליו גלוי לך (יורש בשקיפות את RLS של visits
-- דרך ה-subquery - לא כותבים שוב את לוגיקת "חבר/מעגל", אם visits מסננת, גם זה מסונן).
drop policy if exists "likes are publicly readable" on public.likes;

create policy "users can view likes on visits they can see"
  on public.likes for select
  using (exists (select 1 from public.visits v where v.id = likes.visit_id));

-- ============ אגרגטים אנונימיים (נשארים ציבוריים בכוונה) ============
-- "X כובשים" על כרטיס יעד ותמונות-קהילה הם discovery features כלל-אפליקטיביים במכוון
-- (כמו "כמה אנשים ביקרו כאן"/"תמונה מהמקום" ב-Google Maps) - לא "פעילות אישית פרטית".
-- הפונקציות האלה חושפות רק אגרגט/URL אנונימי, אף פעם לא user_id, אז אין כאן דליפת פרטיות -
-- וכך "X כובשים"/תמונות-קהילה ממשיכים לעבוד למרות ש-visits עצמה ננעלה למעלה.
create or replace function public.get_landmark_visit_counts()
returns table(landmark_id text, visit_count bigint)
language sql
security definer
set search_path = public
as $$
  select landmark_id, count(*) from public.visits group by landmark_id;
$$;
grant execute on function public.get_landmark_visit_counts() to authenticated, anon;

create or replace function public.get_landmark_photos()
returns table(landmark_id text, photo_url text)
language sql
security definer
set search_path = public
as $$
  select distinct on (landmark_id) landmark_id, photo_url
  from public.visits
  where photo_url is not null
  order by landmark_id, visited_at desc;
$$;
grant execute on function public.get_landmark_photos() to authenticated, anon;

-- אתגר קהילתי כלל-אפליקטיבי ("הקהילה כבשה X מתוך 10 יעדי צפון החודש") - גם כאן, רק
-- landmark_id חוזר, לעולם לא who.
create or replace function public.get_community_landmark_activity(p_landmark_ids text[], p_since timestamptz)
returns table(landmark_id text)
language sql
security definer
set search_path = public
as $$
  select distinct landmark_id from public.visits where landmark_id = any(p_landmark_ids) and visited_at >= p_since;
$$;
grant execute on function public.get_community_landmark_activity(text[], timestamptz) to authenticated, anon;
