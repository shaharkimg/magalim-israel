-- מעיינות חדשים מ-familytrips.co.il - אזור 10 מתוך 14: רמות מנשה והסביבה. אותה
-- מתודולוגיה - כל שם נבדק מול היעדים הקיימים ומול Google Maps.
--
-- נפסלו כחופפים ליעדים קיימים: "שמורת הטבע נחל תות: עין תות ביער חגית" - Google Maps
-- זיהה רק את "יער חגית" הכללי (אתר-פיקניק/פארק), לא נקודת-מעיין נפרדת ומאומתת. "עין זריק
-- (עין כניסה)" - החיפוש לא הוביל לתוצאה אמינה וברורה (רק "תל זריק" הארכיאולוגי ו"עין
-- סוקר" הלא-קשור) - דולג. לא נכללו כתבות-סיכום/מסלולים-כלליים (שביל מגידו, דרך נוף גלעד,
-- שביל סיון, חניון אורן זמיר) ואטרקציות-לא-מעיין (מאגר גלעד, חורבת קירה).
--
-- 3 מעיינות אושרו ונוספו:

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   points, base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('ein-rihaniya', 'עין ריחניה (מפל ריחניה)',
   'מפל ובריכת-מעיין ברמות מנשה, בתוך נוף ירוק ושקט - יעד קליל למרחק הליכה קצר מהחניה.',
   'water', 'medium', 'north', 32.6207674, 35.0909932, 'שעה', 1.5,
   10, 40, true, false, false, true, 'free',
   null, 1, null),

  ('maayan-haulmosim', 'מעיין האולמוסים',
   'מעיין ברמת השופט, עם בריכת-מים טבעית מוקפת סלעים - יעד רחצה מוכר ברמות מנשה.',
   'water', 'easy', 'north', 32.6147726, 35.0930927, 'שעה', 1,
   10, 94, true, false, false, true, 'free',
   null, 1, null),

  ('ein-nili', 'עין נילי',
   'מעיין זורם ברמות מנשה, עם בריכת-מים נעימה לרחצה בעונה החמה - יעד פופולרי יחסית באזור.',
   'water', 'easy', 'north', 32.5541667, 35.0494444, 'שעה', 1,
   10, 161, true, false, false, true, 'free',
   null, 1, null)

on conflict (id) do nothing;
