-- שדרוג Discovery: עמודות חדשות לסינון מורחב (תוספתי, לא הרסני)

alter table public.landmarks
  add column if not exists family_friendly boolean not null default false,
  add column if not exists dog_friendly boolean not null default false,
  add column if not exists accessible boolean not null default false,
  add column if not exists has_water boolean not null default false,
  add column if not exists price_type text not null default 'free' check (price_type in ('free','paid')),
  add column if not exists season text,
  add column if not exists duration_hours numeric;

-- has_water: נגזר מקטגוריה + מילות מפתח בשם (נכון לכל 259 היעדים)
update public.landmarks set has_water = true
where category = 'water'
   or name ~ 'נחל|מעיין|מעיינות|מפל|בריכ|ברכת|מקורות|נביעה|בניאס|נחלים';

-- duration_hours: נוסחה מהמרחק (עקבי עם איך שחושב לכל 234 המסלולים שנוספו מ-tiuli)
update public.landmarks set duration_hours = greatest(0.5, round((distance_km/3.2)::numeric, 1))
where id like 'tiuli-%';

-- duration_hours ל-25 היעדים המקוריים: לפי הזמן המוערך האמיתי שכבר מופיע בכרטיס שלהם
update public.landmarks set duration_hours = v.hours from (values
  ('masada',3),('eingedi',2),('nahaldavid',2.5),('deadsea',1.5),('muhraka',1),
  ('nahalmearot',1.5),('roshhanikra',1.5),('tanur',2),('hermon',6),('kinneret',1),
  ('tzfat',2),('akko',2.5),('caesarea',2),('nahalamud',4),('meron',3),
  ('gamla',2.5),('hula',2),('nimrod',1.5),('ramoncrater',3),('einavdat',2),
  ('avdat',1.5),('coralbeach',2),('tzefahot',5),('oldcityjlm',3),('cityofdavid',2)
) as v(id,hours) where public.landmarks.id = v.id;

-- מחיר: אתרים מוכרים בניהול רשות הטבע והגנים/רשות העתיקות שגובים דמי כניסה
update public.landmarks set price_type = 'paid' where id in
  ('masada','eingedi','nahaldavid','roshhanikra','caesarea','nahalmearot','hula',
   'nimrod','einavdat','avdat','coralbeach','gamla','cityofdavid','hermon');

-- נגישות: אתרים עם רכבל/דרכים סלולות ידועות
update public.landmarks set accessible = true where id in
  ('masada','roshhanikra','caesarea','hula','avdat','coralbeach','kinneret','deadsea');

-- כלב: מותר בחוקי רט"ג ברוב אתרי הטבע/גנים לאומיים — מסמנים true רק בשבילים/רחובות שאינם שמורה/גן לאומי רשמי
update public.landmarks set dog_friendly = true where id in
  ('kinneret','tanur','tzfat','akko','oldcityjlm','nahalamud','meron');

-- מתאים למשפחות: אתרים קלים/מבוססי-תיירות
update public.landmarks set family_friendly = true where id in
  ('masada','eingedi','nahaldavid','deadsea','muhraka','nahalmearot','roshhanikra',
   'tanur','kinneret','tzfat','akko','caesarea','meron','hula','nimrod',
   'ramoncrater','einavdat','avdat','coralbeach','oldcityjlm','cityofdavid');

-- עונה מומלצת: רק היכן שיש המלצה ברורה (חום קיצוני/שלג/נדידת עופות)
update public.landmarks set season = 'winter' where id in
  ('hermon','hula','masada','deadsea','coralbeach','tzefahot');

-- הערה: family_friendly/dog_friendly/accessible/price_type/season על 234 היעדים מ-tiuli
-- נשארים בברירת המחדל (לא ידוע) עד שתרצו לאצור אותם ידנית — לא המצאנו נתונים.
