-- israelhiking.osm.org.il - סבב 2: המשך בדיקת רשימת המועמדים מ-Overpass API (ראו הערת-ראש
-- בקובץ migrations_new_landmarks_israelhiking_round1.sql להסבר המתודולוגיה המלאה).
--
-- נפסלו בסבב זה: עין רסיס (לא אותר), מעיין מרים-גולן (בלבול-שם עם "מעיין מרים" המפורסם
-- בנצרת - לא אומת בביטחון), עין מסלע-קטלב (כפילות עם נחל קטלב הקיים), עין לוזה (רק תחנת-
-- אוטובוס, לא מעיין ממופה), עין ירד (ביקורות: "יבש לגמרי", "סכנת נפילה לבור ריק").
--
-- 9 יעדים אושרו ונוספו:

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   points, base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('maayan-hahamisha', 'מעיין החמישה',
   'מעיין קטן ומטופח סמוך לשדמות דבורה בגליל התחתון, אתר-הנצחה לחמישה חללי מלחמת צוק איתן - שולחנות-פיקניק מוצלים ומים צלולים.',
   'water', 'easy', 'north', 32.7040818, 35.4449556, 'שעה', 1,
   10, 221, true, false, false, true, 'free',
   null, 1, null),

  ('ein-aravot', 'עין ערבות',
   'מעיין נקי וקריר ביער ברעם, גליל עליון - הליכה קצרה מהחניה, בריכה קטנה מוצלת.',
   'water', 'easy', 'north', 33.0530576, 35.4422943, 'כחצי שעה', 0.5,
   10, 39, true, false, false, true, 'free',
   null, 0.5, null),

  ('ein-ampi', 'עין אמפי (עין אקליפטוס)',
   'בריכת-מעיין פופולרית מאוד ברמת הגולן הצפונית, בקרבת מפגש-הנחלים - יעד רחצה מוכר ומבוקש.',
   'water', 'easy', 'north', 32.9900508, 35.6603138, 'שעה', 1,
   10, 755, true, false, false, true, 'free',
   null, 1, null),

  ('maayan-yedidya', 'מעיין ידידיה',
   'מעיין ברמת הגולן סמוך לישוב יונתן, פרויקט-הנצחה עם נדנדה ופינת-ישיבה - הגישה דורשת רכב-שטח.',
   'water', 'medium', 'north', 32.9448717, 35.7874767, 'שעה', 1,
   10, 145, true, false, false, true, 'free',
   null, 1, null),

  ('einot-dkalim-beitshemesh', 'עינות דקלים',
   'מעיין קטן באזור בית שמש, בהרי יהודה.',
   'water', 'easy', 'jerusalem', 31.734444, 34.966893, 'כחצי שעה', 0.5,
   10, 44, false, false, false, true, 'free',
   null, 0.5, null),

  ('ein-roim', 'עין רועים',
   'מעיין קטן בצפון רמת הגולן.',
   'water', 'medium', 'north', 33.225885, 35.562340, 'כחצי שעה', 0.5,
   10, 61, false, false, false, true, 'free',
   null, 0.5, null),

  ('ein-aviel', 'עין אביאל',
   'פלג-מים זורם וקריר גם בקיץ באזור זכרון יעקב, חלק ממערכת נחל תנינים - הליכה נעימה בין עצים ושיחים, בריכה קטנה בהמשך המסלול.',
   'water', 'easy', 'north', 32.539370, 34.994829, 'שעה', 1,
   10, 275, true, false, false, true, 'free',
   null, 1, null),

  ('maayan-knaf', 'מעיין כנף (לזכרו של אשי נוביק)',
   'פארק-הנצחה סביב מעיין ברמת הגולן, עם פינות-ישיבה ונדנדות - שונה ונפרד ממצפה כנף הסמוך.',
   'water', 'easy', 'north', 32.8630862, 35.713115, 'שעה', 1,
   10, 384, true, true, false, true, 'free',
   null, 1, null),

  ('hamam-bnot-yaakov', 'חמאם בנות יעקב',
   'בריכת-מעיין חמימה וייחודית (כ-24 מעלות) סמוך לגשר בנות יעקב, עם בועות-גז קטנות עולות מהקרקעית - פינה קסומה ליד אתר הרפטינג בנהר הירדן.',
   'water', 'easy', 'north', 33.024883, 35.627464, 'כחצי שעה', 0.5,
   10, 30, true, false, false, true, 'free',
   null, 0.5, null)

on conflict (id) do nothing;
