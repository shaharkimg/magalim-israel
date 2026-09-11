-- מעיינות חדשים מ-familytrips.co.il - אזור 12 מתוך 14: ירושלים (העיר העתיקה ומרכז ירושלים,
-- הרי ירושלים). אותה מתודולוגיה - כל שם נבדק מול היעדים הקיימים ומול Google Maps.
--
-- נפסלו כחופפים ליעדים קיימים: עין כרם, גן לאומי עין חמד, נחל רפאים ועין לבן (=עין לבן
-- הקיים), הסטף (=שביל הבעל בסטף הקיים), עין עוג'ה (כבר נוסף בסבב יהודה-ושומרון כ-ein-auja).
-- "עיינות אליעזר" ב-Google Maps מוביל לאותה תוצאה בדיוק כמו "עין המסייעת" (כנראה שם-על
-- לאותו אשכול מעיינות) - נוסף פעם אחת בלבד תחת עין המסייעת.
--
-- 7 מעיינות אושרו ונוספו, קואורדינטות מאומתות בנפרד לכל אחד מול Google Maps:

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km, base_visits, family_friendly, dog_friendly, accessible, has_water, price_type, season, duration_hours, official_url)
values
  ('ein-matta', 'עין מטע',
   'מעיין קטן ושקט בהרי ירושלים, עם בריכת-מים צלולה מוקפת סלעים - יעד נעים לביקור קצר מחוץ לעיר.',
   'water', 'easy', 'jerusalem', 31.7155556, 35.05, 'כחצי שעה', 0.5, 46, true, false, false, true, 'free',
   null, 0.5, null),

  ('ein-tanur-jerusalem', 'עין תנור (הרי ירושלים)',
   'מעיין קטן וצנוע בהרי ירושלים, סמוך לעין מטע - נקודת-מים שקטה ופחות מוכרת לתיירים.',
   'water', 'easy', 'jerusalem', 31.714677, 35.048391, 'כחצי שעה', 0.5, 32, true, false, false, true, 'free',
   null, 0.5, null),

  ('ein-hamesayaat', 'עין המסייעת (המעיין המסתובב)',
   'מעיין ידוע ומרשים בקרבת ירושלים, המכונה "המעיין המסתובב" - בריכת-מים גדולה בשמורת-טבע עם נוף פתוח.',
   'water', 'medium', 'jerusalem', 31.8015927, 35.1318339, 'שעה', 1.5, 154, false, false, false, true, 'free',
   null, 1, null),

  ('ein-sappir', 'עין ספיר',
   'מעיין הנובע בתוך מערה קטנה בהרי ירושלים - יעד ייחודי וסקרן למטיילים המחפשים חוויה שונה.',
   'water', 'medium', 'jerusalem', 31.7608333, 35.1313889, 'שעה', 1, 145, false, false, false, true, 'free',
   null, 1, null),

  ('ein-miklaf', 'עין מקלף',
   'מעיין קטן ונגיש ליד מוצא, עם גישה נוחה כמעט עד לבריכת-המים - יעד קליל וקרוב לירושלים.',
   'water', 'easy', 'jerusalem', 31.7941887, 35.1648354, 'כחצי שעה', 0.5, 10, true, false, false, true, 'free',
   null, 0.5, null),

  ('ein-limor', 'עין לימור',
   'מעיין אינטימי בלב הרי ירושלים, סמוך לכפר עין ראפה, עם גישת-רכב נוחה כמעט עד המים - יעד רומנטי ושקט.',
   'water', 'easy', 'jerusalem', 31.792537, 35.107359, 'כחצי שעה', 0.5, 120, true, false, false, true, 'free',
   null, 0.5, null),

  ('ein-kesalon', 'עין כסלון',
   'בריכת-מעיין קטנה בנחל כסלון, עם קירות-אבן מסביב - נקודת-עצירה נעימה בדרך בהרי ירושלים.',
   'water', 'easy', 'jerusalem', 31.7780556, 35.0511111, 'כחצי שעה', 0.5, 62, true, false, false, true, 'free',
   null, 0.5, null)

on conflict (id) do nothing;
