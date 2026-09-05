-- Gamification & Progression Overhaul, Phase 1 (Foundation) - שתי טבלאות תוספתיות
-- קטנות, בלי לגעת ב-visits/landmarks הקיימים. מטרתן לתת ל"XP-בסיס רק בכיבוש ראשון"
-- ול"בונוסים חד-פעמיים" דה-דופ אמיתי ברמת ה-DB (unique constraint + on-conflict-do-nothing),
-- לא רק דגל-בזיכרון שדאבל-קליק/רענון יכולים לעקוף. אותו עיקרון-reuse כמו user_badges
-- (migrations_user_badges.sql) - טבלת-אירועים קטנה ליד visits, לא מחליפה אותה.
--
-- landmark_conquests: שורה אחת בדיוק לכל (user,landmark) שנכבש אי-פעם - ה-PK עצמו הוא
-- מנגנון-הדה-דופ (insert עם on conflict do nothing; אם השורה נכנסה בפועל = כיבוש ראשון,
-- מוענק XP; אם קונפליקט = ביקור חוזר, 0). difficulty_at_conquest הוא snapshot - לא נגזר
-- מ-landmarks.difficulty בזמן-קריאה - כדי ששינוי-קושי עתידי ליעד לא ישנה רטרואקטיבית
-- XP שכבר הוענק (per spec: "אל תשנה רטרואקטיבית XP אם קושי משתנה בעתיד").
create table public.landmark_conquests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  landmark_id text not null references public.landmarks(id) on delete cascade,
  xp_awarded integer not null,
  difficulty_at_conquest text not null,
  conquered_at timestamptz not null default now(),
  primary key (user_id, landmark_id)
);

alter table public.landmark_conquests enable row level security;

-- אותה נראות בדיוק כמו user_badges (עצמי/חבר-מאושר/חבר-מעגל) - נדרש כדי שהליברבורד
-- יוכל להציג "יעדים שנכבשו" של חברים, לא רק XP-כולל.
create policy "users can view accessible conquests"
  on public.landmark_conquests for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = landmark_conquests.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = landmark_conquests.user_id))
    )
    or exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = landmark_conquests.user_id
    )
  );

create policy "users can insert their own conquests"
  on public.landmark_conquests for insert
  with check (auth.uid() = user_id);

-- xp_bonus_grants: אירועי-בונוס חד-פעמיים (יעד-ראשון/אזור-חדש/קטגוריה-חדשה/השלמת-אוסף/
-- אבני-דרך-אזוריות). bonus_type+source_id יחד הם מפתח-האידמפוטנטיות (source_id הוא
-- למשל שם-אזור/שם-קטגוריה/מזהה-אוסף לפי סוג הבונוס; '' - לא null - עבור בונוס שקיים
-- פעם אחת לכל משתמש כמו "יעד ראשון בכלל". חשוב: source_id מוגדר NOT NULL בכוונה -
-- ב-Postgres כל NULL נחשב שונה מכל NULL אחר לצורך unique constraint, כך ש-NULL היה
-- שובר את האידמפוטנטיות בדיוק לבונוסים שהכי צריכים אותה (ניתן היה להעניק "יעד ראשון"
-- פעמים רבות). '' הוא ערך אמיתי ושווה-לעצמו, אז ה-unique עובד נכון.
create table public.xp_bonus_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bonus_type text not null,
  source_id text not null default '',
  xp_awarded integer not null,
  granted_at timestamptz not null default now(),
  unique (user_id, bonus_type, source_id)
);

alter table public.xp_bonus_grants enable row level security;

create policy "users can view accessible bonus grants"
  on public.xp_bonus_grants for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = xp_bonus_grants.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = xp_bonus_grants.user_id))
    )
    or exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = xp_bonus_grants.user_id
    )
  );

create policy "users can insert their own bonus grants"
  on public.xp_bonus_grants for insert
  with check (auth.uid() = user_id);
