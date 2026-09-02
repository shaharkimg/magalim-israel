-- Multi-user isolation — Phase 5: Invite links + deep linking
-- הרץ פעם אחת ב-Supabase Dashboard → SQL Editor → New query → Run
--
-- מחליף את מנגנון ההזמנה הגולמי הקיים (`?ref=<user_id>` / `?group=<group_id>` בפרמטרי
-- URL) בקוד-הזמנה קצר, ייעודי, עם תוקף/מגבלת-שימושים/דעיכה. הקישורים הישנים ממשיכים
-- לעבוד (backward compatibility — app.js שומר את הטיפול הישן ב-handleInviteLinks כפי שהוא).

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  invite_type text not null check (invite_type in ('friend','circle')),
  circle_id uuid references public.groups(id) on delete cascade,
  max_uses int,
  uses int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint invites_circle_id_matches_type check (
    (invite_type = 'circle' and circle_id is not null) or
    (invite_type = 'friend' and circle_id is null)
  )
);

alter table public.invites enable row level security;

-- רק היוצר יכול לראות/לנהל את ההזמנות שלו ישירות (רשימת "ההזמנות שלי", ניצול-שימושים
-- נותרים וכו'). תצוגה-מקדימה/מימוש ע"י צד שלישי עוברים דרך שתי הפונקציות למטה בלבד,
-- לא דרך SELECT ישיר על הטבלה — כדי שאי-אפשר יהיה "לרשום" (enumerate) קודי הזמנה על ידי
-- listing, ושלא יהיה אפשר לתמרן uses/is_active ישירות מהלקוח.
create policy "creators can view their own invites"
  on public.invites for select
  using (auth.uid() = created_by);

create policy "users can create invites as themselves"
  on public.invites for insert
  with check (auth.uid() = created_by);

create policy "creators can deactivate their own invites"
  on public.invites for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- ============ תצוגה מקדימה של הזמנה לפי קוד (למשתמש מחובר, לפני שהוא מאשר) ============
-- לא חושפת דבר מעבר לשם המזמין/סוג ההזמנה/שם המעגל (אם רלוונטי) — ולא בכלל אם הקוד
-- לא נמצא/פג תוקף/מוצה, כדי לא לתת מידע-חינם על אילו קודים "כמעט" תקינים.
create or replace function public.get_invite_preview(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  inviter_name text;
  circle_name text;
begin
  select * into inv from public.invites where code = p_code and is_active = true;
  if inv is null then
    return jsonb_build_object('ok', false, 'error', 'invite_not_found');
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'invite_expired');
  end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then
    return jsonb_build_object('ok', false, 'error', 'invite_maxed');
  end if;
  if inv.created_by = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'own_invite');
  end if;
  select name into inviter_name from public.profiles where id = inv.created_by;
  if inv.invite_type = 'circle' then
    select name into circle_name from public.groups where id = inv.circle_id;
  end if;
  return jsonb_build_object('ok', true, 'invite_type', inv.invite_type, 'inviter_name', inviter_name, 'circle_name', circle_name);
end;
$$;

grant execute on function public.get_invite_preview(text) to authenticated;

-- ============ מימוש הזמנה (אחרי אישור מפורש של המשתמש ב-UI) ============
-- פעולה אטומית אחת: מוודאת תוקף, יוצרת friendship מאושרת ישירות (שני הצדדים כבר הביעו
-- הסכמה - המזמין ביצירת/שיתוף הקישור, המוזמן בלחיצת האישור) או חברות פעילה במעגל, לא
-- יוצרת כפילות אם הקשר כבר קיים, ומעדכנת מונה שימושים - הכל בתוך פונקציה אחת כדי שלקוח
-- זדוני לא יוכל להריץ רק חלק מהפעולה (למשל לעדכן uses בלי ליצור קשר, או להיפך).
create or replace function public.redeem_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  select * into inv from public.invites where code = p_code and is_active = true for update;
  if inv is null then
    return jsonb_build_object('ok', false, 'error', 'invite_not_found');
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'invite_expired');
  end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then
    return jsonb_build_object('ok', false, 'error', 'invite_maxed');
  end if;
  if inv.created_by = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'own_invite');
  end if;

  if inv.invite_type = 'friend' then
    insert into public.friendships (requester_id, addressee_id, status, accepted_at)
    values (inv.created_by, auth.uid(), 'accepted', now())
    on conflict (user_low, user_high) do nothing;
  elsif inv.invite_type = 'circle' then
    insert into public.group_members (group_id, user_id, role, status)
    values (inv.circle_id, auth.uid(), 'member', 'active')
    on conflict (group_id, user_id) do nothing;
  end if;

  update public.invites set uses = uses + 1 where id = inv.id;

  return jsonb_build_object('ok', true, 'invite_type', inv.invite_type, 'circle_id', inv.circle_id);
end;
$$;

grant execute on function public.redeem_invite(text) to authenticated;
