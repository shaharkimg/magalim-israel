-- Gamification & Progression Overhaul, Phase 8 - Backfill היסטורי (נפרד, אופציונלי, לא
-- מורץ אוטומטית). קובץ זה קיים כדי לתת למשתמשים קיימים (שיש להם check-ins מלפני השדרוג)
-- XP-בסיס תחת הסולם החדש (10/20/35/50), במקום להתחיל מ-0 ולצבור רק מכאן ואילך.
--
-- *** חשוב לקרוא לפני ההרצה ***
--
-- מה זה כן עושה:
-- 1) לכל זוג (משתמש,יעד) שמופיע ב-visits ועדיין אין לו שורה ב-landmark_conquests (כלומר
--    כיבוש שקרה *לפני* שהמערכת החדשה עלתה) - נוצרת שורת-כיבוש חדשה, עם ה-XP המחושב לפי
--    *רמת-הקושי הנוכחית* של היעד (אין לנו תיעוד היסטורי של קושי-בזמן-הביקור, אז זו ההערכה
--    הכי טובה והכי שקופה שאפשר - בדיוק כפי שתועד ב-plan). התאריך הוא הביקור המוקדם-ביותר
--    שנמצא לאותו יעד (לא "עכשיו").
-- 2) מעדכן את visits.points_awarded בהתאם: הביקור המוקדם-ביותר לכל יעד מקבל את ה-XP
--    שחושב, וכל ביקור חוזר לאותו יעד מתאפס ל-0 - כדי שרשימת "כבשתי" בפרופיל (שמציגה
--    +X ישירות מהעמודה הזו) תישאר עקבית עם שאר האפליקציה, שכבר עברה כולה לקרוא XP מ-
--    landmark_conquests/xp_bonus_grants ולא מ-visits.points_awarded.
--
-- מה זה *לא* עושה (במכוון, לא פספוס):
-- - *אינו* מעניק רטרואקטיבית אף אחד מבונוסי-ה-XP החד-פעמיים (יעד-ראשון/אזור-חדש/
--   קטגוריה-חדשה/אבני-דרך-אזוריות/השלמת-אוסף). שחזור מדויק של "מתי בדיוק כל בונוס כזה
--   היה אמור להיות מוענק" דורש לשחזר את סדר-הגילוי הכרונולוגי המדויק של כל משתמש ומסוכן
--   הרבה יותר לטעויות-שקטות מאשר תועלת שהוא נותן. המשמעות המעשית: משתמש ותיק שכבר
--   כיבש למשל 100% מ"הצפון" *לפני* השדרוג - לא יקבל את בונוס-אבן-הדרך של "הצפון" בעבר
--   וגם לא בעתיד (כי אחרי ה-backfill הוא כבר "מעבר לסף" ולא יחצה אותו שוב). בונוסים
--   חדשים (יעד/אזור/קטגוריה שטרם נכבשו, אבני-דרך שטרם הושלמו) ימשיכו להיות מוענקים כרגיל.
-- - *אינו* נוגע ביעדים שנמחקו בינתיים (JOIN פנימי מול landmarks - אם ה-id לא קיים היום,
--   השורה פשוט לא מטופלת, לא בשגיאה ולא בניחוש).
-- - *אינו* מריץ שום דבר אוטומטית - קובץ נפרד זה, בדיוק כמו כל מיגרציה אחרת בשיחה הזו,
--   מחכה שתריץ אותו ידנית ב-SQL Editor כשתחליט שאתה מוכן.
--
-- מומלץ להריץ בזמן שקט יחסית (לא באמצע גל-צ'ק-אינים חי), ולוודא אחרי ההרצה עם שאילתת-
-- בדיקה (יש דוגמה בסוף הקובץ, מוערת-החוצה).

-- שלב 1: יצירת שורת-כיבוש לכל (משתמש,יעד) שעדיין אין לו אחת.
insert into public.landmark_conquests (user_id, landmark_id, xp_awarded, difficulty_at_conquest, conquered_at)
select distinct on (v.user_id, v.landmark_id)
  v.user_id,
  v.landmark_id,
  case l.difficulty
    when 'easy' then 10
    when 'medium' then 20
    when 'hard' then 35
    when 'extreme' then 50
    else 10
  end as xp_awarded,
  l.difficulty as difficulty_at_conquest,
  v.visited_at as conquered_at
from public.visits v
join public.landmarks l on l.id = v.landmark_id
order by v.user_id, v.landmark_id, v.visited_at asc
on conflict (user_id, landmark_id) do nothing;

-- שלב 2: עדכון visits.points_awarded - הביקור המוקדם-ביותר לכל יעד מקבל את ה-XP,
-- ביקורים חוזרים מתאפסים ל-0 (בדיוק כמו ההתנהגות של confirmCheckin מהיום והלאה).
with ranked as (
  select
    v.id,
    row_number() over (partition by v.user_id, v.landmark_id order by v.visited_at asc) as rn,
    case l.difficulty
      when 'easy' then 10
      when 'medium' then 20
      when 'hard' then 35
      when 'extreme' then 50
      else 10
    end as tier_xp
  from public.visits v
  join public.landmarks l on l.id = v.landmark_id
)
update public.visits
set points_awarded = case when ranked.rn = 1 then ranked.tier_xp else 0 end
from ranked
where visits.id = ranked.id;

-- בדיקה אופציונלית אחרי ההרצה (הסר את ה-הערה כדי להריץ) - משווה, למשתמש ספציפי, את
-- סך-ה-XP ה"ישן" (visits.points_awarded, שאמור עכשיו להיות זהה לחדש) מול הסכום החדש
-- (landmark_conquests+xp_bonus_grants):
--
-- select
--   (select coalesce(sum(points_awarded),0) from public.visits where user_id = '<UUID-כאן>') as visits_sum,
--   (select coalesce(sum(xp_awarded),0) from public.landmark_conquests where user_id = '<UUID-כאן>')
--     + (select coalesce(sum(xp_awarded),0) from public.xp_bonus_grants where user_id = '<UUID-כאן>') as new_total_xp;
