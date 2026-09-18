-- מתקן 8 יעדים עם מיקום שגוי, שנמצאו בביקורת שיטתית: פרסנו את כל landmarks מקבצי
-- ה-migrations (945 שורות), הצלבנו כל שם ששומר בתוכו שם יישוב מוכר מול המרחק בפועל,
-- ובדקנו region מול bounding box גס לכל אזור. אומת מחדש כל אחד מהשמונה דרך TomTom
-- Maps MCP (geocode/reverse-geocode/fuzzy-search/area-search) - חיבור אמיתי לשירות
-- מיפוי, לא ניחוש.
--
-- 6 מתוכם (כולם ב-migrations_new_landmarks_xlsx_round3.sql, קבוצת ה"deadsea" באצווה
-- אחת) קיבלו בטעות קואורדינטות של רחוב/עיר לא-קשור במקום המיקום האמיתי במדבר יהודה -
-- כל שורה זזה 50-90 ק"מ. שלוש מהן כבר קיימות נכון תחת landmark אחר באותו מאגר בדיוק
-- (ein-prat, nahal-tekoa, nahaldavid) - מקור-אמת פנימי, לא רק חיצוני. שתיים אומתו
-- ישירות מול TomTom כ-POI בשם הזהה (נבי מוסא, מנזר סנט ג'ורג'). האחת שנותרה (נחל
-- קדרון) הוצבה בנקודה המייצגת של מנזר מר-סבא, שנמצא בתוך ערוץ נחל קדרון עצמו (TomTom
-- מצא רק את הכביש המוביל אליו כ-POI, לא את המנזר עצמו - קרוב יותר לוודאות בינונית-
-- גבוהה מאשר גבוהה כמו שאר החמישה).
--
-- 2 נוספים (נחל אילנות, עין מרים) - הקואורדינטות שלהם נכונות, אבל ה-region שגוי
-- (jerusalem במקום center/north בהתאמה). אומת ב-reverse-geocode: שניהם חוזרים
-- ממש lo תחת "ירושלים" בשום הגדרה.

update public.landmarks set lat = 31.8314794, lon = 35.3069669 where id = 'xlsx-249'; -- נחל פרת - היה בפתח תקווה/רמלה, האמיתי ליד עין פרת הקיים
update public.landmarks set lat = 31.7047, lon = 35.3541 where id = 'xlsx-250'; -- נחל קדרון - היה ליד פתח תקווה, האמיתי באזור מנזר מר סבא
update public.landmarks set lat = 31.624114, lon = 35.269887 where id = 'xlsx-251'; -- נחל תקוע - היה ליד פתח תקווה, האמיתי ליד נחל-תקוע הקיים
update public.landmarks set lat = 31.463, lon = 35.385 where id = 'xlsx-258'; -- עין דוד - היה ברחובות, האמיתי בעין גדי (ליד נחל דוד הקיים)
update public.landmarks set lat = 31.786558, lon = 35.431776 where id = 'xlsx-272'; -- נבי מוסא - היה באשדוד, האמיתי ליד יריחו
update public.landmarks set lat = 31.844076, lon = 35.411778 where id = 'xlsx-273'; -- מנזר סנט ג'ורג' - היה ברמלה, האמיתי בוואדי קלט

update public.landmarks set region = 'center' where id = 'xlsx-221'; -- נחל אילנות - הקואורדינטות נכונות (אזור השרון), ה-region היה שגוי
update public.landmarks set region = 'north' where id = 'xlsx-226'; -- עין מרים - הקואורדינטות נכונות (רמת הגולן), ה-region היה שגוי
