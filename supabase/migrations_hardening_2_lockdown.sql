-- Production Readiness — שלב 2 מתוך 2: סגירת נתיבי הכתיבה הישירים הישנים.
-- הרץ רק אחרי ש-migrations_hardening_1_rpcs.sql רץ *והגרסה החדשה של האפליקציה כבר פרוסה*.
-- (הגרסה הישנה כותבת ישירות ל-visits / group_members וכו' - אחרי הקובץ הזה היא תיכשל בצ'ק-אין
-- וביצירת קבוצה. לכן הסדר: 1) קובץ 1, 2) פריסה, 3) קובץ הזה.)
--
-- מה הקובץ סוגר:
--  * visits / landmark_conquests / xp_bonus_grants: אין יותר insert ישיר. ניקוד נקבע רק בשרת
--    (checkin_landmark). זה התיקון הקריטי: קודם כל משתמש יכול היה לכתוב לעצמו points_awarded
--    ו-xp_awarded שרירותיים ולטפס לראש הדירוג בקריאה אחת.
--  * visits.update מוגבל לעמודות photo_url ו-note (לא ניתן לשנות points_awarded/user_id/landmark).
--  * groups / group_members / invites: יצירה והצטרפות רק דרך RPC. קודם אפשר היה להוסיף את עצמך
--    לכל קבוצה שהמזהה שלה ידוע, וכן עם role='owner'.
--  * friendships.update מוגבל ל-status/accepted_at. קודם הצד המוזמן יכול היה לשכתב requester_id
--    לכל משתמש ולהפוך לחבר "מאושר" שלו, ובכך לראות את הפעילות הפרטית שלו.
--  * group_destination_votes: נראה ונכתב רק על-ידי חברי הקבוצה (היה קריאה ציבורית + הצבעה בכל קבוצה).
--  * field_reports: ה-SELECT הציבורי (חשף user_id + יעד + זמן) נסגר; קריאה דרך RPC אנונימי.
--  * storage: ביטול רשימת-הקבצים הציבורית של ה-buckets (חשפה מי ביקר איפה), הגבלת גודל וסוג קובץ.

-- כל סעיף מוגן ב-to_regclass: אם migration של טבלה מסוימת עוד לא רץ אצלך, הסעיף שלה מדולג
-- בלי להפיל את שאר הקובץ.

-- ============ visits ============
drop policy if exists "users can insert their own visits" on public.visits;
revoke insert on public.visits from anon, authenticated;
revoke update on public.visits from anon, authenticated;
grant update (photo_url, note) on public.visits to authenticated;

-- ============ ניקוד ============
do $$
begin
  if to_regclass('public.landmark_conquests') is not null then
    drop policy if exists "users can insert their own conquests" on public.landmark_conquests;
    revoke insert, update, delete on public.landmark_conquests from anon, authenticated;
  end if;
  if to_regclass('public.xp_bonus_grants') is not null then
    drop policy if exists "users can insert their own bonus grants" on public.xp_bonus_grants;
    revoke insert, update, delete on public.xp_bonus_grants from anon, authenticated;
  end if;
end $$;

-- ============ badges: אירועי פתיחת תג. תגי ספירה פשוטים נבדקים מול הביקורים בפועל ============
create or replace function public.tg_validate_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  required int;
begin
  required := case new.badge_id
    when 'first' then 1 when 'milestone3' then 3 when 'seven' then 7
    when 'milestone10' then 10 when 'milestone25' then 25 when 'milestone50' then 50
    else null end;
  if required is not null and (select count(*) from public.visits where user_id = new.user_id) < required then
    raise exception 'badge_not_earned' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke execute on function public.tg_validate_badge() from public, anon, authenticated;
do $$
begin
  if to_regclass('public.user_badges') is not null then
    drop trigger if exists validate_badge on public.user_badges;
    create trigger validate_badge before insert on public.user_badges
      for each row execute function public.tg_validate_badge();
    revoke update, delete on public.user_badges from anon, authenticated;
  end if;
end $$;

