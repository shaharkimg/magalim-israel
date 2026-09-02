-- Multi-user isolation — Phase 7: Admin Dashboard + registration limits
-- הרץ פעם אחת ב-Supabase Dashboard → SQL Editor → New query → Run

-- ============ app_settings (טבלת singleton — שורה אחת בלבד, id קבוע 1) ============
create table public.app_settings (
  id int primary key default 1,
  registration_enabled boolean not null default true,
  invite_only boolean not null default false,
  max_users int,
  waitlist_enabled boolean not null default false,
  default_invites_per_user int not null default 3,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

alter table public.app_settings enable row level security;

-- קריאה ציבורית בכוונה: מסך ההרשמה עצמו (לפני שיש session) צריך לדעת אם הרשמה פתוחה/
-- invite-only/מלאה. אין כאן שום מידע רגיש, רק דגלי קונפיגורציה.
create policy "app settings are publicly readable"
  on public.app_settings for select
  using (true);

create policy "admins can update app settings"
  on public.app_settings for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ============ profiles: bonus_invites + הרשאת admin לעדכן משתמשים אחרים ============
alter table public.profiles
  add column if not exists bonus_invites int not null default 0;

-- ה-with-check העצמי מ-Phase 2 חוסם is_admin/account_status - מרחיבים אותו גם ל-
-- bonus_invites כדי שמשתמש לא יוכל להעניק לעצמו הזמנות בונוס.
drop policy if exists "users can update their own profile" on public.profiles;

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = (select p.is_admin from public.profiles p where p.id = profiles.id)
    and account_status = (select p.account_status from public.profiles p where p.id = profiles.id)
    and bonus_invites = (select p.bonus_invites from public.profiles p where p.id = profiles.id)
  );

-- admin יכול לעדכן כל פרופיל (is_admin/account_status/bonus_invites של משתמש אחר) - זה
-- מה שמאפשר "תן למשתמש הזה עוד הזמנות" מהדשבורד.
create policy "admins can update any profile"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ============ אכיפת מגבלות הרשמה — ברמת ה-DB, לא רק UI ============
-- מרחיבים את handle_new_user() הקיים (טריגר על auth.users) כדי לבדוק registration_enabled/
-- invite_only/max_users *לפני* יצירת הפרופיל. אם התנאי נכשל, הפונקציה זורקת exception,
-- מה שגורם לכל ה-signUp() כולו (כולל שורת auth.users) להתבטל בטרנזקציה - לקוח זדוני לא
-- יכול לעקוף את זה כי זה לא תלוי כלל בקוד הצד-לקוח.
-- קוד ההזמנה (אם invite_only פעיל) מגיע דרך raw_user_meta_data->>'invite_code' - האפליקציה
-- מעבירה אותו כ-options.data ב-signUp() כשיש קוד הזמנה ממתין. שימו לב: זה רק *מוודא תוקף*
-- ולא "מממש" את ההזמנה (uses לא עולה כאן) - המימוש עדיין קורה דרך redeem_invite() הקיים
-- אחרי ההרשמה, כדי לא לספור פעמיים.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  settings record;
  user_count int;
  invite_code text;
  valid_invite boolean := false;
begin
  select * into settings from public.app_settings where id = 1;

  if settings is not null then
    if not settings.registration_enabled then
      raise exception 'registration_disabled';
    end if;

    if settings.max_users is not null then
      select count(*) into user_count from public.profiles;
      if user_count >= settings.max_users then
        raise exception 'registration_full';
      end if;
    end if;

    if settings.invite_only then
      invite_code := new.raw_user_meta_data->>'invite_code';
      if invite_code is not null then
        select exists(
          select 1 from public.invites
          where code = invite_code and is_active = true
            and (expires_at is null or expires_at > now())
            and (max_uses is null or uses < max_uses)
        ) into valid_invite;
      end if;
      if not valid_invite then
        raise exception 'invite_required';
      end if;
    end if;
  end if;

  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'מטייל/ת חדש/ה'));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============ סטטיסטיקות לוח ניהול ============
-- פונקציה אחת שבודקת admin *פנימית* (לא סומכת על RLS חיצוני) ומחזירה הכל יחד - נמנעים
-- מ-6 queries נפרדים בצד הלקוח שכל אחד מהם צריך להיות מוגן בנפרד.
create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_adm boolean;
  result jsonb;
begin
  select is_admin into is_adm from public.profiles where id = auth.uid();
  if not coalesce(is_adm, false) then
    raise exception 'not_authorized';
  end if;
  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_users', (select count(*) from public.profiles where account_status = 'active'),
    'new_users_week', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'total_circles', (select count(*) from public.groups),
    'total_checkins', (select count(*) from public.visits),
    'total_invites', (select count(*) from public.invites)
  ) into result;
  return result;
end;
$$;
grant execute on function public.get_admin_stats() to authenticated;
