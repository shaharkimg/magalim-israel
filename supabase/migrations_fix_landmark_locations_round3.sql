-- סבב שלישי של תיקוני מיקום/אזור. נמצא כשדפי היעדים הסטטיים (places/, regions/) נפתחו
-- לגוגל וחשפו יעדים שמופיעים תחת אזור לא נכון. איתור: לכל יעד נבדק לאיזה אזור שייכים 10
-- היעדים הקרובים אליו + גבולות קו-רוחב גסים; כל חשוד נבדק ידנית, וקואורדינטות חדשות אומתו
-- מול OpenStreetMap (דרך GovMap MCP) ו/או ויקיפדיה. הוחל ישירות על ה-DB ב-2026-11-13.

-- א. רק ה-region שגוי - הקואורדינטות נכונות
update public.landmarks set region = 'north' where id in (
  'lm-6d7f71f7',          -- עכו העתיקה
  'lm-a0d4ffa4',          -- נמל עכו
  'xlsx-196',             -- חוף הבונים (חוף הכרמל, ליד דור)
  'nahal-daliya-reserve', -- שמורת נחל דליה (רמות מנשה)
  'lm-e3bae8d5');         -- ההר העגול ביער אלונה
update public.landmarks set region = 'eilat' where id in (
  'lm-233d86f7',  -- שמורת טבע חוף האלמוגים
  'lm-2bbdf447',  -- חוף הנסיכה
  'lm-7257ce9f',  -- עין עברונה
  'lm-9bb3daf7'); -- הר נשף
update public.landmarks set region = 'south' where id in ('yaar-lahav', 'xlsx-374');      -- יער להב (צפון הנגב), עין חצבה (ערבה התיכונה)
update public.landmarks set region = 'center' where id in ('holot-nitzanim', 'tiuli-72'); -- כמו שאר יעדי ניצנים
update public.landmarks set region = 'deadsea' where id in ('tiuli-328', 'tiuli-183');    -- נחל חימר, מסלול הפטריה בנאות הכיכר
update public.landmarks set region = 'jerusalem' where id in (
  'lm-4f538368',   -- עין נקופה ויער הסתדרות המורים
  'lm-d89355a3',   -- יער עמינדב
  'lm-1508c76b',   -- נווה אילן הישנה ויער המכללות
  'lm-220d71e0',   -- חורבת חנות
  'nahal-yarmut'); -- נחל ירמות (בית שמש)

-- ב. קואורדינטות שגויות - geocoding שהתאים לפי שם במקום לא נכון
update public.landmarks set lat = 31.4971107, lon = 34.7066969 where id = 'lm-ef8a1c9a'; -- רוחמה הישנה - היה באילת; אתר הראשונים צמוד לקיבוץ רוחמה (OSM)
update public.landmarks set lat = 31.6754074, lon = 34.9965412 where id = 'tiuli-322';   -- טיול 4x4 בעמק האלה - היה בתל אביב; עמק האלה (OSM)
update public.landmarks set lat = 33.0462594, lon = 35.6650491 where id = 'xlsx-053';    -- חורבת דבורה - היה ליד בית שמש; כפר דבורה/דבורה בגולן (OSM), תואם ל"גולן וחרמון" שבמקור. ביטחון בינוני: יש גם חורבת דבורה ליד דבוריה שלמרגלות התבור
update public.landmarks set lat = 31.817, lon = 35.033 where id = 'xlsx-234';            -- פארק רבין (קק"ל) - היה בהרצליה; הפארק בשער הגיא (ויקיפדיה)

-- ג. הקואורדינטות נכונות (OSM מאשר את השם בדיוק בנקודה), ה-region והתיאור שגויים
update public.landmarks set region = 'center', description = 'תצפית / פסגה באזור מרכז / תל אביב והשרון.' where id = 'xlsx-139'; -- מצפור הצוק (תל אביב)
update public.landmarks set region = 'eilat', description = 'מעיין / מקור מים באזור ערבה / הרי אילת.' where id = 'xlsx-302';    -- גב עשרון (חבל אילות)
update public.landmarks set region = 'center', description = replace(description, 'בגוש עציון', 'במערב בנימין, ליד היישוב נריה') where id = 'einot-aner'; -- עיינות ענר

-- ד. נמחקו: לא נמצא מקום אמיתי בשם הזה (חיפוש ברשת + OSM), והנעץ היה התאמת-שם שגויה
-- (כביש 6 / מערת איילון). נבדק לפני המחיקה: 0 שורות בכל הטבלאות התלויות (visits, wishlist,
-- landmark_conquests, landmark_photos, trip_posts, field_reports, place_corrections,
-- group_destination_votes) - כולן on delete cascade, כך שלא נמחק שום דבר מעבר לשתי השורות.
delete from public.landmarks where id in (
  'xlsx-054',  -- חורבת חוצה
  'xlsx-091'); -- מערת אביב
