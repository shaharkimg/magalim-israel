-- israelhiking.osm.org.il - סבב 3 (אחרון בסבב הנוכחי): המשך בדיקת רשימת המועמדים מ-Overpass
-- API. נפסלו: עין זריק (מזוהה כ"תל זריק" הארכיאולוגי, לא מעיין נפרד - תואם פסילה קודמת
-- מסבב רמות-מנשה), הזולה של בן (חופף ל"טיול בראש פינה" הקיים, רק 5 ביקורות), מעיין השמחה
-- (0.7 ק"מ בלבד מנחל ירמות הקיים - קרוב מדי, כנראה תת-מאפיין של אותו אתר), עין סרטן (לא
-- אותר ישירות, אך החיפוש חשף שני יעדים חדשים ואיכותיים מאוד באזור - ראו למטה).
--
-- 3 יעדים אושרו ונוספו:

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   points, base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('ein-tina-golan', 'עין תינה',
   'מעיין פופולרי מאוד ברמת הגולן, עם בריכות-מים נעימות ונוף פתוח.',
   'water', 'easy', 'north', 33.077700, 35.646449, 'שעה', 1,
   10, 389, true, false, false, true, 'free',
   null, 1, null),

  ('mei-kedem-alona', 'מי קדם (פארק אלונה)',
   'שמורת-טבע ואתר-תיירות מוביל ביער אלונה, עם מנהרות-מים רומיות עתיקות ומעיינות - יעד משפחתי מוכר ומבוקש מאוד.',
   'heritage', 'easy', 'north', 32.5545004, 35.0059571, 'שעה', 1,
   10, 2195, true, false, false, true, 'free',
   null, 1, null),

  ('ein-amikam', 'עין עמיקם',
   'מעיין בהרי הכרמל, סמוך לעמיקם - יעד-הליכה קליל ופחות מוכר.',
   'water', 'easy', 'north', 32.5697222, 35.0211111, 'כחצי שעה', 0.5,
   10, 111, false, false, false, true, 'free',
   null, 0.5, null)

on conflict (id) do nothing;
