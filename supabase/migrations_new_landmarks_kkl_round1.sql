-- מקור חדש: kkl.org.il/travel - רשימת האתרים/היערות/המצפורים המלאה של קק"ל (כ-450 פריטים,
-- טקסט רגיל בעמוד /travel/trips/ - לא מפת-canvas כמו israelhiking). הצלבנו מול היעדים
-- הקיימים (התאמת-שם), ואז אימות מול Google Maps (דירוג+ביקורות) לפריטים שלא נמצאו.
-- רוב הרשימה (יערות/חניוני-לילה/מצפורים אישיים-להנצחה קטנים/מסלולי-רכב-פרטי) לא נכללה -
-- ריכזנו רק את האתרים המשמעותיים והמאומתים כפופולריים.
--
-- 7 יעדים אושרו ונוספו:

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   points, base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('mitzpor-red-sea', 'מצפור הים האדום',
   'נקודת-תצפית מרהיבה ופופולרית מאוד באילת, עם נוף פנורמי אל הים האדום וההרים שמסביב.',
   'viewpoints', 'easy', 'eilat', 29.5414652, 34.9319486, 'כחצי שעה', 0.5,
   10, 517, true, false, true, false, 'free',
   null, 0.5, 'https://www.kkl.org.il/travel/'),

  ('bird-park-eilat', 'פארק הצפרות אילת',
   'מרכז-צפרות בינלאומי באילת, בצומת נתיבי-הנדידה של ציפורים בין אפריקה לאירופה - סיורים מודרכים ותצפית על עופות-מים נדירים.',
   'nature', 'easy', 'eilat', 29.572824, 34.9724385, 'שעה', 1,
   10, 1725, true, false, true, true, 'paid',
   null, 1, 'https://www.kkl.org.il/travel/'),

  ('basalt-canyon', 'קניון הבזלת',
   'נקיק-בזלת ליד בית שאן, עם סדרת מפלים קטנים של נחל חרוד וגשר-תלוי מרשים שבנתה קק"ל מעל הקניון - חניון-פיקניק סמוך.',
   'nature', 'easy', 'north', 32.507006, 35.52058, 'שעה', 1,
   10, 486, true, false, false, true, 'free',
   null, 1, 'https://www.kkl.org.il/travel/'),

  ('white-falls', 'המפלים הלבנים',
   'מפלים ובריכות-מים יפים בעמק הירדן, יעד רחצה וטיול משפחתי מוכר.',
   'water', 'easy', 'north', 32.4756791, 35.5036776, 'שעה', 1,
   10, 725, true, false, false, true, 'free',
   null, 1, null),

  ('rosh-tzipor-park', 'ראש ציפור - פארק הצפרות של תל אביב',
   'ריאה ירוקה ופארק-צפרות ברמת גן, עם אגם, חורשות, גן-קקטוסים ותנים בשעות הערב - יעד טבע עירוני מבוקש.',
   'nature', 'easy', 'center', 32.0950008, 34.8052481, 'שעה', 1,
   10, 504, true, true, true, true, 'free',
   null, 1, 'https://www.kkl.org.il/travel/'),

  ('adamit-park', 'פארק אדמית',
   'פארק-קק"ל בגליל המערבי לצד גבול לבנון, עם שביל-הליכה מונגש עד מערת קשת ומצפור לזכר אהוד גולדווסר ואלדד רגב - נוף הררי מרהיב.',
   'reserves', 'easy', 'north', 33.079156, 35.1996371, 'שעה', 1,
   10, 327, true, false, true, false, 'free',
   null, 1, 'https://www.kkl.org.il/travel/'),

  ('begin-park-jerusalem', 'פארק בגין (ירושלים)',
   'פארק-יער גדול בהרי ירושלים, עם מסלולי-הליכה, חניוני-פיקניק וחניוני-לילה - יעד טבע פופולרי בפאתי העיר.',
   'reserves', 'easy', 'jerusalem', 31.7301575, 35.1131245, 'שעתיים', 2,
   10, 173, true, false, false, false, 'free',
   null, 2, 'https://www.kkl.org.il/travel/')

on conflict (id) do nothing;
