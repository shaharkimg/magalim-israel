-- החידה השבועית: התראה לכל המשתמשים כשחידה חדשה מתפרסמת (שישי 08:00 שעון ישראל).
--
-- איך זה עובד: notify_weekly_mystery() יוצרת שורה ב-notifications לכל משתמש. ה-Webhook
-- הקיים על notifications (push_on_notification -> send-push) שולח מזה התראת פוש למי שהפעיל
-- התראות במכשיר; כולם רואים אותה גם במסך ההתראות באפליקציה.
--
-- - פעם אחת לכל חידה: notified_at נרשם באותה טרנזקציה, והשורה ננעלת (for update), כך שגם
--   הרצות חופפות לא שולחות פעמיים.
-- - רק חידה שפורסמה ב-3 השעות האחרונות: אם התזמון הופעל באיחור, לא שולחים "חידה חדשה" על
--   חידה בת יומיים.
-- - מכבדת את העדפות ההתראות: enabled=false או mystery=false -> לא נוצרת התראה. ברירת המחדל
--   (גם למשתמשים קיימים, שאין להם המפתח) היא כן.
-- - התזמון (pg_cron): כל 10 דקות, בשישי בין 04:00 ל-08:59 UTC. 08:00 בישראל הוא 06:00 UTC
--   בחורף ו-05:00 UTC בקיץ, כך שהחלון מכסה את שניהם, וההתראה יוצאת בין 08:00 ל-08:10.
-- בטוח להרצה חוזרת.

alter table public.weekly_mysteries add column if not exists notified_at timestamptz;

create or replace function public.notify_weekly_mystery()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.weekly_mysteries%rowtype;
  v_count integer := 0;
begin
  select * into m from public.weekly_mysteries
    where release_at <= now() and release_at > now() - interval '3 hours' and notified_at is null
    order by release_at desc limit 1
    for update skip locked;
  if not found then
    return 0;
  end if;

  insert into public.notifications (user_id, type, payload)
  select p.id, 'weekly_mystery', jsonb_build_object('mystery_id', m.id)
  from public.profiles p
  where coalesce((p.notification_prefs->>'enabled')::boolean, true)
    and coalesce((p.notification_prefs->>'mystery')::boolean, true);
  get diagnostics v_count = row_count;

  update public.weekly_mysteries set notified_at = now() where id = m.id;
  return v_count;
end;
$$;
-- רק התזמון (שרץ כ-postgres) מפעיל אותה - לא לקוח
revoke execute on function public.notify_weekly_mystery() from public, anon, authenticated;

-- pg_cron קיים ב-Supabase; ב-Postgres רגיל (בדיקות) הוא לא זמין, ואז מדלגים על התזמון בלבד.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
    -- cron.schedule עם שם קיים מעדכן את המשימה במקום ליצור כפולה
    execute $q$select cron.schedule('weekly-mystery-notify', '*/10 4-8 * * 5', 'select public.notify_weekly_mystery()')$q$;
  else
    raise notice 'pg_cron is not available here - the weekly mystery notification is not scheduled';
  end if;
end $$;
