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

-- ה. תיאורים שציינו את האזור הישן אחרי התיקון בסעיף א' (למשל עכו "באזור מרכז / גוש דן")
update public.landmarks set description = replace(description, 'באזור מרכז / גוש דן ואתרים עירוניים', 'באזור צפון / עכו והגליל המערבי') where id in ('lm-6d7f71f7','lm-a0d4ffa4');
update public.landmarks set description = replace(description, 'באזור מרכז / ירושלים והשפלה', 'באזור צפון / רמות מנשה') where id = 'lm-e3bae8d5';
update public.landmarks set description = replace(description, 'באזור מרכז / ירושלים והשפלה', 'באזור ירושלים / הרי ירושלים והשפלה') where id in ('lm-1508c76b','lm-220d71e0','lm-4f538368','lm-d89355a3');
update public.landmarks set description = replace(description, 'באזור מרכז / השרון ומישור החוף.', 'באזור צפון / חוף הכרמל.') where id = 'xlsx-196';
update public.landmarks set description = replace(description, 'בנגב ובדרום הארץ', 'במישור החוף הדרומי, בין אשדוד לניצנים') where id = 'tiuli-72';
update public.landmarks set description = replace(description, 'בנגב ובדרום הארץ', 'בדרום ים המלח') where id in ('tiuli-183','tiuli-328');
update public.landmarks set description = replace(description, 'באזור ערבה / הרי אילת.', 'באזור הערבה התיכונה.') where id = 'xlsx-374';

-- ו. איחוד 39 כפילויות (37 יעדים). לפני כל איחוד היעד הנשאר קיבל תמונה/קישור ספציפי שחסרו לו מהכפילות;
-- merge_landmarks מעביר ביקורים, כיבושים, מועדפים, תמונות, דיווחים, הצבעות ופוסטי שותפים. נבדק: אין כמעט נתוני
-- משתמשים על הכפילויות (ביקור אחד וכיבוש אחד בחרמון, שני מועדפים - כולם על היעדים הנשארים). הדפים הישנים
-- מופנים ב-301 ב-vercel.json. הפונקציה עצמה עודכנה ב-migrations_hardening_1_rpcs.sql להעביר גם trip_posts.
do $$ declare m record; begin for m in select * from (values
  ('lm-8b5d0efb','np-tel-lachish'),
  ('lm-3a7ce26d','np-tel-tzafit'),
  ('tiuli-44','caesarea'),
  ('lm-e88746aa','caesarea'),
  ('lm-a3ccf81b','tiuli-199'),
  ('lm-3dc71019','castel'),
  ('lm-44764f86','ein-hemed'),
  ('lm-42f2837e','yarkon-park'),
  ('lm-ed257803','ein-hovila'),
  ('xlsx-179','xlsx-155'),
  ('lm-4e14954d','deadsea'),
  ('lm-52bdd58b','np-keren-naftali'),
  ('lm-63110dc3','yaar-lahav'),
  ('lm-3428dfe4','begin-park-jerusalem'),
  ('lm-1cd785a2','tel-dan-reserve'),
  ('lm-a2e04bd9','nahaldavid'),
  ('lm-7ad52c0b','tiuli-33'),
  ('lm-656daa51','meron'),
  ('tiuli-42','hermon'),
  ('lm-bb71fecd','beit-guvrin'),
  ('lm-8c1d54fe','beit-guvrin'),
  ('lm-bbd1565f','givat-hamore'),
  ('lm-24bd0863','ein-prat'),
  ('lm-6d7f71f7','akko'),
  ('xlsx-013','maayan-aniam'),
  ('lm-28dc24a0','ein-hanya'),
  ('lm-adaf56f5','agmon-hula'),
  ('xlsx-196','habonim-beach-reserve'),
  ('lm-0eb53a4d','ben-shemen-forest'),
  ('lm-79f6bcc4','einavdat'),
  ('lm-f5e97416','gan-hashlosha'),
  ('xlsx-217','holot-nitzanim'),
  ('lm-d79f078a','ein-auja'),
  ('lm-97d80ac5','ein-sappir'),
  ('lm-04e75e13','ein-moda'),
  ('lm-9edf9f8b','ein-nun'),
  ('lm-3cd54d49','ein-shokek'),
  ('lm-597e7572','ein-yorkeam'),
  ('lm-dbf2d321','ein-akev')
) v(f, t) loop
  update public.landmarks k set
    stock_photo_url = coalesce(k.stock_photo_url, d.stock_photo_url),
    stock_photo_credit = case when k.stock_photo_url is null then d.stock_photo_credit else k.stock_photo_credit end,
    official_url = coalesce(k.official_url, case when d.official_url ~ '^https://www\.(kkl\.org\.il/travel/?|tiuli\.com/points-of-interest/?)$' then null else d.official_url end)
  from public.landmarks d where k.id = m.t and d.id = m.f;
  perform public.merge_landmarks(m.f, m.t);
end loop; end $$;

-- ז. 79 קישורי "אתר רשמי" שהובילו לאותו חיפוש ריק ב-GeoNames
update public.landmarks set official_url = null where official_url = 'https://www.geonames.org/advanced-search.html?country=IL&q=Israeli';
