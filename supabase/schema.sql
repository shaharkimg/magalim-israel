-- מגלים את ישראל — סכמת מסד נתונים ל-Supabase
-- הרץ את הקובץ הזה פעם אחת ב-Supabase Dashboard → SQL Editor → New query → Run

-- ============ EXTENSIONS ============
create extension if not exists "pgcrypto";

-- ============ PROFILES ============
-- שורה אחת לכל משתמש רשום, נוצרת אוטומטית עם הרשמה (טריגר בהמשך)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'מטייל/ת חדש/ה',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- יצירת פרופיל אוטומטית עם כל הרשמה חדשה
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'מטייל/ת חדש/ה'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ LANDMARKS (נתוני ייחוס - קריאה בלבד מהלקוח) ============
create table public.landmarks (
  id text primary key,
  name text not null,
  description text not null,
  category text not null,
  difficulty text not null,
  region text not null,
  lat double precision not null,
  lon double precision not null,
  duration text not null,
  distance_km numeric not null,
  points int not null,
  base_visits int not null default 0
);

alter table public.landmarks enable row level security;

create policy "landmarks are publicly readable"
  on public.landmarks for select
  using (true);

-- ============ VISITS (צ'ק-אינים) ============
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  landmark_id text not null references public.landmarks(id) on delete cascade,
  visited_at timestamptz not null default now(),
  photo_url text,
  points_awarded int not null,
  unique (user_id, landmark_id)
);

alter table public.visits enable row level security;

create policy "visits are publicly readable"
  on public.visits for select
  using (true);

create policy "users can insert their own visits"
  on public.visits for insert
  with check (auth.uid() = user_id);

create policy "users can delete their own visits"
  on public.visits for delete
  using (auth.uid() = user_id);

-- ============ WISHLIST (פרטי לכל משתמש) ============
create table public.wishlist (
  user_id uuid not null references public.profiles(id) on delete cascade,
  landmark_id text not null references public.landmarks(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, landmark_id)
);

alter table public.wishlist enable row level security;

create policy "users manage their own wishlist"
  on public.wishlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============ FOLLOWS (חברים) ============
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

create policy "follows are publicly readable"
  on public.follows for select
  using (true);

create policy "users manage their own follows"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ============ LIKES (על צ'ק-אינים בפיד) ============
create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  visit_id uuid not null references public.visits(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, visit_id)
);

alter table public.likes enable row level security;

create policy "likes are publicly readable"
  on public.likes for select
  using (true);

create policy "users manage their own likes"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "users can unlike"
  on public.likes for delete
  using (auth.uid() = user_id);

