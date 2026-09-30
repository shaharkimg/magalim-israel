-- חיזוק: פונקציות לוח הניהול כבר בודקות is_admin בפנים (raise 'not_authorized'), אבל ברירת
-- המחדל של Postgres נותנת EXECUTE ל-PUBLIC (וכך ל-anon). שכבת הגנה נוספת: רק authenticated.
-- בטוח להרצה חוזרת.
revoke execute on function public.get_admin_stats() from public, anon;
revoke execute on function public.get_admin_users_list(int) from public, anon;
revoke execute on function public.get_event_counts() from public, anon;
grant execute on function public.get_admin_stats() to authenticated;
grant execute on function public.get_admin_users_list(int) to authenticated;
grant execute on function public.get_event_counts() to authenticated;
