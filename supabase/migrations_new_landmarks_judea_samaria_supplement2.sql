-- השלמה שנייה ליהודה ושומרון - בעקבות שאלת המשתמש "אין עוד מעיינות ומסלולי טיול באזור?".
-- נבדקו שוב עמודי-המעיינות של maslulim-israel.co.il (מזרח/מערב שומרון ובנימין, גוש עציון) -
-- רוב הפריטים הנוספים חסומים מעבר ל-11 הראשונים (דורש מנוי בתשלום, לא נרשמנו), ורבים מהשאר
-- הם בורות-מים זעירים ולא-ממופים בביטחון ב-Google Maps (עין אל קסיס, עין לבנה, מעיין מאיר,
-- עין רחל - לא אותרו). ואדי פוכין נבדק ונפסל - מתייחס לכפר/עמק שלם, לא לנקודת-מעיין ספציפית.
--
-- 1 יעד אושר ונוסף:

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   points, base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('maayan-amasa', 'מעיין עמשא (עין מחנה)',
   'מעיין זורם בבנימין המזרחי, עם בריכת-מים טבעית בנוף גבעות פתוח - יעד רחצה שקט ופחות מוכר.',
   'water', 'easy', 'center', 32.180515, 35.26771, 'שעה', 1,
   10, 81, true, false, false, true, 'free',
   null, 1, null)

on conflict (id) do nothing;
