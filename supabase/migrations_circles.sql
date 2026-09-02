-- Multi-user isolation — Phase 4: Circles (מעגלים)
-- הרץ פעם אחת ב-Supabase Dashboard → SQL Editor → New query → Run
--
-- לפי ההנחיה המפורשת בבקשה (סעיף 33): לא נבנית טבלת circles/circle_members מקבילה.
-- "מעגל" = הרחבה של groups/group_members הקיימים, שכבר עושים בדיוק את זה תחת שם אחר.

-- ============ הרחבת groups ============
alter table public.groups
  add column if not exists description text,
  add column if not exists visibility text not null default 'private' check (visibility in ('private')),
  add column if not exists invite_code text;

-- ============ הרחבת group_members ============
alter table public.group_members
  add column if not exists role text not null default 'member' check (role in ('owner','admin','member')),
  add column if not exists status text not null default 'active' check (status in ('active','pending'));

-- backfill: היוצר של כל קבוצה קיימת מקבל role=owner בשורת החברות שלו עצמו
update public.group_members gm
set role = 'owner'
from public.groups g
where g.id = gm.group_id and g.created_by = gm.user_id and gm.role <> 'owner';

-- ============ נעילת פרטיות — group_members ============
-- זה ה-fix הקריטי לתרחיש 3 בבקשה: מי שאינו חבר במעגל לא יכול לקבל את רשימת החברים שלו,
-- גם אם הוא מכיר את ה-group_id. "using(true)" הקודם היה מאפשר את זה לכל אחד עם ה-anon key.
drop policy if exists "group members are publicly readable" on public.group_members;

create policy "members can view their circle's roster"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
    )
  );

-- ============ נעילת פרטיות — groups ============
-- מי שאינו חבר לא יכול לקרוא את שורת ה-groups המלאה (כולל created_by וכו').
drop policy if exists "groups are publicly readable" on public.groups;

create policy "members can view their own circles"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
  );

-- ============ תצוגה מקדימה בעת הצטרפות (עד ש-Phase 5 יביא invite codes אמיתיים) ============
-- כדי שמשתמש שמקבל קישור הצטרפות (עדיין ה-URL הגולמי עם group_id, כמו היום) יוכל לראות את
-- שם המעגל *לפני* שהוא חבר בו, בלי לפתוח מחדש קריאה ציבורית על כל טבלת groups. הפונקציה
-- חושפת רק id+name (לא created_by, לא visibility, לא invite_code) - לא ניתן לדלות ממנה
-- מידע רגיש, וה-group_id עצמו הוא UUID רנדומלי לא-ניתן-לניחוש (בשונה מקוד הזמנה קצר,
-- שידרוש הגנת אנומרציה/תפוגה ייעודית שתיבנה ב-Phase 5).
create or replace function public.get_group_preview(gid uuid)
returns table(id uuid, name text)
language sql
security definer
set search_path = public
as $$
  select id, name from public.groups where id = gid;
$$;

grant execute on function public.get_group_preview(uuid) to authenticated;
