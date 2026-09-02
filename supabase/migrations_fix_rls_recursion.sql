-- CRITICAL FIX — infinite recursion (Postgres error 42P17) בשתי מדיניות RLS.
-- התגלה בזמן בדיקת Phase 10 החיה: כל טעינת נתונים למשתמש מחובר נכשלה עם
-- "infinite recursion detected in policy for relation group_members", וכל ניסיון
-- לעדכן פרופיל עצמי (שם/avatar/onboarding) נכשל עם אותה שגיאה על profiles.
--
-- שורש הבעיה: מדיניות RLS על טבלה T שכוללת subquery המתייחס *לאותה שורה* בטבלה T
-- עצמה (correlated self-reference) גורמת ל-Postgres לזהות מעגליות ולזרוק שגיאה —
-- זו מלכודת מוכרת. הפתרון: להעביר את הבדיקה דרך פונקציית SECURITY DEFINER, שהריצה
-- הפנימית שלה (כבעלים של הטבלה) עוקפת RLS לגמרי ושוברת את המעגליות — בדיוק אותו
-- דפוס שכבר עובד בהצלחה ב-get_group_preview/get_invite_preview/redeem_invite וכו'.

-- ============ group_members: "members can view their circle's roster" ============
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;
grant execute on function public.is_group_member(uuid) to authenticated;

drop policy if exists "members can view their circle's roster" on public.group_members;
create policy "members can view their circle's roster"
  on public.group_members for select
  using (public.is_group_member(group_id));

-- groups כבר שאלה subquery על group_members (טבלה אחרת) — לא היה בה recursion עצמי,
-- אבל היא נכשלה בשרשרת כי group_members עצמה נכשלה. מעבירים גם אותה דרך אותה פונקציה
-- לעקביות ולביטחון נוסף.
drop policy if exists "members can view their own circles" on public.groups;
create policy "members can view their own circles"
  on public.groups for select
  using (public.is_group_member(id));

-- ============ profiles: "users can update their own profile" ============
create or replace function public.current_profile_is_admin()
returns boolean language sql security definer stable set search_path = public
as $$ select is_admin from public.profiles where id = auth.uid(); $$;

create or replace function public.current_profile_account_status()
returns text language sql security definer stable set search_path = public
as $$ select account_status from public.profiles where id = auth.uid(); $$;

create or replace function public.current_profile_bonus_invites()
returns int language sql security definer stable set search_path = public
as $$ select bonus_invites from public.profiles where id = auth.uid(); $$;

grant execute on function public.current_profile_is_admin() to authenticated;
grant execute on function public.current_profile_account_status() to authenticated;
grant execute on function public.current_profile_bonus_invites() to authenticated;

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = public.current_profile_is_admin()
    and account_status = public.current_profile_account_status()
    and bonus_invites = public.current_profile_bonus_invites()
  );

-- ============ profiles: "admins can update any profile" (חיזוק מונע, אותה סכנה) ============
create or replace function public.is_admin_user()
returns boolean language sql security definer stable set search_path = public
as $$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false); $$;
grant execute on function public.is_admin_user() to authenticated;

drop policy if exists "admins can update any profile" on public.profiles;
create policy "admins can update any profile"
  on public.profiles for update
  using (public.is_admin_user())
  with check (public.is_admin_user());
