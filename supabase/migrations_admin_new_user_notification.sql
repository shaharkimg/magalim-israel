-- התראה למנהלים בלבד על כל משתמש חדש שנרשם.
-- טריגר על יצירת פרופיל (נוצר אוטומטית בכל הרשמה דרך handle_new_user) שמכניס שורת התראה
-- לכל חשבון is_admin. ההתראה מופיעה במסך ההתראות, ו-Webhook ה-Push הקיים על notifications
-- שולח אותה גם כ-Push למכשירים של המנהל שאישרו התראות. משתמשים רגילים לא מקבלים כלום.
-- ה-exception handler מבטיח שתקלה בהתראה לעולם לא תכשיל הרשמה. בטוח להרצה חוזרת.
create or replace function public.notify_admins_new_user()
returns trigger as $$
begin
  begin
    insert into public.notifications (user_id, type, payload)
    select p.id, 'new_user',
      jsonb_build_object('new_user_id', new.id, 'new_user_name', coalesce(new.name, 'מטייל/ת חדש/ה'))
    from public.profiles p
    where p.is_admin = true and p.id <> new.id;
  exception when others then
    raise warning 'notify_admins_new_user failed: %', sqlerrm;
  end;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.notify_admins_new_user() from public, anon, authenticated;

drop trigger if exists on_profile_created_notify_admins on public.profiles;
create trigger on_profile_created_notify_admins
  after insert on public.profiles
  for each row execute procedure public.notify_admins_new_user();