-- ============ STORAGE (תמונות צ'ק-אין) ============
insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', true)
on conflict (id) do nothing;

create policy "checkin photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'checkin-photos');

create policy "users can upload their own checkin photos"
  on storage.objects for insert
  with check (bucket_id = 'checkin-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own checkin photos"
  on storage.objects for delete
  using (bucket_id = 'checkin-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============ SEED: 25 יעדים ============
insert into public.landmarks (id,name,description,category,difficulty,region,lat,lon,duration,distance_km,points,base_visits) values
('masada','מצדה','מבצר הורדוס הניצב על צוק מדברי מעל ים המלח, אתר מורשת עולמית של אונסק"ו ומקום עמידתם האחרונה של המורדים בעת המרד הגדול ברומאים.','archaeology','hard','deadsea',31.3157,35.3529,'3 שעות',4.5,50,15420),
('eingedi','עין גדי','שמורת טבע מדברית עם מעיינות מים מתוקים היורדים אל ים המלח, ובית גידול טבעי ליעלים ולשפני סלע.','reserves','easy','deadsea',31.4618,35.3822,'2 שעות',2.8,10,22100),
('nahaldavid','נחל דוד','מסלול נחל עם בריכות טבעיות ומפל מים בלב שמורת עין גדי, אחד המסלולים המבוקשים במדבר יהודה.','water','medium','deadsea',31.4630,35.3850,'2.5 שעות',3.2,25,19800),
('deadsea','חוף עין בוקק','רחצה בים המלח — הנקודה הנמוכה ביותר על פני כדור הארץ, מוכרת במי המלח הרוויים ובבוץ המינרלי.','water','easy','deadsea',31.2000,35.3667,'1.5 שעות',1,10,31000),
('muhraka','מוחרקה','תצפית פסגה על רכס הכרמל הצופה אל עמק יזרעאל והגליל התחתון, מזוהה עם סיפור אליהו הנביא.','viewpoints','medium','north',32.7325,35.0454,'1 שעה',1.5,25,8700),
('nahalmearot','נחל מערות','מערות פרהיסטוריות בהן התגלו שרידי אדם קדום, אתר מורשת עולמית בלב רכס הכרמל.','archaeology','easy','north',32.6667,34.9500,'1.5 שעות',1.2,10,12300),
('roshhanikra','ראש הנקרה','מערות גיר לבנות בגבול הצפוני, נגישות ברכבל תלולת מדרון מעל צוקים היורדים אל הים.','viewpoints','easy','north',33.0975,35.1058,'1.5 שעות',0.8,10,17600),
('tanur','מפל תנור','מפל המים הגבוה בישראל, בנחל עיון הזורם מיער עירוני שופע צמחייה בגבול הלבנון.','water','easy','north',33.2075,35.5722,'2 שעות',3.5,10,9400),
('hermon','הר החרמון','ההר היחיד בישראל עם כיסוי שלג עונתי קבוע, ומסלולי טיפוס מאתגרים לעבר הפסגה.','mountains','extreme','north',33.2988,35.7666,'6 שעות',8,100,4100),
('kinneret','חוף טבריה','טיילת וחופי רחצה על שפת הכנרת, מקור המים המתוקים הגדול ביותר בישראל.','water','easy','north',32.7922,35.5312,'1 שעה',1,10,26400),
('tzfat','העיר העתיקה בצפת','סמטאות אבן ברובע האמנים והמקובלים, אחת מארבע ערי הקודש ומרכז חשוב לקבלה.','urban','easy','north',32.9646,35.4960,'2 שעות',1.5,10,15200),
('akko','העיר העתיקה בעכו','מבצר צלבני תת-קרקעי וחומות עות''מאניות, אתר מורשת עולמית על חוף הים בגליל המערבי.','heritage','easy','north',32.9281,35.0818,'2.5 שעות',2,10,13900),
('caesarea','קיסריה','נמל רומי עתיק, אמפיתיאטרון וחומות צלבניות משוחזרות על חוף הים התיכון.','archaeology','easy','center',32.5000,34.8913,'2 שעות',1.8,10,16700),
('nahalamud','נחל עמוד','מסלול נחל היסטורי בין צוקי הגליל התחתון, נחשב לאחד ממסלולי הנחלים היפים בארץ.','nature','medium','north',32.8833,35.4667,'4 שעות',6,25,7200),
('meron','הר מירון','ההר הגבוה בגליל, עם מסלולי הליכה ותצפית פנורמית ותורן שידור בפסגה.','mountains','medium','north',32.9878,35.4111,'3 שעות',5,25,6800),
('gamla','גמלא','עיר יהודית עתיקה על רכס תלול בגולן, המכונה "מצדה של הצפון", ומקום קינון לנשרים.','archaeology','medium','north',32.9047,35.7469,'2.5 שעות',3.7,25,9100),
('hula','שמורת החולה','שמורת אגם וביצה המשמשת תחנת עצירה למיליוני עופות נודדים פעמיים בשנה.','reserves','easy','north',33.0833,35.6000,'2 שעות',2.5,10,11400),
('nimrod','מבצר נמרוד','מצודה איובית-ממלוכית עצומה על שלוחות החרמון, ששלטה על ציר הדרך לדמשק.','heritage','medium','north',33.2494,35.7128,'1.5 שעות',1,25,8300),
('ramoncrater','מכתש רמון','המכתש הגדול בעולם מסוגו, עם נופי מדבר דרמטיים ומגוון מסלולי ג''יפים ורגל.','mountains','medium','south',30.6094,34.8017,'3 שעות',4,25,14500),
('einavdat','עין עבדת','קניון מדברי עם מפל מים ובריכות טבעיות בלב מכתש הנקרות, נחל הזורם כל השנה.','water','medium','south',30.7961,34.7722,'2 שעות',2.2,25,10600),
('avdat','עבדת','עיר נבטית עתיקה על דרך הבשמים, אתר מורשת עולמית במדבר הנגב מתקופת שיירות התבלינים.','archaeology','easy','south',30.7886,34.7719,'1.5 שעות',1.3,10,6900),
('coralbeach','חוף האלמוגים אילת','שונית אלמוגים טבעית וססגונית, פתוחה לצלילה ולשנורקלינג במפרץ אילת.','water','easy','eilat',29.5033,34.9167,'2 שעות',0.5,10,12800),
('tzefahot','הר צפחות','פסגה מדברית עם אחת התצפיות המרהיבות בישראל, אל מפרץ אילת ושלוש מדינות שכנות.','mountains','extreme','eilat',29.5470,34.9330,'5 שעות',7,100,3400),
('oldcityjlm','העיר העתיקה בירושלים','הכותל המערבי ורבעי העיר העתיקה — מוקד קדושה עבור שלוש דתות ולב ההיסטוריה של ירושלים.','religious','easy','jerusalem',31.7767,35.2345,'3 שעות',2,10,41200),
('cityofdavid','עיר דוד','האתר הארכיאולוגי שבו נוסדה ירושלים הקדומה, כולל מנהרות מים תת-קרקעיות מתקופת המקרא.','archaeology','medium','jerusalem',31.7739,35.2354,'2 שעות',1,25,9800);
