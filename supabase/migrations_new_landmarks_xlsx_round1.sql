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
-- סבב 1 מתוך 4.

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('xlsx-001', 'אנדרטת חללי הקיבוצים', 'טיול / נקודת עניין באזור צפון.', 'nature', 'medium', 'north', 32.5979186, 35.1326528, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/trips/itineraries_for_families/itineraries_for_families_north/'),
  ('xlsx-002', 'דרך הטמפלרים', 'טיול / נקודת עניין באזור צפון.', 'nature', 'medium', 'north', 32.7271982, 35.1362803, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/trips/itineraries_for_families/itineraries_for_families_north/'),
  ('xlsx-003', 'גבעות גורל', 'טיול / נקודת עניין באזור דרום / נגב וערבה.', 'nature', 'medium', 'south', 31.316667, 34.816667, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/trips/itineraries_for_families/itineraries_for_families_south/'),
  ('xlsx-004', 'פארק גולדה', 'טיול / נקודת עניין באזור דרום / נגב וערבה.', 'nature', 'medium', 'south', 31.016267, 34.760395, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/trips/itineraries_for_families/itineraries_for_families_south/'),
  ('xlsx-005', 'יער פלוגות', 'יער / מסלול באזור דרום / נגב וערבה.', 'nature', 'medium', 'south', 31.6179321, 34.7458799, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/trips/itineraries_for_families/itineraries_for_families_south/'),
  ('xlsx-006', 'שמורת טבע מצוק הצינים', 'שמורת טבע / מסלול באזור נגב.', 'reserves', 'medium', 'south', 30.6204574, 34.9193487, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/reserve-park/%D7%A9%D7%9E%D7%95%D7%A8%D7%AA-%D7%98%D7%91%D7%A2-%D7%9E%D7%A6%D7%95%D7%A7-%D7%94%D7%A6%D7%99%D7%A0%D7%99%D7%9D/'),
  ('xlsx-007', 'שמורת טבע נחל שיזף', 'שמורת טבע / דרך נוף באזור ערבה.', 'reserves', 'medium', 'south', 30.7247818, 35.2555992, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/reserve-park/%D7%A9%D7%9E%D7%95%D7%A8%D7%AA-%D7%98%D7%91%D7%A2-%D7%A0%D7%97%D7%9C-%D7%A9%D7%99%D7%96%D7%A3/'),
  ('xlsx-008', 'הר כפיר', 'מסלול הליכה באזור צפון / גליל.', 'nature', 'medium', 'north', 32.950183, 35.4089091, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/trip/page/2/'),
  ('xlsx-009', 'שמורת טבע מעיינות גיבתון', 'שמורת טבע / מעיינות באזור מרכז / שפלה.', 'reserves', 'medium', 'center', 31.8527295, 34.865343, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/trip/page/2/'),
  ('xlsx-010', 'שמורת טבע שיטה מלבינה אשדוד', 'שמורת טבע / מסלול באזור מרכז / מישור החוף.', 'reserves', 'medium', 'center', 31.8370026, 34.7007409, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/trip/page/2/'),
  ('xlsx-011', 'גן לאומי צור נתן', 'מסלול הליכה באזור מרכז / השרון.', 'nature', 'medium', 'center', 32.2434431, 34.9973236, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/trip/page/2/'),
  ('xlsx-012', 'מצודת ביריה', 'מסלול / אתר מורשת באזור צפון / גליל עליון.', 'heritage', 'medium', 'north', 32.9904002, 35.5080879, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/trips/255/'),
  ('xlsx-013', 'עין אניעם', 'מעיין באזור צפון / גולן.', 'water', 'medium', 'north', 32.9666398, 35.7501316, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-014', 'עין מימון', 'מעיין באזור צפון / גולן.', 'water', 'medium', 'north', 33.113086, 35.660899, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-015', 'עין אי״ה', 'מעיין / תצפית באזור צפון / גולן.', 'water', 'medium', 'north', 32.7578033, 35.745894, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-016', 'עין חשק', 'מעיין באזור צפון / גולן.', 'water', 'medium', 'north', 33.1108337, 35.6501876, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-017', 'עין רמיאל', 'מעיין באזור צפון / גליל תחתון.', 'water', 'medium', 'north', 32.9462915, 35.4361157, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-018', 'עין שחל', 'מעיין באזור צפון / גליל תחתון.', 'water', 'medium', 'north', 32.6223103, 35.4979401, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-019', 'עין נורית', 'מעיין באזור צפון / גלבוע.', 'water', 'medium', 'north', 32.5358829, 35.3634097, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-020', 'עין טמיר', 'מעיין באזור צפון / גליל מערבי.', 'water', 'medium', 'north', 33.0414528, 35.2500894, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-021', 'עין עלווה', 'מעיין באזור צפון / גליל עליון.', 'water', 'medium', 'north', 33.0334816, 35.4537659, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-022', 'עין מחוללים', 'מעיין באזור צפון / רמות מנשה.', 'water', 'medium', 'north', 32.5965849, 35.0587354, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, 'https://www.kkl.org.il/travel/water_trips_2025/'),
  ('xlsx-023', 'עין דמומית', 'מעיין באזור צפון / רמות מנשה.', 'water', 'medium', 'north', 32.6015484, 35.0785937, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.kkl.org.il/travel/water_trips_2025/'),
  ('xlsx-024', 'עין ורד', 'מעיין באזור מרכז / השפלה.', 'water', 'medium', 'center', 32.2653177, 34.9317604, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-025', 'עין חוד', 'מעיין באזור ירושלים / הרי יהודה.', 'water', 'medium', 'jerusalem', 31.7362309, 35.0547905, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-026', 'עין נמר', 'מעיין / מסלול באזור ים המלח.', 'water', 'medium', 'deadsea', 31.3568592, 35.3143768, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-027', 'עין משמר', 'מעיין / מסלול באזור ים המלח.', 'water', 'medium', 'deadsea', 31.3858369, 35.3290902, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-028', 'גבי פרס', 'גבים באזור נגב / ים המלח.', 'nature', 'medium', 'deadsea', 31.0094246, 35.2886654, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-029', 'גב קינה', 'גב באזור נגב / ערד.', 'nature', 'medium', 'south', 31.1975307, 35.1672249, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-030', 'גב חווה', 'גב באזור נגב.', 'nature', 'medium', 'south', 30.7279053, 34.9036674, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-031', 'עין חווה', 'מעיין / מסלול באזור נגב.', 'water', 'medium', 'south', 30.73235, 34.9185968, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-032', 'מצפור ערד', 'תצפית באזור נגב / ערד.', 'viewpoints', 'medium', 'south', 30.8572183, 34.4059093, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.parks.org.il/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%98%D7%99%D7%95%D7%9C/'),
  ('xlsx-033', 'הר דב', 'תצפית / פסגה באזור צפון / גולן וחרמון.', 'viewpoints', 'medium', 'north', 33.2793667, 35.6847301, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-034', 'הר הבתרים', 'תצפית / פסגה באזור צפון / גולן וחרמון.', 'viewpoints', 'medium', 'north', 33.2905862, 35.7044335, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-035', 'הר ורדה', 'תצפית / פסגה באזור צפון / גולן וחרמון.', 'viewpoints', 'medium', 'north', 33.2109799, 35.7885252, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-036', 'הר בני רסן', 'תצפית / פסגה באזור צפון / גולן וחרמון.', 'viewpoints', 'medium', 'north', 33.0812805, 35.8325494, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-037', 'הר יוסיפון', 'תצפית / פסגה באזור צפון / גולן וחרמון.', 'viewpoints', 'medium', 'north', 33.0566944, 35.7969809, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-038', 'הר נמרון', 'תצפית / פסגה באזור צפון / גולן וחרמון.', 'viewpoints', 'medium', 'north', 32.7266907, 35.650629, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-039', 'הר כחל', 'תצפית / פסגה באזור צפון / גולן וחרמון.', 'viewpoints', 'medium', 'north', 33.2849404, 35.733324, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-040', 'נחל שיאון', 'נחל / מסלול באזור צפון / גולן וחרמון.', 'water', 'medium', 'north', 33.2753523, 35.7056679, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-041', 'נחל גובתה', 'נחל / מסלול באזור צפון / גולן וחרמון.', 'water', 'medium', 'north', 33.2752616, 35.7532238, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-042', 'נחל שוח', 'נחל / מסלול באזור צפון / גולן וחרמון.', 'water', 'medium', 'north', 33.0741292, 35.6989145, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-043', 'נחל דליות', 'נחל / מסלול באזור צפון / גולן וחרמון.', 'water', 'medium', 'north', 32.8975873, 35.7301417, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-044', 'נחל בזלת', 'נחל / מסלול באזור צפון / גולן וחרמון.', 'water', 'medium', 'north', 32.9016944, 35.7675615, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-045', 'נחל משושים', 'נחל / מסלול באזור צפון / גולן וחרמון.', 'water', 'medium', 'north', 32.9085265, 35.6488889, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-046', 'נחל חמדל', 'נחל / מסלול באזור צפון / גולן וחרמון.', 'water', 'medium', 'north', 33.0964865, 35.6601509, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-047', 'נחל נוב', 'נחל / מסלול באזור צפון / גולן וחרמון.', 'water', 'medium', 'north', 32.7886047, 35.7745696, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-048', 'נחל עין גב', 'נחל / מסלול באזור צפון / גולן וחרמון.', 'water', 'medium', 'north', 32.7866686, 35.6393589, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-049', 'עין פית', 'מעיין / מקור מים באזור צפון / גולן וחרמון.', 'water', 'medium', 'north', 33.2243247, 35.705113, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-050', 'עין קיניא', 'מעיין / מקור מים באזור צפון / גולן וחרמון.', 'water', 'medium', 'north', 33.2360284, 35.731055, 'שעה', 1, 4, true, false, false, true, 'free', null, 1, null),
  ('xlsx-051', 'בריכת האירוסים', 'מעיין / מקור מים באזור צפון / גולן וחרמון.', 'water', 'medium', 'north', 32.9994213, 35.7393641, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-052', 'תל סאקי', 'אתר מורשת / ארכיאולוגיה באזור צפון / גולן וחרמון.', 'heritage', 'medium', 'north', 32.8660485, 35.8306447, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-053', 'חורבת דבורה', 'אתר מורשת / ארכיאולוגיה באזור צפון / גולן וחרמון.', 'heritage', 'medium', 'north', 31.7049647, 34.9943416, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-054', 'חורבת חוצה', 'אתר מורשת / ארכיאולוגיה באזור צפון / גולן וחרמון.', 'heritage', 'medium', 'north', 32.199771, 34.9579617, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-055', 'חורבת פארג''', 'אתר מורשת / ארכיאולוגיה באזור צפון / גולן וחרמון.', 'heritage', 'medium', 'north', 32.958314, 35.8343517, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-056', 'חורבת חושניה', 'אתר מורשת / ארכיאולוגיה באזור צפון / גולן וחרמון.', 'heritage', 'medium', 'north', 32.9978678, 35.812436, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-057', 'יער מסעדה', 'פארק / שמורה / יער באזור צפון / גולן וחרמון.', 'parks', 'medium', 'north', 33.2282263, 35.7472637, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-058', 'יער אלוני הבשן', 'פארק / שמורה / יער באזור צפון / גולן וחרמון.', 'parks', 'medium', 'north', 33.0174487, 35.8378579, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-059', 'יער קשת', 'פארק / שמורה / יער באזור צפון / גולן וחרמון.', 'parks', 'medium', 'north', 32.9811817, 35.819149, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-060', 'יער מרום גולן', 'פארק / שמורה / יער באזור צפון / גולן וחרמון.', 'parks', 'medium', 'north', 33.139743, 35.7667323, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-061', 'הר שמאי', 'תצפית / פסגה באזור צפון / גליל עליון ואצבע הגליל.', 'viewpoints', 'medium', 'north', 32.9485387, 35.4481636, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-062', 'הר חירם', 'תצפית / פסגה באזור צפון / גליל עליון ואצבע הגליל.', 'viewpoints', 'medium', 'north', 33.0223603, 35.3759133, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-063', 'הר בירנית', 'תצפית / פסגה באזור צפון / גליל עליון ואצבע הגליל.', 'viewpoints', 'medium', 'north', 33.0603882, 35.340422, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-064', 'הר סאסא', 'תצפית / פסגה באזור צפון / גליל עליון ואצבע הגליל.', 'viewpoints', 'medium', 'north', 33.0346423, 35.3888087, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-065', 'הר דלתון', 'תצפית / פסגה באזור צפון / גליל עליון ואצבע הגליל.', 'viewpoints', 'medium', 'north', 33.0246948, 35.4969227, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-066', 'הר יבנית', 'תצפית / פסגה באזור צפון / גליל עליון ואצבע הגליל.', 'viewpoints', 'medium', 'north', 32.9931277, 35.5164722, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-067', 'הר ספסוף', 'תצפית / פסגה באזור צפון / גליל עליון ואצבע הגליל.', 'viewpoints', 'medium', 'north', 33.0126798, 35.4288666, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-068', 'הר גודרים', 'תצפית / פסגה באזור צפון / גליל עליון ואצבע הגליל.', 'viewpoints', 'medium', 'north', 33.0466698, 35.3833702, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-069', 'הר שנאן', 'תצפית / פסגה באזור צפון / גליל עליון ואצבע הגליל.', 'viewpoints', 'medium', 'north', 33.2086816, 35.536932, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-070', 'הר נזר', 'תצפית / פסגה באזור צפון / גליל עליון ואצבע הגליל.', 'viewpoints', 'medium', 'north', 33.1760311, 35.5484625, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-071', 'הר פקיעין', 'תצפית / פסגה באזור צפון / גליל עליון ואצבע הגליל.', 'viewpoints', 'medium', 'north', 32.9902546, 35.352812, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-072', 'הר מתת', 'תצפית / פסגה באזור צפון / גליל עליון ואצבע הגליל.', 'viewpoints', 'medium', 'north', 33.0387629, 35.3541757, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-073', 'נחל דישון', 'נחל / מסלול באזור צפון / גליל עליון ואצבע הגליל.', 'water', 'medium', 'north', 33.0690118, 35.4768818, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-074', 'נחל צבעון', 'נחל / מסלול באזור צפון / גליל עליון ואצבע הגליל.', 'water', 'medium', 'north', 33.0265123, 35.4121, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-075', 'נחל מחניים', 'נחל / מסלול באזור צפון / גליל עליון ואצבע הגליל.', 'water', 'medium', 'north', 32.9914094, 35.5486378, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-076', 'נחל קציון', 'נחל / מסלול באזור צפון / גליל עליון ואצבע הגליל.', 'water', 'medium', 'north', 33.047168, 35.5233354, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-077', 'נחל פארעם', 'נחל / מסלול באזור צפון / גליל עליון ואצבע הגליל.', 'water', 'medium', 'north', 32.9820729, 35.5233318, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-078', 'נחל שזור', 'נחל / מסלול באזור צפון / גליל עליון ואצבע הגליל.', 'water', 'medium', 'north', 32.9214249, 35.3222741, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-079', 'נחל פקיעין', 'נחל / מסלול באזור צפון / גליל עליון ואצבע הגליל.', 'water', 'medium', 'north', 32.9932582, 35.3069349, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-080', 'עין פועם', 'מעיין / מקור מים באזור צפון / גליל עליון ואצבע הגליל.', 'water', 'medium', 'north', 32.9777072, 35.4713817, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-081', 'עין גבר', 'מעיין / מקור מים באזור צפון / גליל עליון ואצבע הגליל.', 'water', 'medium', 'north', 32.9997207, 35.496427, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-082', 'עין פארוד', 'מעיין / מקור מים באזור צפון / גליל עליון ואצבע הגליל.', 'water', 'medium', 'north', 32.9383957, 35.4278609, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-083', 'עין זבד', 'מעיין / מקור מים באזור צפון / גליל עליון ואצבע הגליל.', 'water', 'medium', 'north', 32.9754333, 35.4284019, 'שעה', 1, 8, true, false, false, true, 'free', null, 1, null),
  ('xlsx-084', 'חורבת קציון', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל עליון ואצבע הגליל.', 'heritage', 'medium', 'north', 33.0428481, 35.5295519, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-085', 'חורבת עכברה', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל עליון ואצבע הגליל.', 'heritage', 'medium', 'north', 32.9181107, 35.2778622, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-086', 'חורבת מרות', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל עליון ואצבע הגליל.', 'heritage', 'medium', 'north', 33.0310965, 35.5261703, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-087', 'חורבת עלווה', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל עליון ואצבע הגליל.', 'heritage', 'medium', 'north', 33.0366664, 35.4521979, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-088', 'חורבת צונם', 'אתר מורשת / ארכיאולוגיה באזור צפון / גליל עליון ואצבע הגליל.', 'heritage', 'medium', 'north', 33.0638428, 35.2720718, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-089', 'מערת פער', 'מערה / אתר טבע באזור צפון / גליל עליון ואצבע הגליל.', 'nature', 'medium', 'north', 33.0310083, 35.3859111, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-090', 'מערת עלמה', 'מערה / אתר טבע באזור צפון / גליל עליון ואצבע הגליל.', 'nature', 'medium', 'north', 33.0379905, 35.5093532, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, null),
  ('xlsx-091', 'מערת אביב', 'מערה / אתר טבע באזור צפון / גליל עליון ואצבע הגליל.', 'nature', 'medium', 'north', 31.9094088, 34.9290281, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-092', 'מערת פקיעין', 'מערה / אתר טבע באזור צפון / גליל עליון ואצבע הגליל.', 'nature', 'medium', 'north', 32.9768505, 35.3377229, 'שעה', 1, 4, true, false, false, false, 'free', null, 1, null),
  ('xlsx-093', 'יער ביריה', 'פארק / שמורה / יער באזור צפון / גליל עליון ואצבע הגליל.', 'parks', 'medium', 'north', 32.9928753, 35.5290464, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-094', 'יער מירון', 'פארק / שמורה / יער באזור צפון / גליל עליון ואצבע הגליל.', 'parks', 'medium', 'north', 32.9887875, 35.4579192, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-095', 'יער מלכיה', 'פארק / שמורה / יער באזור צפון / גליל עליון ואצבע הגליל.', 'parks', 'medium', 'north', 33.0863679, 35.4759336, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-096', 'יער יראון', 'פארק / שמורה / יער באזור צפון / גליל עליון ואצבע הגליל.', 'parks', 'medium', 'north', 32.476219, 35.0475834, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/'),
  ('xlsx-097', 'יער שפר', 'פארק / שמורה / יער באזור צפון / גליל עליון ואצבע הגליל.', 'parks', 'medium', 'north', 32.9393888, 35.4340878, 'שעה', 1, 8, true, false, false, false, 'free', null, 1, 'https://www.kkl.org.il/travel/')

on conflict (id) do nothing;
