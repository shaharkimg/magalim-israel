-- "מטיילים עכשיו" - שיתוף אזור כללי (לא מיקום מדויק) עם עוקבים בלבד.
-- טבלה נפרדת מ-profiles בכוונה: profiles ציבורית לקריאה, וכאן הנתון רגיש יותר וצריך RLS מוגבל לעוקבים.
-- כבוי כברירת מחדל (sharing_enabled=false). אין כאן שום עמודת lat/lon - האפליקציה לא אוספת קואורדינטות מדויקות לפיצ'ר הזה כלל.

create table public.travel_status (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  region text,
  sharing_enabled boolean not null default false,
  travel_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.travel_status enable row level security;

create policy "users can view their own travel status"
  on public.travel_status for select
  using (auth.uid() = user_id);

-- עוקבים רואים רק סטטוס ששותף במפורש (sharing_enabled) ושעדיין בתוקף (travel_until) - שניהם נאכפים כאן ברמת ה-DB, לא רק ב-UI
create policy "followers can view shared travel status"
  on public.travel_status for select
  using (
    sharing_enabled = true
    and travel_until > now()
    and exists (
      select 1 from public.follows
      where follower_id = auth.uid() and followee_id = travel_status.user_id
    )
  );

create policy "users can insert their own travel status"
  on public.travel_status for insert
  with check (auth.uid() = user_id);

create policy "users can update their own travel status"
  on public.travel_status for update
  using (auth.uid() = user_id);

create policy "users can delete their own travel status"
  on public.travel_status for delete
  using (auth.uid() = user_id);
