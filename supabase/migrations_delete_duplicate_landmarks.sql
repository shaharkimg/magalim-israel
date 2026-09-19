-- DELETE-ים לביקורת - טרם רצו. כל שורה כאן היא כפילות אמיתית שנמצאה בביקורת השיטתית:
-- אותו מקום פיזי בפועל (קואורדינטות זהות/כמעט-זהות), קיים פעמיים תחת שני id שונים.
-- ה-id שנשמר בכל זוג הוא זה עם התיאור המפורט/עורך יותר (לא תבנית גנרית כמו "נחל /
-- מסלול באזור צפון / גליל תחתון") ו/או עם base_visits גבוה יותר (סימן למקור מבוסס
-- יותר). ה-id שנמחק הוא הכפילות.
--
-- אזהרה: מחיקת landmark מוחקת בשרשור (on delete cascade) כל visit/wishlist שמצביע
-- אליו - מי שכבר "כבש" את ה-id הנמחק יאבד את הכיבוש הזה. מומלץ להריץ קודם שאילתת
-- בדיקה (בהערה למטה) ולוודא שאין visits אמיתיים על ה-id-ים שעומדים להימחק, לפני
-- שמריצים בפועל.
--
-- שלוש השורות האחרונות (xlsx-249/251/258) הן הכפילויות החדשות שנוצרו ע"י התיקון
-- הקודם (migrations_fix_landmark_locations.sql) - מחיקה ישירה כאן עדיפה על התיקון
-- ההוא, כי כבר יש כפילות-אמת נכונה לאותו מקום. אין צורך להריץ את שלוש שורות ה-update
-- המקבילות במיגרציה הקודמת קודם - מחיקה ישירה כאן מספיקה ובטוחה בכל מקרה.

-- לבדיקה לפני מחיקה בפועל - כמה visits/wishlist קיימים על כל id שעומד להימחק:
-- select landmark_id, count(*) from public.visits where landmark_id in (
--   'tiuli-336','ein-gones','tiuli-50','np-tel-dor','tiuli-62','tiuli-145','tiuli-9',
--   'xlsx-011','xlsx-160','xlsx-073','xlsx-249','xlsx-251','xlsx-258'
-- ) group by landmark_id;

delete from public.landmarks where id = 'tiuli-336';   -- נחל רחף - כפילות מדויקת (0 מ') של nahal-rahaf, תיאור-תבנית גנרי
delete from public.landmarks where id = 'ein-gones';   -- עין ג'ונס - כפילות מדויקת (0 מ', אותו שם) של ein-gonen
delete from public.landmarks where id = 'tiuli-50';    -- מצדה - כפילות של masada (מנתוני הליבה המקוריים, base_visits=15420), תיאור-תבנית גנרי
delete from public.landmarks where id = 'np-tel-dor';  -- גן לאומי תל דור - כפילות של tel-dor (תיאור מפורט יותר, base_visits גבוה יותר)
delete from public.landmarks where id = 'tiuli-62';    -- עין מבוע/נחל פרת - כפילות (104 מ') של ein-prat, תיאור-תבנית גנרי
delete from public.landmarks where id = 'tiuli-145';   -- עיר דוד - כפילות של cityofdavid (מנתוני הליבה המקוריים), תיאור-תבנית גנרי
delete from public.landmarks where id = 'tiuli-9';     -- אמות המים לקיסריה - כפילות (56 מ') של mei-kedem-alona; ביטחון בינוני, כי התיאור מרמז על מסלול-אזור רחב יותר ולא רק התכונה הספציפית
delete from public.landmarks where id = 'xlsx-011';    -- גן לאומי צור נתן - כפילות (2 ק"מ) של np-tzur-natan; ביטחון בינוני, המרחק גדול יחסית לשאר
delete from public.landmarks where id = 'xlsx-160';    -- נחל חילזון - כפילות של nahal-hilazon, תיאור-תבנית גנרי
delete from public.landmarks where id = 'xlsx-073';    -- נחל דישון - כפילות של nahal-dishon, תיאור-תבנית גנרי
delete from public.landmarks where id = 'xlsx-249';    -- נחל פרת - אחרי התיקון הקודם זו כפילות מדויקת של ein-prat הקיים
delete from public.landmarks where id = 'xlsx-251';    -- נחל תקוע - אחרי התיקון הקודם זו כפילות מדויקת של nahal-tekoa הקיים
delete from public.landmarks where id = 'xlsx-258';    -- עין דוד - אחרי התיקון הקודם זו כפילות מדויקת של nahaldavid הקיים
