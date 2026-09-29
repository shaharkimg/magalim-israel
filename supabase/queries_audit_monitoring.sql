-- שאילתות לקריאה בלבד: זיהוי נתוני ניקוד מזויפים מלפני ההקשחה, וניטור שוטף.
-- הרצה: Supabase Dashboard → SQL Editor. שום שאילתה כאן לא משנה נתונים.
-- (סעיף "תיקון" בסוף מסומן בהערה בכוונה: מחליטים עליו ידנית אחרי שרואים את התוצאות.)

-- ============ 1. ביקורת ניקוד קיים ============
-- כיבוש לגיטימי שווה לכל היותר 80 (58 * 1.4 מעוגל ל-5) והוא תמיד כפולה של 5.
select c.user_id, p.name, c.landmark_id, c.xp_awarded, c.conquered_at
from public.landmark_conquests c join public.profiles p on p.id = c.user_id
where c.xp_awarded > 80 or c.xp_awarded % 5 <> 0 or c.xp_awarded < 5
order by c.xp_awarded desc;

-- בונוסים: רק הצמדים (סוג, ערך) שהשרת מעניק היום. הצמדים ההיסטוריים מה-backfill יופיעו כאן
-- ויש לבדוק אותם ידנית לפני שמסיקים שהם מזויפים.
select b.user_id, p.name, b.bonus_type, b.source_id, b.xp_awarded, b.granted_at
from public.xp_bonus_grants b join public.profiles p on p.id = b.user_id
where (b.bonus_type, b.xp_awarded) not in (
  ('weekly_challenge', 50), ('first_destination', 10), ('new_region', 5), ('new_category', 5),
  ('region_25', 10), ('region_50', 20), ('region_75', 30), ('region_100', 50), ('collection_complete', 20))
order by b.xp_awarded desc;

-- XP כולל לכל משתמש, מהגבוה לנמוך - חריגים בולטים (יותר ממה שאפשר לצבור מכל היעדים + כל הבונוסים)
select p.id, p.name,
       coalesce(c.xp, 0) + coalesce(b.xp, 0) as total_xp, coalesce(c.n, 0) as conquests
from public.profiles p
left join (select user_id, sum(xp_awarded) xp, count(*) n from public.landmark_conquests group by 1) c on c.user_id = p.id
left join (select user_id, sum(xp_awarded) xp from public.xp_bonus_grants group by 1) b on b.user_id = p.id
order by total_xp desc limit 25;

-- כיבושים בקצב לא סביר: יותר מ-15 יעדים ביום אחד
select user_id, visited_at::date as day, count(*) as visits
from public.visits group by 1, 2 having count(*) > 15 order by visits desc;

-- ============ 2. ניטור שוטף ============
-- שגיאות צד-לקוח ב-24 השעות האחרונות, לפי תדירות
select left(message, 120) as message, count(*) as n, max(created_at) as last_seen
from public.client_errors where created_at > now() - interval '24 hours'
group by 1 order by n desc limit 30;

-- כשלי צ'ק-אין לפי סיבה (too_far / impossible_travel / rate_limited / network ...), 7 ימים
select payload->>'reason' as reason, count(*) as n
from public.analytics_events
where event_name = 'checkin_failed' and created_at > now() - interval '7 days'
group by 1 order by n desc;

-- מפתחות שקרובים למכסה (גילוי ניסיונות שימוש לרעה): הטבלה לא נגישה ללקוחות, רק כאן
select key, hits, window_start from public.rate_limits order by hits desc limit 25;

-- ============ 3. משפך (Funnel) 30 יום - משתמשים ייחודיים בכל שלב ============
with ev as (
  select coalesce(user_id::text, session_id) as who, event_name
  from public.analytics_events where created_at > now() - interval '30 days'
)
select
  count(distinct who) filter (where event_name = 'session_started')     as sessions,
  count(distinct who) filter (where event_name = 'signup_completed')    as registered,
  count(distinct who) filter (where event_name = 'map_opened')          as opened_map,
  count(distinct who) filter (where event_name = 'destination_viewed')  as viewed_destination,
  count(distinct who) filter (where event_name in ('navigation_started', 'trip_started')) as navigated,
  count(distinct who) filter (where event_name = 'checkin_completed')   as checked_in,
  count(distinct who) filter (where event_name = 'badge_unlocked')      as unlocked_badge
from ev;

-- חזרה לאפליקציה: משתמשים שהתחילו סשן ביותר מיום אחד ב-30 הימים
select count(*) as returning_users from (
  select user_id from public.analytics_events
  where event_name = 'session_started' and user_id is not null and created_at > now() - interval '30 days'
  group by 1 having count(distinct created_at::date) > 1) t;

-- ============ 4. תיקון (ידני, אחרי בדיקה) - כיבוש ששוחזר לערך הנכון לפי היעד ============
-- update public.landmark_conquests c
--    set xp_awarded = public.points_for_landmark(l)
--   from public.landmarks l
--  where l.id = c.landmark_id and (c.xp_awarded > 80 or c.xp_awarded % 5 <> 0);
