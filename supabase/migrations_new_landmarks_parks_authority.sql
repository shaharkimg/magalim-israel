-- הוספת 2 יעדים חדשים למפה, מבוססים על מאמרים רשמיים של רשות הטבע והגנים
-- (parks.org.il) — לא מהמלצות פייסבוק (הקבוצה חסמה גישה כאורח אחרי כ-7 פוסטים, ושני שמות-
-- המסלול היחידים שהיו נגישים בה — נחל ערוגות ונחל אל על — כבר קיימים במפה, ולא הוספו שוב).
--
-- קואורדינטות אומתו בנפרד מול Google Maps (לא מנוחשות) על סמך שם-המקום המדויק שמופיע
-- במאמר הרשמי (נקודת המוצא של כל מסלול). official_url מצביע ישירות למאמר המקורי.

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   points, base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('yahmurim-trail', 'שביל היחמורים',
   'שביל קצר ונעים בחורש הכרמל, מחניון הכלניות ועד שמורת חי-בר כרמל, עם סיכוי להבחין בעדרי יחמורים ואיילי כרמל שהושבו לטבע.',
   'reserves', 'easy', 'north', 32.7571474, 35.0201328, 'כשעה', 1,
   10, 340, true, false, false, false, 'free',
   null, 1, 'https://www.parks.org.il/trip/fallow-deer-carmel/'),

  ('nahal-avuv', 'נחל אבוב',
   'מסלול אתגרי בשמורת נחל אבוב במדבר יהודה, הכולל ירידה בעזרת יתדות ברזל לצד מפל סלע גבוה ובריכות מים עונתיות בקניון מפותל.',
   'water', 'hard', 'deadsea', 31.2321212, 35.2380755, '3 שעות', 3,
   50, 180, false, false, false, true, 'free',
   null, 3, 'https://www.parks.org.il/trip/abuv/')

on conflict (id) do nothing;
