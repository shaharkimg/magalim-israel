// פרטי החיבור לפרויקט Supabase שלך.
// ה-anon key בטוח לחשיפה בצד הלקוח — הוא מוגן ע"י כללי ה-RLS שהוגדרו ב-schema.sql.
// אין להכניס כאן את ה-service_role key בשום מצב.
export const SUPABASE_URL = "https://jkyeaewedkzkacjndumd.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpreWVhZXdlZGt6a2Fjam5kdW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNjg2MzUsImV4cCI6MjEwMzg0NDYzNX0.Deuz_9FlFdMJSuQsgisndfqiIyFXuNWknV2JObRsFQM";

// המפתח הציבורי של VAPID עבור Web Push. ציבורי מעצם הגדרתו - הדפדפן שולח אותו לשירות
// ה-Push כדי לזהות מי מורשה לשלוח לנקודת-הקצה הזו. המפתח הפרטי התואם נשמר כסוד של
// ה-Edge Function ב-Supabase בלבד, ולעולם לא כאן ולא בריפו.
export const VAPID_PUBLIC_KEY = "BAL6PMelRHVjvx9BEVTbhRHCcjWox2Q87z87ldMVu3-kGQSZm_MqGWb2cledV9QnqQjgRD4xxGV0xr8BlnQd4ho";
