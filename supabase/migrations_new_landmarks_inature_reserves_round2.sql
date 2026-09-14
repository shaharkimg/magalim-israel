-- inature.info - סבב שני מתוך בדיקת 263 מועמדי "שמורות טבע" - בדיקה אחת-אחת בגוגל מפות.
-- מכסה שורות 141-210 מתוך 263 ברשימה (ממוינת לפי מרחק יורד מהיעד הקיים הקרוב ביותר).
--
-- כמו בסבב הקודם, רוב המועמדים נפסלו: "סגור לצמיתות", מעטות ביקורות, או חפיפה גיאוגרפית
-- ליעד קיים (למשל "גן לאומי כורזים"/"תל בית צידה"/"פארק אדמית"/"נחל עמוד" - כבר קיימים;
-- "שמורת זיתא"/"מרמות נפתלי" - חופפים ל-tiuli קיימים).
--
-- 13 יעדים אושרו ונוספו, קואורדינטות מאומתות בנפרד לכל אחד מול גוגל מפות.

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   points, base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('nahal-dalton', 'נחל דלתון', 'נחל זורם בגליל העליון, מסלול הליכה נעים בין סלעי בזלת וברכות מים.', 'water', 'medium', 'north', 33.008555, 35.513685, 'שעתיים', 2, 10, 75, true, false, false, true, 'free', null, 2, null),
  ('nahal-dishon', 'נחל דישון', 'נחל זורם בגליל העליון, מסלול הליכה פופולרי לצד ברכות מים ומפלים עונתיים.', 'water', 'medium', 'north', 33.0627711, 35.5267112, 'שעתיים', 2, 10, 140, true, false, false, true, 'free', null, 2, null),
  ('ein-dishon', 'עין דישון', 'מעיין קטן בגליל העליון, סמוך לנחל דישון - יעד הליכה נעים.', 'water', 'easy', 'north', 33.077428, 35.5107472, 'שעה', 1, 10, 71, true, false, false, true, 'free', null, 1, null),
  ('nahal-shilo', 'נחל שילה (ואדי עמוריה)', 'נחל זורם בהרי שומרון, מסלול הליכה פופולרי מאוד עם נופי בר עונתיים.', 'water', 'medium', 'center', 32.060468, 35.077335, 'שעתיים', 2, 10, 463, true, false, false, true, 'free', null, 2, null),
  ('rehovot-winter-pond', 'שלולית החורף רחובות', 'בריכת חורף טבעית עירונית ברחובות, בית-גידול לצמחים וחיות ייחודיים - יעד פופולרי לטיולי משפחות.', 'water', 'easy', 'center', 31.907071, 34.8412953, 'חצי שעה', 0.5, 10, 277, true, false, true, true, 'free', 'winter', 0.5, null),
  ('odem-forest', 'יער אודם', 'יער נטוע נרחב ברמת הגולן הצפונית, פופולרי לטיולי-רגל, רכיבת-אופניים ופיקניק.', 'nature', 'easy', 'north', 33.194898, 35.7345331, 'שעה', 1, 10, 112, true, false, false, false, 'free', null, 1, null),
  ('eilat-mountains-reserve', 'שמורת הרי אילת', 'שמורת הרים מדברית מרשימה סמוך לאילת, עם נופי אודם ומסלולי הליכה מאתגרים.', 'mountains', 'medium', 'eilat', 29.683870, 34.904520, 'שעתיים', 2, 10, 59, true, false, false, false, 'free', null, 2, null),
  ('habonim-beach-reserve', 'שמורת טבע חוף הבונים', 'רצועת חוף מוגנת עם מפרצים, רכסי אבן-חול ושרידי עיר-נמל עתיקה - אחת השמורות הפופולריות בישראל, מותר להכניס כלבים.', 'reserves', 'easy', 'north', 32.642910, 34.923400, 'שעתיים', 2, 10, 5283, true, true, false, true, 'free', null, 2, null),
  ('horshan-reserve', 'שמורת הר חורשן', 'שמורת הר סמוך לזכרון יעקב, עם נוף לחוף הכרמל ומסלולי הליכה - מותר להכניס כלבים.', 'mountains', 'medium', 'north', 32.5792704, 34.9942876, 'שעתיים', 2, 10, 70, true, true, false, false, 'free', null, 2, null),
  ('neve-yam-beach', 'חוף נווה ים', 'חוף ים גדול ופתוח סמוך למושב נווה ים, פופולרי מאוד לרחצה ולבילוי חוף.', 'water', 'easy', 'north', 32.681680, 34.927270, 'שעה', 1, 10, 2335, true, false, false, true, 'free', null, 1, null),
  ('brechat-yaar-hadera', 'שמורת בריכת יער', 'בריכת-חורף טבעית ביער חדרה, בית-גידול לצמחייה ובעלי-חיים ייחודיים.', 'water', 'easy', 'center', 32.411210, 34.899100, 'חצי שעה', 0.5, 10, 339, true, false, false, true, 'free', 'winter', 0.5, null),
  ('shaar-hamakim-reserve', 'שמורת שער העמקים', 'שמורת צמחייה ונוף בר סמוך לקיבוץ שער העמקים, יעד הליכה שקט ונעים.', 'nature', 'easy', 'north', 32.735300, 35.113930, 'שעה', 1, 10, 57, true, false, false, false, 'free', null, 1, null),
  ('einot-pekham', 'עינות פחם', 'מעיינות עונתיים ברמת הגולן, יעד הליכה נעים בעונת החורף-אביב.', 'water', 'medium', 'north', 32.966142, 35.819362, 'שעתיים', 2, 10, 40, true, false, false, true, 'free', 'winter', 2, null)

on conflict (id) do nothing;
