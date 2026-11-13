-- סבב רביעי: ממצאי scripts/audit_locations.js (השוואת כל יעד למקום באותו שם ב-OpenStreetMap,
-- הדוח ב-data/audit). כל חשוד נבדק ידנית ואושר ע"י הבעלים. הוחל ישירות על ה-DB ב-2026-11-13.
-- כל עדכון נעץ חל רק אם הנעץ עדיין במקום שהבדיקה ראתה.

-- א. 16 נעצים הועברו למקום באותו שם ב-OSM
update public.landmarks set lat = 30.800886, lon = 34.850875 where id = 'lm-2fe74540' and round(lat::numeric,4) = 30.95; -- עין זיק: 16841 מ' מ"עין זיק" ב-OSM
update public.landmarks set lat = 32.073058, lon = 34.773100 where id = 'xlsx-244' and round(lat::numeric,4) = 31.97; -- גן מאיר: 12034 מ' מ"גן מאיר" ב-OSM
update public.landmarks set lat = 31.839838, lon = 35.349174 where id = 'lm-27f5aa26' and round(lat::numeric,4) = 31.76; -- עין מבוע: 9296 מ' מ"עין מבוע" ב-OSM
update public.landmarks set lat = 30.361260, lon = 34.639107 where id = 'xlsx-312' and round(lat::numeric,4) = 30.4162; -- הר שגיא: 8387 מ' מ"הר שגיא" ב-OSM
update public.landmarks set lat = 29.596857, lon = 34.881180 where id = 'lm-2a36ce66' and round(lat::numeric,4) = 29.634; -- עין נטפים: 8078 מ' מ"עין נטפים" ב-OSM
update public.landmarks set lat = 32.673349, lon = 35.088004 where id = 'muhraka' and round(lat::numeric,4) = 32.7325; -- מוחרקה: 7691 מ' מ"קרן הכרמל" ב-OSM
update public.landmarks set lat = 31.725711, lon = 35.117560 where id = 'lm-6738dddc' and round(lat::numeric,4) = 31.762; -- עין קובי: 6248 מ' מ"עין קובי" ב-OSM
update public.landmarks set lat = 30.791563, lon = 34.851021 where id = 'lm-fbd26c91' and round(lat::numeric,4) = 30.8; -- עין שביב: 4963 מ' מ"עין שביב" ב-OSM
update public.landmarks set lat = 29.512625, lon = 34.910339 where id = 'tzefahot' and round(lat::numeric,4) = 29.547; -- הר צפחות: 4406 מ' מ"הר צפחות" ב-OSM
update public.landmarks set lat = 30.617641, lon = 35.190703 where id = 'lm-b1cb50a6' and round(lat::numeric,4) = 30.65; -- עין יהב: 4044 מ' מ"עין יהב" ב-OSM
update public.landmarks set lat = 31.836143, lon = 35.374668 where id = 'lm-41b4ec78' and round(lat::numeric,4) = 31.84; -- עין קלט: 3365 מ' מ"עין קלט" ב-OSM
update public.landmarks set lat = 32.549590, lon = 35.355896 where id = 'lm-0a5fcb1b' and round(lat::numeric,4) = 32.5553; -- עין חרוד: 3231 מ' מ"עין חרוד" ב-OSM
update public.landmarks set lat = 30.833028, lon = 34.770573 where id = 'lm-02130bcf' and round(lat::numeric,4) = 30.81; -- עין מור: 2908 מ' מ"עין מור" ב-OSM
update public.landmarks set lat = 32.979738, lon = 35.492435 where id = 'lm-ba09b36b' and round(lat::numeric,4) = 32.965; -- עין זיתים: 1780 מ' מ"עין זיתים" ב-OSM
update public.landmarks set lat = 32.686659, lon = 35.389520 where id = 'tiuli-161' and round(lat::numeric,4) = 32.6824; -- הר תבור: 1689 מ' מ"הר תבור" ב-OSM
update public.landmarks set lat = 29.672913, lon = 35.013917 where id = 'lm-7257ce9f' and round(lat::numeric,4) = 29.66; -- עין עברונה: 1551 מ' מ"עין עברונה" ב-OSM

-- ב. 7 כפילויות אוחדו (merge_landmarks מעביר את כל נתוני המשתמשים; לא היו כאלה)
update public.landmarks set lat = 31.9261198, lon = 34.6969544 where id = 'np-yam-palmachim';
update public.landmarks set lat = 32.7038969, lon = 35.2141406 where id = 'np-shimron';
update public.landmarks set lat = 31.771002, lon = 35.127387 where id = 'lm-644c897d';
select public.merge_landmarks('lm-b826e98c', 'ein-tina-golan'); -- עין תינה - עותק שהנעץ שלו ליד תל דן, 17 ק"מ מהמעיין
select public.merge_landmarks('lm-815c21f4', 'tiuli-85'); -- נחל יהודיה - עותק 9.6 ק"מ מהמפל
select public.merge_landmarks('xlsx-275', 'xlsx-333'); -- נחל באר שבע - הנעץ היה ליד שדה בוקר, 59 ק"מ; הנחל הוא הפארק בבאר שבע
select public.merge_landmarks('lm-9d7f48cf', 'lm-644c897d'); -- עין אל בלד - השם המקורי של עין סטף (alt_name ב-OSM)
select public.merge_landmarks('xlsx-200', 'np-yam-palmachim'); -- חוף פלמחים - הגן הלאומי הוא החוף; הגן קיבל את הנעץ של החוף (OSM)
select public.merge_landmarks('xlsx-167', 'np-shimron'); -- תל שימרון - הגן הלאומי הוא התל; הגן קיבל את הנעץ של התל (OSM)
select public.merge_landmarks('xlsx-212', 'ashkelon-national-park'); -- תל אשקלון - בתוך הגן הלאומי
