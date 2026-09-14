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
-- סבב 3 מתוך 4.

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('xlsx-195', 'חוף ג''סר א-זרקא', 'חוף / טיילת באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.5344636, 34.9017118, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-196', 'חוף הבונים', 'חוף / טיילת באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.6551676, 34.927514, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-197', 'חוף הצוק', 'חוף / טיילת באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.1401452, 34.7897687, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-198', 'חוף תל ברוך', 'חוף / טיילת באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.1220227, 34.7828372, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-199', 'חוף ראשון לציון', 'חוף / טיילת באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 32.0013703, 34.7327201, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-200', 'חוף פלמחים', 'חוף / טיילת באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 31.9261198, 34.6969544, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-201', 'חוף ניצנים', 'חוף / טיילת באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 31.7447654, 34.5998361, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-202', 'חוף לידו אשדוד', 'חוף / טיילת באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 31.8080192, 34.6365789, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-203', 'חוף מי עמי', 'חוף / טיילת באזור מרכז / השרון ומישור החוף.', 'water', 'medium', 'center', 31.8122044, 34.6383752, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-204', 'מצפור געש', 'תצפית / פסגה באזור מרכז / השרון ומישור החוף.', 'viewpoints', 'medium', 'center', 30.663844, 34.873564, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-205', 'תל יצחק', 'אתר מורשת / ארכיאולוגיה באזור מרכז / השרון ומישור החוף.', 'heritage', 'medium', 'center', 32.2560031, 34.8693388, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-206', 'תל חפר', 'אתר מורשת / ארכיאולוגיה באזור מרכז / השרון ומישור החוף.', 'heritage', 'medium', 'center', 32.372325, 34.9076711, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-207', 'תל מבורך', 'אתר מורשת / ארכיאולוגיה באזור מרכז / השרון ומישור החוף.', 'heritage', 'medium', 'center', 32.5335249, 34.9272521, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-208', 'תל זרור', 'אתר מורשת / ארכיאולוגיה באזור מרכז / השרון ומישור החוף.', 'heritage', 'medium', 'center', 32.4291206, 34.9725616, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-209', 'תל אשור', 'אתר מורשת / ארכיאולוגיה באזור מרכז / השרון ומישור החוף.', 'heritage', 'medium', 'center', 32.3039276, 34.9251482, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-210', 'תל יבנה', 'אתר מורשת / ארכיאולוגיה באזור מרכז / השרון ומישור החוף.', 'heritage', 'medium', 'center', 31.9196636, 34.7433949, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-211', 'תל מור', 'אתר מורשת / ארכיאולוגיה באזור מרכז / השרון ומישור החוף.', 'heritage', 'medium', 'center', 31.8230232, 34.6563986, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-212', 'תל אשקלון', 'אתר מורשת / ארכיאולוגיה באזור מרכז / השרון ומישור החוף.', 'heritage', 'medium', 'center', 31.6500024, 34.5333246, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-213', 'חורבת סמארה', 'אתר מורשת / ארכיאולוגיה באזור מרכז / השרון ומישור החוף.', 'heritage', 'medium', 'center', 32.3921242, 34.877739, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-214', 'יער מודיעין', 'פארק / שמורה / יער באזור מרכז / השרון ומישור החוף.', 'parks', 'medium', 'center', 31.8807533, 34.9762315, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-215', 'פארק ענבה', 'פארק / שמורה / יער באזור מרכז / השרון ומישור החוף.', 'parks', 'medium', 'center', 31.8982689, 35.0041162, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-216', 'שמורת חולות פלמחים', 'פארק / שמורה / יער באזור מרכז / השרון ומישור החוף.', 'parks', 'medium', 'center', 31.9151734, 34.7252758, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-217', 'שמורת חולות ניצנים', 'פארק / שמורה / יער באזור מרכז / השרון ומישור החוף.', 'parks', 'medium', 'center', 31.7523642, 34.6240868, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-218', 'נחל יתלה', 'נחל / מסלול באזור ירושלים / הרי יהודה והשפלה.', 'water', 'medium', 'jerusalem', 31.8204829, 35.0637857, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-219', 'נחל כפירה', 'נחל / מסלול באזור ירושלים / הרי יהודה והשפלה.', 'water', 'medium', 'jerusalem', 31.8364925, 35.061463, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-220', 'נחל לוז', 'נחל / מסלול באזור ירושלים / הרי יהודה והשפלה.', 'water', 'medium', 'jerusalem', 31.7111418, 34.9964002, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-221', 'נחל אילנות', 'נחל / מסלול באזור ירושלים / הרי יהודה והשפלה.', 'water', 'medium', 'jerusalem', 32.2914014, 34.8688059, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-222', 'נחל נחשון', 'נחל / מסלול באזור ירושלים / הרי יהודה והשפלה.', 'water', 'medium', 'jerusalem', 31.8469257, 34.9642417, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-223', 'נחל שמשון', 'נחל / מסלול באזור ירושלים / הרי יהודה והשפלה.', 'water', 'medium', 'jerusalem', 31.7128095, 35.0006347, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-224', 'נחל האלה', 'נחל / מסלול באזור ירושלים / הרי יהודה והשפלה.', 'water', 'medium', 'jerusalem', 31.6705245, 34.9956881, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-225', 'נחל גוברין', 'נחל / מסלול באזור ירושלים / הרי יהודה והשפלה.', 'water', 'medium', 'jerusalem', 31.6188255, 34.8821119, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-226', 'עין מרים', 'מעיין / מקור מים באזור ירושלים / הרי יהודה והשפלה.', 'water', 'medium', 'jerusalem', 32.4285774, 35.542511, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-227', 'הר הרצל', 'תצפית / פסגה באזור ירושלים / הרי יהודה והשפלה.', 'viewpoints', 'medium', 'jerusalem', 31.7723612, 35.1816342, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-228', 'חורבת צורה', 'אתר מורשת / ארכיאולוגיה באזור ירושלים / הרי יהודה והשפלה.', 'heritage', 'medium', 'jerusalem', 31.6467833, 34.9170463, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-229', 'חורבת קנים', 'אתר מורשת / ארכיאולוגיה באזור ירושלים / הרי יהודה והשפלה.', 'heritage', 'medium', 'jerusalem', 31.6658617, 34.9643044, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-230', 'חורבת עלקת', 'אתר מורשת / ארכיאולוגיה באזור ירושלים / הרי יהודה והשפלה.', 'heritage', 'medium', 'jerusalem', 31.812286, 35.0564893, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-231', 'יער אמציה', 'פארק / שמורה / יער באזור ירושלים / הרי יהודה והשפלה.', 'parks', 'medium', 'jerusalem', 31.5070613, 34.885294, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-232', 'יער כפירה', 'פארק / שמורה / יער באזור ירושלים / הרי יהודה והשפלה.', 'parks', 'medium', 'jerusalem', 31.8458698, 35.0701609, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-233', 'יער מעלה החמישה', 'פארק / שמורה / יער באזור ירושלים / הרי יהודה והשפלה.', 'parks', 'medium', 'jerusalem', 31.8154005, 35.1274016, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-234', 'פארק רבין', 'פארק / שמורה / יער באזור ירושלים / הרי יהודה והשפלה.', 'parks', 'medium', 'jerusalem', 32.1694761, 34.855219, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-235', 'שמורת המסרק', 'פארק / שמורה / יער באזור ירושלים / הרי יהודה והשפלה.', 'parks', 'medium', 'jerusalem', 31.7942231, 35.0416607, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-236', 'שמורת כפירה', 'פארק / שמורה / יער באזור ירושלים / הרי יהודה והשפלה.', 'parks', 'medium', 'jerusalem', 31.8359681, 35.0523073, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-237', 'פארק דרום', 'פארק / שמורה / יער באזור מרכז / גוש דן ואתרים עירוניים.', 'parks', 'medium', 'center', 32.0691843, 34.8569529, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-238', 'פארק וולפסון', 'פארק / שמורה / יער באזור מרכז / גוש דן ואתרים עירוניים.', 'parks', 'medium', 'center', 32.0589698, 34.8060807, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-239', 'פארק מרום נווה', 'פארק / שמורה / יער באזור מרכז / גוש דן ואתרים עירוניים.', 'parks', 'medium', 'center', 32.071746, 34.8310983, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-240', 'פארק ארבע העונות', 'פארק / שמורה / יער באזור מרכז / גוש דן ואתרים עירוניים.', 'parks', 'medium', 'center', 32.1451765, 34.8842029, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-241', 'פארק הגדול פתח תקווה', 'פארק / שמורה / יער באזור מרכז / גוש דן ואתרים עירוניים.', 'parks', 'medium', 'center', 32.0937345, 34.8681928, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-242', 'פארק פרס חולון', 'פארק / שמורה / יער באזור מרכז / גוש דן ואתרים עירוניים.', 'parks', 'medium', 'center', 32.0036678, 34.7966276, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-243', 'פארק יבנה', 'פארק / שמורה / יער באזור מרכז / גוש דן ואתרים עירוניים.', 'parks', 'medium', 'center', 31.8727489, 34.7320051, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-244', 'גן מאיר', 'נקודת עניין / טיול באזור מרכז / גוש דן ואתרים עירוניים.', 'nature', 'medium', 'center', 31.9699737, 34.8119795, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-245', 'גן הפעמון', 'נקודת עניין / טיול באזור מרכז / גוש דן ואתרים עירוניים.', 'nature', 'medium', 'center', 31.9319887, 34.7973064, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.tiuli.com/points-of-interest'),
  ('xlsx-246', 'קבר רבן גמליאל יבנה', 'נקודת עניין / טיול באזור מרכז / גוש דן ואתרים עירוניים.', 'nature', 'medium', 'center', 31.8677791, 34.7426805, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-247', 'גבעת יונה אשדוד', 'נקודת עניין / טיול באזור מרכז / גוש דן ואתרים עירוניים.', 'nature', 'medium', 'center', 31.8139497, 34.6465564, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-248', 'מצודת אשדוד ים', 'נקודת עניין / טיול באזור מרכז / גוש דן ואתרים עירוניים.', 'nature', 'medium', 'center', 31.7804368, 34.6216571, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-249', 'נחל פרת', 'נחל / מסלול באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 31.5377318, 34.582036, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-250', 'נחל קדרון', 'נחל / מסלול באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 32.1482626, 34.8482477, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-251', 'נחל תקוע', 'נחל / מסלול באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 32.1127083, 34.8608145, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-252', 'נחל בוקק', 'נחל / מסלול באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 31.1960848, 35.296658, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-253', 'נחל יעלים', 'נחל / מסלול באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 31.2503594, 35.2836223, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-254', 'נחל מור', 'נחל / מסלול באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 31.2646838, 35.3494105, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-255', 'נחל לוט', 'נחל / מסלול באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 31.1172278, 35.301874, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-256', 'נחל סדום', 'נחל / מסלול באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 31.1051595, 35.3741173, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-257', 'נחל קנאים', 'נחל / מסלול באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 31.312315, 35.3200191, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-258', 'עין דוד', 'מעיין / מקור מים באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 31.9690363, 34.8236779, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-259', 'בריכת צפירה', 'מעיין / מקור מים באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 31.3375641, 35.2773713, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-260', 'גב רחף', 'מעיין / מקור מים באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 31.2872229, 35.3611181, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-261', 'גבי נחל צאלים', 'מעיין / מקור מים באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'water', 'medium', 'deadsea', 31.3359356, 35.251049, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-262', 'הר סדום', 'תצפית / פסגה באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'viewpoints', 'medium', 'deadsea', 31.0938129, 35.3831534, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-263', 'הר צרויה', 'תצפית / פסגה באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'viewpoints', 'medium', 'deadsea', 31.4481435, 35.3680981, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-264', 'הר יאיר', 'תצפית / פסגה באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'viewpoints', 'medium', 'deadsea', 31.3273201, 35.3207046, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-265', 'מערת האימה', 'מערה / אתר טבע באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'nature', 'medium', 'deadsea', 31.4317011, 35.3320657, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-266', 'מערת האיגרות', 'מערה / אתר טבע באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'nature', 'medium', 'deadsea', 31.4326725, 35.3429413, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-267', 'מערת הקמח', 'מערה / אתר טבע באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'nature', 'medium', 'deadsea', 31.0843869, 35.3557286, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-268', 'מערת סדום', 'מערה / אתר טבע באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'nature', 'medium', 'deadsea', 31.0867465, 35.3949774, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-269', 'מצד תמר', 'אתר מורשת / ארכיאולוגיה באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'heritage', 'medium', 'deadsea', 31.0278529, 35.2417047, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-270', 'מצד חתרורים', 'אתר מורשת / ארכיאולוגיה באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'heritage', 'medium', 'deadsea', 31.2231441, 35.3055188, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-271', 'מצד נחל צאלים', 'אתר מורשת / ארכיאולוגיה באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'heritage', 'medium', 'deadsea', 31.3410802, 35.2738587, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-272', 'נבי מוסא', 'נקודת עניין / טיול באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'nature', 'medium', 'deadsea', 31.2005369, 34.8393582, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-273', 'מנזר סנט ג''ורג''', 'נקודת עניין / טיול באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'nature', 'medium', 'deadsea', 31.9535523, 34.8998003, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-274', 'שמורת מדבר יהודה', 'פארק / שמורה / יער באזור מדבר יהודה / ים המלח ובקעת הירדן.', 'parks', 'medium', 'deadsea', 30.9313844, 35.2039375, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/'),
  ('xlsx-275', 'נחל באר שבע', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.707975, 34.7844269, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-276', 'נחל גרר', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 31.3955236, 34.5984608, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-277', 'נחל סכר', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 31.1150431, 34.7836315, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-278', 'נחל פטיש', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 31.3521665, 34.5725436, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-279', 'נחל אופקים', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 31.3211208, 34.6380171, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-280', 'נחל עשן', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 31.2923301, 34.7250219, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-281', 'נחל חברון', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 31.3424948, 34.9302648, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-282', 'נחל יתיר', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 31.2831759, 34.9534374, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-283', 'נחל באר חיל', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.9899419, 34.7185388, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-284', 'נחל רביבים', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 31.0028901, 34.8812592, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-285', 'נחל הבשור', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.918838, 34.7066456, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-286', 'נחל אסף', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 31.3503128, 34.4359268, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-287', 'נחל עקב', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.7341039, 34.8662949, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-288', 'נחל דבשון', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.8243544, 34.7883235, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-289', 'נחל חווה', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.7291994, 34.8954833, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-290', 'נחל נקרות', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.5661487, 34.8896785, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-291', 'נחל ארדון', 'נחל / מסלול באזור נגב / באר שבע והר הנגב.', 'water', 'medium', 'south', 30.6255581, 34.9463828, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null)

on conflict (id) do nothing;
