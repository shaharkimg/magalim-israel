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
-- סבב 2 מתוך 4.

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('xlsx-098', 'שמורת נחל כזיב', 'פארק / שמורה / יער באזור צפון / גליל עליון ואצבע הגליל.', 'parks', 'medium', 'north', 33.0434389, 35.2006115, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-099', 'שמורת אירוס הדור', 'פארק / שמורה / יער באזור צפון / גליל עליון ואצבע הגליל.', 'parks', 'medium', 'north', 33.1787906, 35.5411131, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-100', 'נחל בצת', 'נחל / מסלול באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 33.0656298, 35.1297259, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-101', 'נחל נמר', 'נחל / מסלול באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 30.675819, 35.0491294, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-102', 'נחל געתון', 'נחל / מסלול באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 33.0202339, 35.2479222, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-103', 'נחל בית העמק', 'נחל / מסלול באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 32.9862976, 35.1446399, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-104', 'נחל יסף', 'נחל / מסלול באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 32.9576566, 35.084206, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-105', 'נחל שעל', 'נחל / מסלול באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 33.0308313, 35.1196641, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-106', 'נחל אכזיב', 'נחל / מסלול באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 33.0479047, 35.1248212, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-107', 'נחל אשחר', 'נחל / מסלול באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 31.0467644, 34.8093307, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-108', 'נחל אשרת', 'נחל / מסלול באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 33.0002702, 35.1993545, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-109', 'עין חוסן', 'מעיין / מקור מים באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 32.998611, 35.306944, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-110', 'חורבת מנות', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל מערבי.', 'heritage', 'medium', 'north', 33.0399951, 35.1493098, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-111', 'יער אחיהוד', 'פארק / שמורה / יער באזור צפון / גליל מערבי.', 'parks', 'medium', 'north', 32.9217758, 35.1693913, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-112', 'יער כברי', 'פארק / שמורה / יער באזור צפון / גליל מערבי.', 'parks', 'medium', 'north', 33.0210047, 35.1645135, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-113', 'יער יחיעם', 'פארק / שמורה / יער באזור צפון / גליל מערבי.', 'parks', 'medium', 'north', 32.9877621, 35.1642833, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-114', 'יער גורן', 'פארק / שמורה / יער באזור צפון / גליל מערבי.', 'parks', 'medium', 'north', 33.0605845, 35.2130609, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-115', 'יער שומרה', 'פארק / שמורה / יער באזור צפון / גליל מערבי.', 'parks', 'medium', 'north', 33.0754042, 35.3060498, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-116', 'חוף בצת', 'חוף / טיילת באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 33.0808643, 35.1062001, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-117', 'חוף ראש הנקרה', 'חוף / טיילת באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 33.0731521, 35.0953223, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-118', 'הר שוקף', 'תצפית / פסגה באזור צפון / כרמל ורמות מנשה.', 'viewpoints', 'medium', 'north', 32.7082744, 35.0261585, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-119', 'הר אלון', 'תצפית / פסגה באזור צפון / כרמל ורמות מנשה.', 'viewpoints', 'medium', 'north', 33.270513, 35.7414695, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-120', 'הר סומק', 'תצפית / פסגה באזור צפון / כרמל ורמות מנשה.', 'viewpoints', 'medium', 'north', 32.6605, 35.0328698, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-121', 'הר מהלל', 'תצפית / פסגה באזור צפון / כרמל ורמות מנשה.', 'viewpoints', 'medium', 'north', 32.6812357, 35.0310721, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-122', 'הר גחר', 'תצפית / פסגה באזור צפון / כרמל ורמות מנשה.', 'viewpoints', 'medium', 'north', 32.6248321, 35.1159993, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-123', 'נחל גלים', 'נחל / מסלול באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.7566427, 34.957306, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-124', 'נחל עובדיה', 'נחל / מסלול באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.7691318, 34.9840096, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-125', 'נחל אחוזה', 'נחל / מסלול באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.7805043, 34.9753367, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-126', 'נחל עמירם', 'נחל / מסלול באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.7760023, 34.9752419, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-127', 'נחל בוסתן', 'נחל / מסלול באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.6968412, 35.029956, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-128', 'נחל חיק', 'נחל / מסלול באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.7215416, 35.0433798, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-129', 'נחל גחר', 'נחל / מסלול באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.5975287, 35.1100634, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-130', 'נחל קיני', 'נחל / מסלול באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.5737636, 35.1816919, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-131', 'נחל דליה', 'נחל / מסלול באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.5860329, 35.03542, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-132', 'נחל תות', 'נחל / מסלול באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.6283342, 35.0663019, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-133', 'נחל מנשה', 'נחל / מסלול באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.4472489, 35.020599, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-134', 'נחל יקנעם', 'נחל / מסלול באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.6670938, 35.1086609, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-135', 'עין אחוזה', 'מעיין / מקור מים באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.7822344, 34.982016, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-136', 'עין סעדיה', 'מעיין / מקור מים באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.7898565, 35.027409, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-137', 'עין מנשה', 'מעיין / מקור מים באזור צפון / כרמל ורמות מנשה.', 'water', 'medium', 'north', 32.4629224, 35.0073711, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-138', 'מערת ישח', 'מערה / אתר טבע באזור צפון / כרמל ורמות מנשה.', 'nature', 'medium', 'north', 32.7185656, 35.0020134, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-139', 'מצפור הצוק', 'תצפית / פסגה באזור צפון / כרמל ורמות מנשה.', 'viewpoints', 'medium', 'north', 32.1307584, 34.787004, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-140', 'חורבת כרך', 'אתר מורשת / ארכיאולוגיה באזור צפון / כרמל ורמות מנשה.', 'heritage', 'medium', 'north', 32.677312, 35.0714278, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-141', 'יער קריית אתא', 'פארק / שמורה / יער באזור צפון / כרמל ורמות מנשה.', 'parks', 'medium', 'north', 32.7632323, 35.2134329, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-142', 'יער אליקים', 'פארק / שמורה / יער באזור צפון / כרמל ורמות מנשה.', 'parks', 'medium', 'north', 32.6550567, 35.109646, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-143', 'יער מנשה', 'פארק / שמורה / יער באזור צפון / כרמל ורמות מנשה.', 'parks', 'medium', 'north', 32.5254634, 35.1214923, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-144', 'פארק הכרמל', 'פארק / שמורה / יער באזור צפון / כרמל ורמות מנשה.', 'parks', 'medium', 'north', 32.687962, 35.040394, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-145', 'הר דבורה', 'תצפית / פסגה באזור צפון / גליל תחתון עמקים וגלבוע.', 'viewpoints', 'medium', 'north', 32.7013681, 35.3509546, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-146', 'הר כסולות', 'תצפית / פסגה באזור צפון / גליל תחתון עמקים וגלבוע.', 'viewpoints', 'medium', 'north', 32.6956101, 35.3340549, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-147', 'הר עצמון', 'תצפית / פסגה באזור צפון / גליל תחתון עמקים וגלבוע.', 'viewpoints', 'medium', 'north', 32.8237648, 35.2668953, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-148', 'הר חזון', 'תצפית / פסגה באזור צפון / גליל תחתון עמקים וגלבוע.', 'viewpoints', 'medium', 'north', 32.900005, 35.4027817, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-149', 'הר שאול', 'תצפית / פסגה באזור צפון / גליל תחתון עמקים וגלבוע.', 'viewpoints', 'medium', 'north', 32.535533, 35.3754365, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-150', 'גבעת קומי', 'נקודת עניין / טיול באזור צפון / גליל תחתון עמקים וגלבוע.', 'nature', 'medium', 'north', 32.5652664, 35.394678, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-151', 'נחל ארבל', 'נחל / מסלול באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.826591, 35.4604236, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-152', 'נחל עמוד תחתון', 'נחל / מסלול באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.91242, 35.4853753, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-153', 'נחל יפתחאל', 'נחל / מסלול באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.7700382, 35.2422776, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-154', 'נחל חרוד', 'נחל / מסלול באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.5376748, 35.4137649, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-155', 'נחל יששכר', 'נחל / מסלול באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.5651691, 35.4940953, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-156', 'נחל בזק', 'נחל / מסלול באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.398219, 35.5390848, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-157', 'נחל חגל', 'נחל / מסלול באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.6364338, 35.5436951, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-158', 'נחל שגור', 'נחל / מסלול באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.9243333, 35.2889233, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-159', 'נחל כמון', 'נחל / מסלול באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.8935872, 35.355654, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-160', 'נחל חילזון', 'נחל / מסלול באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.8944096, 35.231533, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-161', 'עין חדה', 'מעיין / מקור מים באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.6827742, 35.4894049, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-162', 'עין רכש', 'מעיין / מקור מים באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.6582494, 35.4728054, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-163', 'מאגר כפר ברוך', 'מעיין / מקור מים באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.6386466, 35.206371, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-164', 'מאגר אשכול', 'מעיין / מקור מים באזור צפון / גליל תחתון עמקים וגלבוע.', 'water', 'medium', 'north', 32.7741394, 35.251371, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-165', 'תל קשיש', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל תחתון עמקים וגלבוע.', 'heritage', 'medium', 'north', 32.6851803, 35.1096171, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-166', 'תל יקנעם', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל תחתון עמקים וגלבוע.', 'heritage', 'medium', 'north', 32.6645774, 35.1089162, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-167', 'תל שימרון', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל תחתון עמקים וגלבוע.', 'heritage', 'medium', 'north', 32.7038969, 35.2141406, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-168', 'תל רכש', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל תחתון עמקים וגלבוע.', 'heritage', 'medium', 'north', 32.6533096, 35.4661417, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-169', 'תל תאומים', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל תחתון עמקים וגלבוע.', 'heritage', 'medium', 'north', 32.4424193, 35.4964482, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-170', 'תל כיסון', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל תחתון עמקים וגלבוע.', 'heritage', 'medium', 'north', 32.8730545, 35.1505547, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-171', 'תל קשיון', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל תחתון עמקים וגלבוע.', 'heritage', 'medium', 'north', 32.661506, 35.3935477, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-172', 'חורבת ארבל', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל תחתון עמקים וגלבוע.', 'heritage', 'medium', 'north', 32.8315694, 35.4247784, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-173', 'חורבת ורדים', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל תחתון עמקים וגלבוע.', 'heritage', 'medium', 'north', 33, 35.233333, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-174', 'יער בלפור', 'פארק / שמורה / יער באזור צפון / גליל תחתון עמקים וגלבוע.', 'parks', 'medium', 'north', 32.6702369, 35.2609419, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-175', 'יער מסד', 'פארק / שמורה / יער באזור צפון / גליל תחתון עמקים וגלבוע.', 'parks', 'medium', 'north', 32.8410157, 35.4259489, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-176', 'יער מנחמיה', 'פארק / שמורה / יער באזור צפון / גליל תחתון עמקים וגלבוע.', 'parks', 'medium', 'north', 32.6726982, 35.537838, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-177', 'יער יבנאל', 'פארק / שמורה / יער באזור צפון / גליל תחתון עמקים וגלבוע.', 'parks', 'medium', 'north', 32.7154677, 35.5355109, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-178', 'שמורת נחל תבור', 'פארק / שמורה / יער באזור צפון / גליל תחתון עמקים וגלבוע.', 'parks', 'medium', 'north', 32.6177889, 35.4932081, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-179', 'שמורת נחל יששכר', 'פארק / שמורה / יער באזור צפון / גליל תחתון עמקים וגלבוע.', 'parks', 'medium', 'north', 32.5652803, 35.4999543, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-180', 'שמורת אלוני אבא', 'פארק / שמורה / יער באזור צפון / גליל תחתון עמקים וגלבוע.', 'parks', 'medium', 'north', 32.7397924, 35.1684106, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-181', 'נחל פולג', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.2184054, 34.8796746, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-182', 'נחל חדרה', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.3964298, 34.8808429, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-183', 'נחל עדה', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 31.8063855, 34.7845665, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-184', 'נחל חביבה', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.376727, 35.0381249, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-185', 'נחל אביחיל', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.3528187, 34.8858478, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-186', 'נחל אודים', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.2631661, 34.8541424, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-187', 'נחל רשפון', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.2165746, 34.8411405, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-188', 'נחל גלילות', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.1543535, 34.8310926, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-189', 'נחל הירקון', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 31.897784, 35.0190545, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-190', 'נחל רבה', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.1012356, 34.9661117, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-191', 'נחל שילה', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.241917, 34.9974359, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-192', 'נחל לכיש', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 31.6245914, 34.7578679, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-193', 'נחל גמליאל', 'נחל / מסלול באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 31.871825, 34.7635882, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-194', 'בריכת החורף חולון', 'מעיין / מקור מים באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.0331817, 34.7709428, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null)

on conflict (id) do nothing;