-- ============ groups / group_members ============
drop policy if exists "users can create groups" on public.groups;
revoke insert, update on public.groups from anon, authenticated;
drop policy if exists "users can join groups themselves" on public.group_members;
revoke insert, update on public.group_members from anon, authenticated;

-- ============ invites ============
do $$
begin
  if to_regclass('public.invites') is not null then
    drop policy if exists "users can create invites as themselves" on public.invites;
    revoke insert, update on public.invites from anon, authenticated;
    grant update (is_active) on public.invites to authenticated;
  end if;
end $$;

-- ============ friendships: רק status / accepted_at ניתנים לעדכון ============
do $$
begin
  if to_regclass('public.friendships') is not null then
    revoke update on public.friendships from anon, authenticated;
    grant update (status, accepted_at) on public.friendships to authenticated;
  end if;
end $$;

-- ============ הצבעות קבוצתיות: חברי הקבוצה בלבד ============
do $$
begin
  if to_regclass('public.group_destination_votes') is not null then
    drop policy if exists "group votes are publicly readable" on public.group_destination_votes;
    drop policy if exists "users can vote for themselves" on public.group_destination_votes;
    drop policy if exists "users can change their own vote" on public.group_destination_votes;
    drop policy if exists "members can view group votes" on public.group_destination_votes;
    create policy "members can view group votes"
      on public.group_destination_votes for select
      using (public.is_group_member(group_id));
    drop policy if exists "members can vote for themselves" on public.group_destination_votes;
    create policy "members can vote for themselves"
      on public.group_destination_votes for insert
      with check (auth.uid() = user_id and public.is_group_member(group_id));
    drop policy if exists "members can change their own vote" on public.group_destination_votes;
    create policy "members can change their own vote"
      on public.group_destination_votes for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id and public.is_group_member(group_id));
  end if;
end $$;

-- ============ דיווחי שטח: לא ציבורי, ורק מי שביקר ביעד ============
do $$
begin
  if to_regclass('public.field_reports') is not null then
    drop policy if exists "field reports are publicly readable" on public.field_reports;
    drop policy if exists "users can view their own field reports" on public.field_reports;
    create policy "users can view their own field reports"
      on public.field_reports for select
      using (auth.uid() = user_id);
    drop policy if exists "users can insert their own field reports" on public.field_reports;
    create policy "users can insert their own field reports"
      on public.field_reports for insert
      with check (
        auth.uid() = user_id
        and exists (select 1 from public.visits v where v.user_id = auth.uid() and v.landmark_id = field_reports.landmark_id)
      );
  end if;
end $$;

-- ============ תמונות קהילה: רק על יעד שביקרת בו ============
do $$
begin
  if to_regclass('public.landmark_photos') is not null then
    drop policy if exists "users can insert their own landmark photos" on public.landmark_photos;
    create policy "users can insert their own landmark photos"
      on public.landmark_photos for insert
      with check (
        auth.uid() = user_id
        and exists (select 1 from public.visits v where v.user_id = auth.uid() and v.landmark_id = landmark_photos.landmark_id)
      );
  end if;
end $$;

-- ============ Storage ============
-- ה-buckets ציבוריים, ולכן הגשת קובץ לפי כתובת לא תלויה ב-policy של SELECT. ה-policy הציבורית
-- אפשרה רק דבר אחד נוסף: לרשום את כל הקבצים (uid/landmark-timestamp.jpg), כלומר מי ביקר
-- איפה ומתי - עקיפה מלאה של הגדרת הפרטיות של הפעילות. מחליפים ב-SELECT לתיקיית המשתמש עצמו.
drop policy if exists "checkin photos are publicly readable" on storage.objects;
drop policy if exists "checkin photos: owner can list" on storage.objects;
create policy "checkin photos: owner can list"
  on storage.objects for select
  using (bucket_id = 'checkin-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar photos are publicly readable" on storage.objects;
drop policy if exists "avatars: owner can list" on storage.objects;
create policy "avatars: owner can list"
  on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- הלקוח מכווץ את כל התמונות ל-JPEG בנפח קטן; מגבלה של 2MB וסוגי תמונה בלבד.
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('checkin-photos', 'avatars');
