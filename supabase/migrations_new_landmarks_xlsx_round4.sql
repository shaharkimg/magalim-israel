-- ייבוא מונע-אקסל מתוך "מקומות_עם_קואורדינטות.xlsx" (טבלת MissingPlacesTable, 1186 שורות).
-- הקובץ הכיל כבר גיאוקידינג אוטומטי (OpenStreetMap Nominatim) + דירוג-ודאות/הערת-אזהרה משלו
-- לכל שורה ("שם/מיקום בסיסי ממקור ציבורי - יש לאמת פרטי גישה/בטיחות/סטטוס לפני פרסום").
-- מתוך 666 שורות עם קואורדינטות: 260 סוננו כחופפות (<1.2 ק"מ) ליעד קיים כבר במפה (742 יעדים
-- באותו רגע), ועוד 40 כפילויות-פנימיות (אותו מקום בשם שונה במרחק <150מ, למשל "שמורת נחל שיזף"/
-- "שמורת שיזף" באותה נקודה, או "פארק הולנד באילת" שהתברר כנקודת-נפילה כמעט זהה ל"פארק גולדה")
-- הוסרו. נשארו 386 יעדים חדשים ומקוריים. לפי בקשת המשתמש המפורשת - הוספה ישירה לפי דירוג-הודאות
-- של הקובץ עצמו (בסיס-נתונים=8, בינונית=4), ללא בדיקה פרטנית בגוגל מפות לכל יעד (בניגוד לרוב
-- הסבבים הקודמים בשיחה זו) - קנה-המידה (386 יעדים) והבקשה הישירה הצדיקו יבוא מהיר מבוסס-קובץ.
--
-- מיפוי שדות: region נגזר מעמודת "אזור" בקובץ (טבלת-מיפוי ל-6 האזורים של האפליקציה), category
-- נגזר מעמודת "סוג" (טבלת-מיפוי ל-10 הקטגוריות), has_water נגזר מזיהוי מילות-מפתח (מים/נחל/
-- מעיין/חוף) בעמודות סוג+מאפיינים. difficulty="medium"/duration=שעה/distance_km=1 כברירת-מחדל
-- אחידה (הקובץ לא כלל נתונים אמינים לשדות אלו - רוב השורות "לא נבדק"). official_url מצביע
-- לעמוד-המקור בקובץ (בעיקר kkl.org.il / parks.org.il).
--
-- סבב 4 מתוך 4.

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('xlsx-292', 'נחל רמון', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.6043748, 34.9047516, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-293', 'נחל ניצנה', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.6032575, 34.6940943, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-294', 'נחל אלות', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.5530015, 34.5929431, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-295', 'נחל צניפים', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.0882144, 34.8452571, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-296', 'נחל ציחור', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.2965899, 35.0125704, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-297', 'נחל חיון', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.1736271, 34.9799097, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-298', 'נחל חתירה', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.9253197, 35.0728936, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-299', 'עין עקב עליון', 'מעיין / מקור מים באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.7950916, 34.8123436, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-300', 'עין אורחות', 'מעיין / מקור מים באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.7571297, 35.0078506, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-301', 'גב זרחן', 'מעיין / מקור מים באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.8343105, 34.9585037, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-302', 'גב עשרון', 'מעיין / מקור מים באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 29.9152644, 34.9720278, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-303', 'גב חולית', 'מעיין / מקור מים באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.6339836, 35.0460663, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-304', 'גב צניפים', 'מעיין / מקור מים באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.0724669, 34.8283211, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-305', 'גב עודד', 'מעיין / מקור מים באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.5279403, 34.7225564, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-306', 'גב דרוך', 'מעיין / מקור מים באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.859823, 34.859783, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-307', 'גב ציחור', 'מעיין / מקור מים באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.2270293, 34.8696092, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-308', 'הר מרפק', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 30.5800328, 34.9075152, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-309', 'הר עודד', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 30.51931, 34.7280045, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-310', 'הר לוץ', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 30.4598325, 34.5935039, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-311', 'הר עריף', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 30.4258934, 34.7339737, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-312', 'הר שגיא', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 30.4162191, 34.6989872, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-313', 'הר חריף', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 30.495895, 34.5590811, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-314', 'הר רכב', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 30.8339391, 34.9848783, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-315', 'הר חמרן', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 30.6832856, 34.5613518, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-316', 'הר נפחה', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 30.6961607, 34.7527382, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-317', 'הר משא', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 31.330998, 35.096784, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-318', 'הר בוקר', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 30.8733327, 34.7180594, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-319', 'הר חצרה', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 31.006259, 35.1936393, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-320', 'הר כרבולת', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 30.9057855, 34.979127, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-321', 'הר חתירה', 'תצפית / פסגה באזור נגב / באר שבע והר הנגב.', 'viewpoints', 'medium', 'south', 30.8944677, 34.8993659, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-322', 'בורות רמליה', 'נקודת עניין / טיול באזור נגב / באר שבע והר הנגב.', 'nature', 'medium', 'south', 30.7950747, 34.7556124, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-323', 'בארות עודד', 'באר / בור מים באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.4905183, 34.7273938, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-324', 'באר אשלים', 'באר / בור מים באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.3338986, 34.9552121, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-325', 'באר משאבים', 'באר / בור מים באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 31.0006455, 34.7235564, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-326', 'מצד מחמל', 'אתר מורשת / ארכיאולוגיה באזור נגב / באר שבע והר הנגב.', 'heritage', 'medium', 'south', 30.6885212, 34.9285396, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-327', 'מצד גרפון', 'אתר מורשת / ארכיאולוגיה באזור נגב / באר שבע והר הנגב.', 'heritage', 'medium', 'south', 30.723676, 34.8842472, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-328', 'מצד נקרות', 'אתר מורשת / ארכיאולוגיה באזור נגב / באר שבע והר הנגב.', 'heritage', 'medium', 'south', 30.5752479, 35.0116528, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-329', 'מצד צין', 'אתר מורשת / ארכיאולוגיה באזור נגב / באר שבע והר הנגב.', 'heritage', 'medium', 'south', 30.8539586, 34.8053818, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-330', 'מצד צפיר', 'אתר מורשת / ארכיאולוגיה באזור נגב / באר שבע והר הנגב.', 'heritage', 'medium', 'south', 30.9221687, 35.1089172, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-331', 'חורבת ממשית', 'אתר מורשת / ארכיאולוגיה באזור נגב / באר שבע והר הנגב.', 'heritage', 'medium', 'south', 31.0499992, 35.0333328, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-332', 'חורבת סעדון', 'אתר מורשת / ארכיאולוגיה באזור נגב / באר שבע והר הנגב.', 'heritage', 'medium', 'south', 31.0292268, 34.6083255, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-333', 'פארק נחל באר שבע', 'פארק / שמורה / יער באזור נגב / באר שבע והר הנגב.', 'parks', 'medium', 'south', 31.2373133, 34.8210353, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-334', 'יער דבירה', 'פארק / שמורה / יער באזור נגב / באר שבע והר הנגב.', 'parks', 'medium', 'south', 31.4105128, 34.8813101, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-335', 'יער בארי', 'פארק / שמורה / יער באזור נגב / באר שבע והר הנגב.', 'parks', 'medium', 'south', 31.4042636, 34.4702733, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-336', 'יער שוקדה', 'פארק / שמורה / יער באזור נגב / באר שבע והר הנגב.', 'parks', 'medium', 'south', 31.4262613, 34.5124323, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-337', 'יער רוחמה', 'פארק / שמורה / יער באזור נגב / באר שבע והר הנגב.', 'parks', 'medium', 'south', 31.4890033, 34.6895269, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-338', 'יער דורות', 'פארק / שמורה / יער באזור נגב / באר שבע והר הנגב.', 'parks', 'medium', 'south', 31.5231728, 34.688514, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-339', 'שמורת הר הנגב', 'פארק / שמורה / יער באזור נגב / באר שבע והר הנגב.', 'parks', 'medium', 'south', 30.4550487, 34.6950642, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-340', 'שמורת חולות עגור', 'פארק / שמורה / יער באזור נגב / באר שבע והר הנגב.', 'parks', 'medium', 'south', 31.0032154, 34.440481, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-341', 'נחל שלמה', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.5406929, 34.9033947, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-342', 'נחל נטפים', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.5973255, 34.89177, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-343', 'נחל רחם', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.7032036, 34.9567278, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-344', 'נחל עתק', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.7222064, 34.9113556, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-345', 'נחל רודד', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.5855543, 34.960654, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-346', 'נחל יעל', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.5850512, 34.9409578, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-347', 'נחל שחמון', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.5590546, 34.9264839, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-348', 'נחל רחבעם', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.5388086, 34.8952391, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-349', 'נחל יהושפט', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.5522326, 34.8890208, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-350', 'נחל תמנע', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 31.7137989, 34.9987415, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-351', 'נחל צופר', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 30.4815728, 35.1269834, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-352', 'נחל עשוש', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 30.4862549, 35.0974563, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-353', 'נחל ורדית', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 30.3521359, 35.0151065, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-354', 'נחל קטורה', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.9941308, 35.0869311, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-355', 'נחל שחרות', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.9365034, 34.9809188, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-356', 'נחל גרופית', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 30.0063852, 35.0567513, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-357', 'נחל יטבתה', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.8766467, 35.0238686, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-358', 'נחל כסוי', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.9864895, 34.9751113, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-359', 'נחל שיזף', 'נחל / מסלול באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 30.6890775, 35.2419645, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-360', 'הר שחורת', 'תצפית / פסגה באזור ערבה / הרי אילת.', 'viewpoints', 'medium', 'eilat', 29.6192296, 34.9129139, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-361', 'הר אמיר', 'תצפית / פסגה באזור ערבה / הרי אילת.', 'viewpoints', 'medium', 'eilat', 29.6408237, 34.9401287, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-362', 'הר שחמון', 'תצפית / פסגה באזור ערבה / הרי אילת.', 'viewpoints', 'medium', 'eilat', 29.5789441, 34.9328537, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-363', 'הר חזקיהו', 'תצפית / פסגה באזור ערבה / הרי אילת.', 'viewpoints', 'medium', 'eilat', 29.6435818, 34.8787587, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-364', 'הר רחבעם', 'תצפית / פסגה באזור ערבה / הרי אילת.', 'viewpoints', 'medium', 'eilat', 29.5456139, 34.8961548, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-365', 'הר מכרות', 'תצפית / פסגה באזור ערבה / הרי אילת.', 'viewpoints', 'medium', 'eilat', 29.8041935, 34.9794821, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-366', 'הר ארגמן', 'תצפית / פסגה באזור ערבה / הרי אילת.', 'viewpoints', 'medium', 'eilat', 29.8483958, 34.995525, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-367', 'הר שחרות', 'תצפית / פסגה באזור ערבה / הרי אילת.', 'viewpoints', 'medium', 'eilat', 29.9343497, 35.0122805, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-368', 'הר גרופית', 'תצפית / פסגה באזור ערבה / הרי אילת.', 'viewpoints', 'medium', 'eilat', 29.9833271, 35.0333326, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-369', 'הר איה', 'תצפית / פסגה באזור ערבה / הרי אילת.', 'viewpoints', 'medium', 'eilat', 29.9979677, 35.0448498, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-370', 'הר קטורה', 'תצפית / פסגה באזור ערבה / הרי אילת.', 'viewpoints', 'medium', 'eilat', 30.035526, 35.0724997, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-371', 'הר מנוחה', 'תצפית / פסגה באזור ערבה / הרי אילת.', 'viewpoints', 'medium', 'eilat', 30.2898111, 35.0555262, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-372', 'עין יטבתה', 'מעיין / מקור מים באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.8818363, 35.051819, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-373', 'עין קטורה', 'מעיין / מקור מים באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 30.034975, 35.065398, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-374', 'עין חצבה', 'מעיין / מקור מים באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 30.7982828, 35.2463979, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-375', 'גבי רחם', 'מעיין / מקור מים באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.6631576, 34.9217273, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-376', 'גבי עתק', 'מעיין / מקור מים באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.72878, 34.92017, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-377', 'גבי ברק', 'מעיין / מקור מים באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 30.3797243, 35.0577377, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-378', 'קניון עדה', 'נקודת עניין / טיול באזור ערבה / הרי אילת.', 'nature', 'medium', 'eilat', 30.3306921, 34.9137641, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-379', 'עמודי שלמה', 'נקודת עניין / טיול באזור ערבה / הרי אילת.', 'nature', 'medium', 'eilat', 29.7690338, 34.9552674, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-380', 'אגם תמנע', 'מעיין / מקור מים באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.7595589, 34.9703906, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-381', 'חוף קצא"א', 'חוף / טיילת באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.5244953, 34.9338307, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-382', 'חוף הדקל', 'חוף / טיילת באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 29.5405405, 34.9472854, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-383', 'חוף חנניה', 'חוף / טיילת באזור ערבה / הרי אילת.', 'water', 'medium', 'eilat', 32.5282617, 34.92503, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-384', 'שמורת מסיב אילת', 'פארק / שמורה / יער באזור ערבה / הרי אילת.', 'parks', 'medium', 'eilat', 29.7127883, 34.8815515, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-385', 'שמורת נחלים גדולים', 'פארק / שמורה / יער באזור ערבה / הרי אילת.', 'parks', 'medium', 'eilat', 30.138414, 34.8961339, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-386', 'פארק ספיר', 'פארק / שמורה / יער באזור ערבה / הרי אילת.', 'parks', 'medium', 'eilat', 30.6164706, 35.1913355, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/')

on conflict (id) do nothing;
