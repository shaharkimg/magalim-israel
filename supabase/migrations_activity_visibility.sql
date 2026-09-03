-- App Essentials Phase 0A, Round 2 — Privacy Center: שליטת משתמש על מי רואה את הפעילות
-- שלו. toggle יחיד (לא 4 נפרדים ל-check-ins/photos/achievements) כי כולם כבר עוברים דרך
-- אותה שאילתת visits בדיוק - אין נתיב שאילתה נפרד ל"רק תמונות"/"רק הישגים" היום.
--
-- ברירת המחדל 'friends_groups' שומרת בדיוק על ההתנהגות הקיימת (Phase 6) - זה toggle
-- שמאפשר לצמצם, לא מרחיב מעבר למה שכבר היה.

alter table public.profiles
  add column if not exists activity_visibility text not null default 'friends_groups'
    check (activity_visibility in ('private','friends','friends_groups'));

-- security definer, אותו דפוס מדויק כמו is_group_member()/current_profile_is_admin()
-- (migrations_fix_rls_recursion.sql) - מונע recursion כי הפונקציה עוקפת RLS פנימית.
create or replace function public.visit_visible_to(target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    auth.uid() = target_user_id
    or (
      (select activity_visibility from public.profiles where id = target_user_id) in ('friends','friends_groups')
      and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and ((f.requester_id = auth.uid() and f.addressee_id = target_user_id)
            or (f.addressee_id = auth.uid() and f.requester_id = target_user_id))
      )
    )
    or (
      (select activity_visibility from public.profiles where id = target_user_id) = 'friends_groups'
      and exists (
        select 1 from public.group_members gm1
        join public.group_members gm2 on gm1.group_id = gm2.group_id
        where gm1.user_id = auth.uid() and gm2.user_id = target_user_id
      )
    );
$$;
grant execute on function public.visit_visible_to(uuid) to authenticated;

-- מחליפים את מדיניות ה-SELECT הקשיחה (Phase 6) בקריאה ל-visit_visible_to() - likes
-- לא צריכה שינוי משלה, כי ה-subquery שלה ל-visits כבר יורש את ה-RLS החדשה אוטומטית.
drop policy if exists "users can view accessible visits" on public.visits;
create policy "users can view accessible visits"
  on public.visits for select
  using (public.visit_visible_to(user_id));
