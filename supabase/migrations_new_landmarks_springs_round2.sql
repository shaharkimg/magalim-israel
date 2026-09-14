-- המשך חיפוש מעיינות שלא ברשימה שהמשתמש שלח - מבוסס על מאגר ה-Semantic MediaWiki של
-- inature.info שכבר נשלף בשיחה זו (scratch_inature_clean.txt, 126 ערכים מתויגים "Springs").
-- כל 126 הערכים נבדקו מרחק מול המפה הקיימת (1135 יעדים); 29 המועמדים המרוחקים ביותר
-- (>1 ק"מ מהיעד הקיים הקרוב ביותר) נבדקו אחד-אחד בגוגל מפות. רוב נפסלו (מעט ביקורות,
-- כבר קיימים תחת שם אחר, או שגוגל התאים בטעות מקום לא-קשור לפי דמיון-טקסט).
--
-- 6 יעדים אושרו ונוספו, קואורדינטות מאומתות בנפרד מול גוגל מפות לכל אחד.

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('brechat-tzaanan', 'בריכת צנאן', 'בריכת מים טבעית בשפלת לכיש, יעד פופולרי מאוד לטיולי משפחות.', 'water', 'easy', 'center', 31.6041492, 34.9589786, 'שעה', 1, 10, true, false, false, true, 'free', null, 1, null),
  ('ein-sukot2', 'עין סוכות', 'מעיין גדול ופופולרי במזרח השומרון-בקעת הירדן.', 'water', 'easy', 'center', 32.365, 35.5466667, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('ein-raziel', 'עין רזיאל', 'שמורת טבע ומעיין בשפלת יהודה סמוך לצור הדסה, יעד הליכה פופולרי.', 'water', 'easy', 'center', 31.7775842, 35.0710148, 'שעה', 1, 6, true, false, false, true, 'free', null, 1, null),
  ('nahal-geres', 'נחל גרס', 'נחל זורם בשפלת יהודה סמוך לבית שמש, מסלול הליכה נעים בין כרמים.', 'water', 'medium', 'center', 31.7146356, 35.0718553, 'שעתיים', 2, 2, true, false, false, true, 'free', null, 2, null),
  ('ein-kfira', 'עין כפירה', 'מעיין בהרי ירושלים המערביים, יעד הליכה שקט.', 'water', 'easy', 'jerusalem', 31.8305556, 35.0886111, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('maayan-chavat-yair', 'מעיין חוות יאיר', 'מעיין בצפון השומרון סמוך ליקיר, מותר להכניס כלבים.', 'water', 'easy', 'center', 32.1449915, 35.1096151, 'שעה', 1, 4, true, true, false, true, 'free', null, 1, null)

on conflict (id) do nothing;
