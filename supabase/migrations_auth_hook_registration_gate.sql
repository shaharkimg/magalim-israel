-- FIX — אכיפת מגבלות הרשמה אמינה בצד השרת, דרך Supabase Auth Hook (לא trigger גולמי).
--
-- התגלה בבדיקה חיה: raise exception מתוך trigger על auth.users לא עוצר את ה-signup
-- ברמת ה-HTTP response של Supabase (מגבלה ידועה של GoTrue) — signup הצליח גם כש-
-- registration_enabled=false. המנגנון הנתמך רשמית הוא "Before User Created" Auth Hook:
-- פונקציית Postgres עם חתימה קבועה (event jsonb -> jsonb) שנקראת ע"י supabase_auth_admin
-- *לפני* יצירת השורה ב-auth.users, ויכולה לחסום עם קוד שגיאה אמיתי שחוזר ללקוח.
--
-- אחרי הרצת ה-SQL הזה, יש להפעיל אותו ידנית ב-Dashboard:
-- Authentication → Hooks → "Before User Created" → לבחור את הפונקציה
-- public.hook_check_registration_gate ולשמור.

create or replace function public.hook_check_registration_gate(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  settings record;
  user_count int;
  invite_code text;
  valid_invite boolean := false;
begin
  select * into settings from public.app_settings where id = 1;

  if settings is null then
    return '{}'::jsonb;
  end if;

  if not settings.registration_enabled then
    return jsonb_build_object(
      'error', jsonb_build_object('message', 'ההרשמה סגורה כרגע.', 'http_code', 403)
    );
  end if;

  if settings.max_users is not null then
    select count(*) into user_count from public.profiles;
    if user_count >= settings.max_users then
      return jsonb_build_object(
        'error', jsonb_build_object('message', 'הגענו למכסת המשתמשים המקסימלית.', 'http_code', 403)
      );
    end if;
  end if;

  if settings.invite_only then
    invite_code := event->'user'->'user_metadata'->>'invite_code';
    if invite_code is not null then
      select exists(
        select 1 from public.invites
        where code = invite_code and is_active = true
          and (expires_at is null or expires_at > now())
          and (max_uses is null or uses < max_uses)
      ) into valid_invite;
    end if;
    if not valid_invite then
      return jsonb_build_object(
        'error', jsonb_build_object('message', 'נדרש קוד הזמנה תקף להרשמה.', 'http_code', 403)
      );
    end if;
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_check_registration_gate(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_check_registration_gate(jsonb) from authenticated, anon, public;

-- handle_new_user() נשארת ליצירת הפרופיל בלבד — האכיפה האמיתית עברה ל-Auth Hook למעלה.
-- הבדיקות שהיו כאן לא חסמו בפועל (זו הייתה בדיוק הבעיה), אז אין טעם להשאיר קוד כפול
-- שיוצר רושם שווא של הגנה.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'מטייל/ת חדש/ה'));
  return new;
end;
$$ language plpgsql security definer set search_path = public;
