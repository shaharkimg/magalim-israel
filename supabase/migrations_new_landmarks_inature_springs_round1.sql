-- inature.info - סבב מעיינות: המשך בדיקת רשימת המועמדים (מעיינות במרחק>0.6 ק"מ מיעד קיים).
-- נפסלו: שמורת דורא אל קרע/שמורת עינות זרקא (0 ביקורות/סגור לצמיתות), שמורת עין בדולח
-- (0 ביקורות), רוב שאר הרשימה קרובה מדי (0.6-2 ק"מ) ליעדים קיימים - כנראה תת-מאפיינים.
-- "עין דבשה" נפסל בבדיקה נוספת - זוהה כחפיפה מדויקת (כ-130 מ' בלבד) עם "עין דיבשה"
-- (ein-divsha) הקיים כבר - כפילות-תעתיק של אותו שם, לא סקריפט המרחקים תפס את זה נכון בהתחלה.
--
-- 3 יעדים אושרו ונוספו:

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   points, base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('maayan-timna-shfela', 'מעיין תימנה', 'מעיין בשפלת יהודה, סמוך לגדרה ולתל מקנה העתיק.', 'water', 'easy', 'center', 31.7841602, 34.8337033, 'שעה', 1, 10, 528, true, false, false, true, 'free', null, 1, null),
  ('tel-mikne-ekron', 'תל מיקנה (עקרון)', 'תל ארכיאולוגי בשפלה, המזוהה עם העיר הפלישתית עקרון.', 'archaeology', 'easy', 'center', 31.7787151, 34.8500709, 'שעה', 1, 10, 51, false, false, false, false, 'free', null, 1, null),
  ('ein-mokesh', 'עין מוקש', 'זוג בריכות-מים עמוקות ברמת הגולן, פופולריות לקפיצות-מצוק - יעד רחצה מבוקש.', 'water', 'medium', 'north', 33.0977822, 35.8172881, 'שעה', 1, 10, 383, false, false, false, true, 'free', null, 1, null)

on conflict (id) do nothing;
