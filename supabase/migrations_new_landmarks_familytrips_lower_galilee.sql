-- מעיינות חדשים מ-familytrips.co.il - אזור 9 מתוך 14: כרמיאל, גוש משגב וציפורי (גליל
-- תחתון). אותה מתודולוגיה - כל שם נבדק מול היעדים הקיימים ומול Google Maps.
--
-- נפסלו כחופפים ליעדים קיימים: גן לאומי נחל צלמון (=נחל צלמון הקיים), שמורת הר עצמון
-- (=תל יודפת והר עצמון הקיים). "טחנת הנזירים נחל ציפורי" ו"תל חנתון" אינם מעיינות
-- ספציפיים (טחנה עתיקה, תל ארכיאולוגי) - לא נכללו.
--
-- 3 מעיינות אושרו ונוספו:

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km, base_visits, family_friendly, dog_friendly, accessible, has_water, price_type, season, duration_hours, official_url)
values
  ('ein-yivka', 'עין יבקע (מעיין הסוסים)',
   'מעיין זורם ופופולרי בגליל התחתון עם בריכת-מים גדולה ונוף ירוק מסביב - יעד רחצה מבוקש למשפחות.',
   'water', 'easy', 'north', 32.756441, 35.174689, 'שעה', 1, 730, true, false, false, true, 'free',
   null, 1, null),

  ('ein-netofa', 'עין נטופה',
   'מעיין נובע מול נוף פתוח של בקעת בית נטופה בגליל התחתון - יעד שקט ופחות מוכר.',
   'water', 'medium', 'north', 32.8391667, 35.3744444, 'שעה', 1.5, 6, true, false, false, true, 'free',
   null, 1, null),

  ('einot-tzipori', 'עינות ציפורי',
   'מעיין צלול ומרענן באזור נצרת, עם שרידים עתיקים בסביבה - יעד קליל לביקור קצר.',
   'water', 'easy', 'north', 32.733722, 35.276754, 'כחצי שעה', 0.5, 13, true, false, false, true, 'free',
   null, 0.5, null)

on conflict (id) do nothing;
