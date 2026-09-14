-- inature.info - סבב שלישי (אחרון) מתוך בדיקת 263 מועמדי "שמורות טבע" - בדיקה אחת-אחת
-- בגוגל מפות. מכסה שורות 211-263 מתוך 263 - משלים את הרשימה המלאה שהמשתמש ביקש לבדוק
-- אחת-אחת ("עבור אחת-אחת ולבדוק בגוגל (מומלץ)").
--
-- כרגיל, רוב המועמדים נפסלו: "סגור לצמיתות", מעט ביקורות, שמות-מקום מקריים דומים בלי
-- קשר גיאוגרפי אמיתי, או חפיפה ליעדים קיימים (חורשת טל/מכתש רמון/החרמון/אלוני אבא/
-- ראש הנקרה/דור-הבונים - כולם כבר קיימים).
--
-- 8 יעדים אושרו ונוספו, קואורדינטות מאומתות בנפרד לכל אחד מול גוגל מפות.

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   points, base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('nahal-daliya-reserve', 'שמורת נחל דליה ויובליו', 'שמורת טבע רשמית (רשות הטבע והגנים) עם נחל ויובליו ברמת מנשה, מסלולי הליכה נעימים.', 'water', 'medium', 'center', 32.5899741, 35.010269, 'שעתיים', 2, 10, 78, true, false, false, true, 'free', null, 2, null),
  ('liman-reserve', 'שמורת טבע לימן', 'שמורת חוף וצמחייה בגליל המערבי, סמוך לגבול הלבנון - יעד הליכה שקט ונופי.', 'reserves', 'easy', 'north', 33.0687395, 35.1140106, 'שעה', 1, 10, 291, true, false, false, false, 'free', null, 1, null),
  ('yarden-park', 'פארק הירדן', 'פארק נופש לאורך נהר הירדן סמוך לכנרת, פופולרי לפיקניק, שיט בקיאקים ורחצה.', 'water', 'easy', 'north', 32.915945, 35.6309581, 'שעה', 1, 10, 849, true, false, false, true, 'free', null, 1, null),
  ('nahal-sorek-reserve', 'שמורת נחל שורק', 'שמורת נחל בשפלת יהודה, סמוך לבית שמש - מסלול הליכה נעים בין צוקי גיר.', 'water', 'easy', 'center', 31.763856, 35.037396, 'שעה', 1, 10, 66, true, false, false, true, 'free', null, 1, null),
  ('hof-galim-reserve', 'שמורת טבע חוף גלים', 'שמורת חוף פראית סמוך לכפר גלים ולחיפה, עם צמחיית-חוף ייחודית.', 'water', 'easy', 'north', 32.7698293, 34.9537681, 'שעה', 1, 10, 193, true, false, false, true, 'free', null, 1, null),
  ('shavei-tzion-beach', 'חוף שבי ציון', 'חוף חולי פופולרי בגליל המערבי, עם אתר-צלילה מוכר (ספינה טרופה) ובריכת מי-ים טבעית.', 'water', 'easy', 'north', 32.985439, 35.082436, 'שעה', 1, 10, 2046, true, false, false, true, 'free', null, 1, null),
  ('givat-aliya-beach', 'חוף גבעת עלייה', 'חוף ים פופולרי ביפו, עם שוברי-גלים ובריכות-סלעים טבעיות - יעד אהוב לרחצה.', 'water', 'easy', 'center', 32.0389571, 34.7453701, 'שעה', 1, 10, 1432, true, false, false, true, 'free', null, 1, null),
  ('nahal-avuka', 'נחל אבוקה', 'נחל זורם בעמק בית שאן, מסלול הליכה נעים בין בריכות-מים טבעיות.', 'water', 'medium', 'north', 32.466187, 35.54058, 'שעתיים', 2, 10, 66, true, false, false, true, 'free', null, 2, null)

on conflict (id) do nothing;
