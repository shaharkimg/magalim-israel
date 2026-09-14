-- מקור חדש: inature.info - ויקי-הטבע המקיף ביותר בישראל, מבוסס Semantic MediaWiki עם
-- קואורדינטות מדויקות משובצות בכל ערך. שאילתת API ישירה (action=ask) שלפה בבת אחת את כל
-- 1,425 האתרים בעלי-קואורדינטות באתר, ומהם סוננו (לפי מרחק>2 ק"מ מכל יעד קיים, ו-PageType
-- הכולל "National parks") **40 גנים לאומיים רשמיים** שהיו חסרים לגמרי מהמפה! בניגוד לסבבים
-- הקודמים, לא נדרש אימות-פופולריות בגוגל-מפות פרטני לכל אחד - סטטוס "גן לאומי" (הכרזה
-- ממשלתית רשמית של רט"ג) הוא בעצמו סימן-האיכות/הרלוונטיות המספיק.
--
-- דולגו כתוצאות-קואורדינטה-כפולה (שני ערכי-ויקי לאותו מקום פיזי): "גן לאומי צבעי הרמון"
-- (=לב מכתש רמון, קואורדינטות זהות), "גן לאומי חוף פלמחים" (=ים פלמחים, אותו קומפלקס).
--
-- 40 גנים לאומיים אושרו ונוספו:

insert into public.landmarks
  (id, name, description, category, difficulty, region, lat, lon, duration, distance_km,
   points, base_visits, family_friendly, dog_friendly, accessible, has_water, price_type,
   season, duration_hours, official_url)
values
  ('np-halutza', 'גן לאומי חלוצה', 'גן לאומי בחולות הנגב המערבי, עם יערות-נטועים ושרידי-יישוב עתיקים.', 'nature', 'easy', 'south', 31.097330, 34.656230, 'שעה', 1, 10, 20, true, false, false, false, 'free', null, 1, null),
  ('np-tel-beit-mirsham', 'גן לאומי תל בית מירשם', 'תל ארכיאולוגי בשפלת יהודה, שכבות-יישוב מהתקופה הכנענית ועד הישראלית.', 'archaeology', 'easy', 'center', 31.460990, 34.906840, 'שעה', 1, 10, 15, false, false, false, false, 'free', null, 1, null),
  ('np-sebastia', 'גן לאומי סבסטיה', 'אתר ארכיאולוגי מרשים בשומרון, שרידי בירת ממלכת ישראל העתיקה והעיר הרומית שהקים הורדוס.', 'archaeology', 'medium', 'center', 32.278240, 35.198630, 'שעתיים', 2, 10, 40, true, false, false, false, 'free', null, 2, null),
  ('np-kakun', 'גן לאומי קאקון', 'שרידי מצודה צלבנית-מצרית על גבעה בשרון, עם נוף פתוח למישור החוף.', 'archaeology', 'easy', 'center', 32.359700, 34.995490, 'שעה', 1, 10, 10, false, false, false, false, 'free', null, 1, null),
  ('np-tel-tzafit', 'גן לאומי תל צפית (גת)', 'תל ארכיאולוגי בשפלה, המזוהה עם העיר הפלישתית גת - עיר הולדתו המקראית של גלית.', 'archaeology', 'easy', 'center', 31.702900, 34.848470, 'שעה', 1, 10, 12, false, false, false, false, 'free', null, 1, null),
  ('np-tel-lachish', 'גן לאומי תל לכיש', 'אחד התלים החשובים בישראל, בירת ממלכת יהודה השנייה בגודלה - שערי-עיר וביצורים מרשימים.', 'archaeology', 'easy', 'center', 31.564970, 34.848520, 'שעה', 1, 10, 25, true, false, false, false, 'free', null, 1, null),
  ('np-mearot-hazan', 'גן לאומי מערות חזן', 'מערכת מערות-טבע בשפלת יהודה.', 'archaeology', 'medium', 'center', 31.518480, 34.902990, 'שעה', 1, 10, 8, false, false, false, false, 'free', null, 1, null),
  ('np-shimron', 'גן לאומי שימרון', 'אזור-חורש מפותח סביב היישוב תימרת בגליל התחתון, עם תל שימרון העתיק ותצפית ייחודית לעמק יזרעאל.', 'nature', 'easy', 'north', 32.700350, 35.232980, 'שעה', 1, 10, 15, true, false, false, false, 'free', null, 1, null),
  ('np-givot-lachish', 'גן לאומי גבעות לכיש', 'גבעות ונחלים בשפלת לכיש, לצד גן לאומי תל לכיש.', 'nature', 'easy', 'center', 31.570967, 34.850564, 'שעה', 1, 10, 8, false, false, false, false, 'free', null, 1, null),
  ('np-mearot-samekh', 'גן לאומי מערות סמך', 'מערות-טבע בשפלת יהודה, סמוך לתל נגילה.', 'archaeology', 'medium', 'center', 31.555700, 34.813020, 'שעה', 1, 10, 6, false, false, false, false, 'free', null, 1, null),
  ('np-tel-dor', 'גן לאומי תל דור', 'תל ארכיאולוגי חופי עם נמל עתיק ולגונות טבעיות, סמוך לחוף דור-הבונים.', 'archaeology', 'easy', 'north', 32.617760, 34.918300, 'שעה', 1, 10, 30, true, false, false, true, 'free', null, 1, null),
  ('np-horvat-tzefatzefot', 'גן לאומי חורבת צפצפות', 'שרידי-יישוב עתיק בגליל התחתון, סמוך להר תבור.', 'archaeology', 'easy', 'north', 32.643090, 35.390480, 'שעה', 1, 10, 5, false, false, false, false, 'free', null, 1, null),
  ('np-lev-hamakhtesh', 'גן לאומי לב מכתש רמון', 'אזור-ליבה של מכתש רמון, עם תצורות-סלע וצבעים גיאולוגיים ייחודיים.', 'nature', 'medium', 'south', 30.611870, 34.879680, 'שעתיים', 3, 10, 20, false, false, false, false, 'free', null, 2, null),
  ('np-karney-hittin', 'גן לאומי קרני חיטים', 'הר-געש כבוי בגליל התחתון, אתר קרב חיטין ההיסטורי בין הצלבנים לצלאח א-דין - תצפית מרשימה על הכנרת.', 'viewpoints', 'medium', 'north', 32.801990, 35.456570, 'שעה', 1, 10, 25, false, false, false, false, 'free', null, 1, null),
  ('np-nebi-samuel', 'גן לאומי נבי סמואל', 'פסגה בפאתי ירושלים עם מסגד-ומצפה, המזוהה במסורת עם קברו של שמואל הנביא - נוף פנורמי על ירושלים וסביבתה.', 'religious', 'easy', 'jerusalem', 31.833020, 35.180540, 'שעה', 1, 10, 20, true, false, false, false, 'free', null, 1, null),
  ('np-sde-amudim', 'גן לאומי שדה עמודים', 'שמורת-טבע בגליל התחתון עם עמודי-בזלת ייחודיים ונוף אל הכנרת.', 'nature', 'medium', 'north', 32.814540, 35.408670, 'שעתיים', 2, 10, 15, false, false, false, false, 'free', null, 2, null),
  ('np-atlit-fortress', 'גן לאומי מבצר עתלית', 'שרידי מצודת הצלבנים "קסטלום פרגרינורום" על חוף הכרמל, אחת המצודות האחרונות שהחזיקו הצלבנים בארץ.', 'archaeology', 'easy', 'north', 32.705320, 34.934230, 'שעה', 1, 10, 15, false, false, false, false, 'free', null, 1, null),
  ('np-yam-palmachim', 'גן לאומי ים פלמחים', 'חוף-ים טבעי ושמור עם צוקי-כורכר וחולות, מפגש נחל שורק עם הים.', 'nature', 'easy', 'center', 31.933800, 34.682970, 'שעה', 1, 10, 40, true, false, true, true, 'free', null, 1, null),
  ('np-hulda', 'גן לאומי חולדה', 'שרידי-יישוב ואתר-מורשת ציוני בשפלה, סמוך לקיבוץ חולדה.', 'heritage', 'easy', 'center', 31.816380, 34.897180, 'שעה', 1, 10, 6, false, false, false, false, 'free', null, 1, null),
  ('np-harei-yehuda', 'גן לאומי הרי יהודה', 'שטח-טבע נרחב בהרי ירושלים, כולל שבילי-הליכה ונופי-יער.', 'nature', 'medium', 'jerusalem', 31.808728, 35.037546, 'שעתיים', 3, 10, 20, false, false, false, false, 'free', null, 2, null),
  ('np-malchat-sdom', 'גן לאומי מלחת סדום', 'תצורות-מלח ייחודיות בהר סדום, דרום ים המלח - מערות-מלח ונוף מדברי דרמטי.', 'nature', 'medium', 'deadsea', 30.985708, 35.353625, 'שעתיים', 2, 10, 25, false, false, false, false, 'free', null, 2, null),
  ('np-givot-modiin', 'גן לאומי גבעות מודיעין', 'שטח-טבע וגבעות בסמוך למודיעין, שבילי-הליכה ונוף פתוח.', 'nature', 'easy', 'center', 31.873620, 35.023070, 'שעה', 1, 10, 10, false, false, false, false, 'free', null, 1, null),
  ('np-horvat-usha', 'גן לאומי חורבת אושה', 'שרידי-יישוב עתיק בגליל התחתון, סמוך לציפורי.', 'archaeology', 'easy', 'north', 32.793100, 35.144160, 'שעה', 1, 10, 8, false, false, false, false, 'free', null, 1, null),
  ('np-givot-nes-tziona', 'גן לאומי גבעות נס ציונה', 'שטח-טבע וגבעות בשפלת החוף, סמוך לנס ציונה.', 'nature', 'easy', 'center', 31.932920, 34.783720, 'שעה', 1, 10, 6, false, false, false, false, 'free', null, 1, null),
  ('np-omrit', 'גן לאומי עומרית', 'שרידי מקדש רומי עתיק ברמת הגולן, סמוך לקריית שמונה.', 'archaeology', 'easy', 'north', 33.218414, 35.662984, 'שעה', 1, 10, 8, false, false, false, false, 'free', null, 1, null),
  ('np-keren-naftali', 'גן לאומי קרן נפתלי', 'רכס-הר בגליל העליון עם שרידי מצודה צלבנית ונוף פתוח לעמק החולה.', 'viewpoints', 'medium', 'north', 33.094920, 35.558830, 'שעתיים', 2, 10, 10, false, false, false, false, 'free', null, 2, null),
  ('np-negev-brigade', 'גן לאומי אנדרטת חטיבת הנגב', 'אנדרטה מונומנטלית מעל באר שבע, לזכר לוחמי חטיבת הנגב שנפלו במלחמת העצמאות - עיצוב פיסולי ייחודי של דני קרוון.', 'heritage', 'easy', 'south', 31.266570, 34.820680, 'שעה', 1, 10, 30, true, false, true, false, 'free', null, 1, null),
  ('np-tel-shikmona', 'גן לאומי תל שקמונה', 'תל חופי בחיפה עם שרידי-יישוב מהתקופה הכנענית ועד הביזנטית.', 'archaeology', 'easy', 'north', 32.825250, 34.955620, 'שעה', 1, 10, 8, false, false, false, true, 'free', null, 1, null),
  ('np-tel-ashdod', 'גן לאומי תל אשדוד', 'תל ארכיאולוגי המזוהה עם העיר הפלישתית אשדוד המקראית.', 'archaeology', 'easy', 'center', 31.755950, 34.657460, 'שעה', 1, 10, 8, false, false, false, false, 'free', null, 1, null),
  ('np-avihayil', 'גן לאומי אביחיל', 'שרידי-מורשת ואתר-הנצחה סמוך לנתניה.', 'heritage', 'easy', 'center', 32.353600, 34.868430, 'שעה', 1, 10, 5, false, false, false, false, 'free', null, 1, null),
  ('np-ovadia', 'גן לאומי עובדיה', 'שטח-טבע ברמת הגולן המזרחית.', 'nature', 'medium', 'north', 32.690171, 35.556393, 'שעה', 1, 10, 5, false, false, false, false, 'free', null, 1, null),
  ('np-tel-rehov', 'גן לאומי תל רחוב', 'אחד התלים הגדולים בישראל, בעמק בית שאן - שרידי-יישוב מהתקופה הכנענית והישראלית, כולל ממצאי-דבורים עתיקים.', 'archaeology', 'easy', 'north', 32.456760, 35.504370, 'שעה', 1, 10, 8, false, false, false, false, 'free', null, 1, null),
  ('np-avel-beit-maacha', 'גן לאומי אבל בית מעכה', 'תל מקראי בגליל העליון, סמוך למטולה.', 'archaeology', 'easy', 'north', 33.258570, 35.580180, 'שעה', 1, 10, 5, false, false, false, false, 'free', null, 1, null),
  ('np-gan-hapsalim', 'גן לאומי גן הפסלים', 'גן-פיסול מדברי סמוך לשדה בוקר, יצירות-אמנות בלב נוף הנגב.', 'heritage', 'easy', 'south', 30.835770, 34.806140, 'שעה', 1, 10, 10, true, false, false, false, 'free', null, 1, null),
  ('np-capernaum', 'גן לאומי כפר נחום', 'אתר ארכיאולוגי וקדוש-נוצרי על חוף הכנרת, בית-הכנסת העתיק וכנסיית זיכרון לפטרוס הקדוש.', 'religious', 'easy', 'north', 32.881245, 35.576050, 'שעה', 1, 10, 60, true, false, true, true, 'free', null, 1, null),
  ('np-tel-kedesh', 'גן לאומי תל קדש', 'תל ומקדש רומי עתיק בגליל העליון, אחד ממקדשי-האבן השמורים בישראל.', 'archaeology', 'easy', 'north', 33.113750, 35.534110, 'שעה', 1, 10, 10, false, false, false, false, 'free', null, 1, null),
  ('np-hippos-susita', 'גן לאומי סוסיתה', 'תל עתיק מעל הכנרת המזרחית, שרידי עיר יוונית-רומית-ביזנטית עם רחוב-עמודים ונוף מרהיב על הכנרת.', 'archaeology', 'medium', 'north', 32.778320, 35.660220, 'שעתיים', 2, 10, 20, false, false, false, false, 'free', null, 2, null),
  ('np-tzur-natan', 'גן לאומי צור נתן', 'שטח-טבע וגן לאומי בשרון, שבילי-הליכה בנוף חורש.', 'nature', 'easy', 'center', 32.238720, 35.017580, 'שעה', 1, 10, 8, false, false, false, false, 'free', null, 1, null),
  ('np-gov-yosef', 'גן לאומי גוב יוסף', 'שרידי-יישוב עתיק ברמת הגולן.', 'archaeology', 'easy', 'north', 32.918930, 35.537200, 'שעה', 1, 10, 4, false, false, false, false, 'free', null, 1, null),
  ('np-yeruham', 'גן לאומי ירוחם', 'שטח-טבע סמוך לירוחם, בנגב המרכזי.', 'nature', 'easy', 'south', 30.991920, 34.888710, 'שעה', 1, 10, 6, false, false, false, false, 'free', null, 1, null)

on conflict (id) do nothing;
