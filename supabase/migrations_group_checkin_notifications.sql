-- Push Notifications — שלב 2: התראת "חבר-קבוצה כבש יעד", כולל הנקודות שקיבל
-- הרץ פעם אחת ב-Supabase Dashboard → SQL Editor → New query → Run
--
-- מה היה חסר: notify_friend_checkin הקיים הודיע רק ל*חברים מאושרים* (friendships).
-- חבר-קבוצה שאינו גם חבר אישי לא קיבל שום עדכון על כיבוש, אף שזו בדיוק ההתראה
-- שקבוצת-טיולים רוצה. בנוסף ה-payload לא כלל את הנקודות שהוענקו.
--
-- שלוש החלטות שמעוגנות כאן:
--
-- 1. ביקור חוזר לא מייצר התראה בכלל. מאז שדרוג ה-XP, points_awarded הוא 0 בדיוק
--    כשזה לא כיבוש-ראשון (ראו grantConquestAndBonuses ב-app.js), אז הבדיקה
--    points_awarded > 0 היא הסימן האמין ל"זה באמת כיבוש" - בלי להסתמך על סדר
--    ההכנסה מול landmark_conquests, שהוא פרט-מימוש של הלקוח.
--
-- 2. מי שהוא גם חבר אישי וגם חבר-קבוצה מקבל התראה אחת בלבד (friend_checkin,
--    האישית מבין השתיים). ההחרגה היא על עצם קיום הידידות ולא על ההעדפות שלה:
--    מי שכיבה "התראות מחברים" בחר לא לשמוע על כיבושים של חברים, ולשלוח לו
--    group_checkin במקום היה עוקף את הבחירה הזו.
--
-- 3. רק חברי-קבוצה עם status='active' מקבלים - חברות ממתינה (pending) עדיין לא
--    מזכה בגישה לפעילות הקבוצה.

create or replace function public.notify_friend_checkin()
returns trigger as $$
declare
  visitor_name text;
  landmark_name text;
  awarded int;
  payload jsonb;
begin
  awarded := coalesce(new.points_awarded, 0);
  -- ביקור חוזר (0 נקודות) - לא כיבוש, אין על מה להודיע
  if awarded <= 0 then
    return new;
  end if;

  select name into visitor_name from public.profiles where id = new.user_id;
  select name into landmark_name from public.landmarks where id = new.landmark_id;

  payload := jsonb_build_object(
    'visitor_id',    new.user_id,
    'visitor_name',  coalesce(visitor_name, 'מטייל/ת'),
    'landmark_id',   new.landmark_id,
    'landmark_name', coalesce(landmark_name, ''),
    'points',        awarded
  );

  -- ============ חברים מאושרים ============
  insert into public.notifications (user_id, type, payload)
  select
    case when f.requester_id = new.user_id then f.addressee_id else f.requester_id end,
    'friend_checkin',
    payload
  from public.friendships f
  join public.profiles p
    on p.id = (case when f.requester_id = new.user_id then f.addressee_id else f.requester_id end)
  where f.status = 'accepted'
    and (f.requester_id = new.user_id or f.addressee_id = new.user_id)
    and coalesce((p.notification_prefs->>'enabled')::boolean, true)
    and coalesce((p.notification_prefs->>'friends')::boolean, true);

  -- ============ חברי קבוצה משותפת שאינם כבר חברים אישיים ============
  -- distinct כי שני אנשים יכולים לחלוק יותר מקבוצה אחת, ואז אותו נמען היה מקבל
  -- שורה לכל קבוצה משותפת.
  insert into public.notifications (user_id, type, payload)
  select distinct gm_other.user_id, 'group_checkin', payload
  from public.group_members gm_self
  join public.group_members gm_other
    on gm_other.group_id = gm_self.group_id
   and gm_other.user_id <> new.user_id
   and gm_other.status = 'active'
  join public.profiles p on p.id = gm_other.user_id
  where gm_self.user_id = new.user_id
    and gm_self.status = 'active'
    and coalesce((p.notification_prefs->>'enabled')::boolean, true)
    and coalesce((p.notification_prefs->>'groups')::boolean, true)
    and not exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and ( (f.requester_id = new.user_id and f.addressee_id = gm_other.user_id)
           or (f.addressee_id = new.user_id and f.requester_id = gm_other.user_id) )
    );

  return new;
end;
$$ language plpgsql security definer set search_path = public;
