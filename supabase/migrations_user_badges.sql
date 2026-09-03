-- Core Loop Retention Round A: persist badge-unlock EVENTS (not badge definitions -
-- those stay in the client-side BADGES array, unchanged). BADGES/unlockedBadges() are
-- computed live from visits and have no timestamp for "when" a badge was unlocked, so a
-- friend's activity feed can't show "🏆 X פתח/ה תג" without one. This table exists only to
-- give that moment a durable, friend-visible record - same reuse principle as everything
-- else this session: extend, don't duplicate.

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

alter table public.user_badges enable row level security;

-- אותו עיקרון גישה בדיוק כמו "users can view accessible visits" (migrations_multiuser_phase6.sql) -
-- עצמך / חבר מאושר / חבר-מעגל משותף. לא דפוס חדש, רק אותו כלל על טבלה נוספת.
create policy "users can view accessible badges"
  on public.user_badges for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = user_badges.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = user_badges.user_id))
    )
    or exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = user_badges.user_id
    )
  );

create policy "users can insert their own badge unlocks"
  on public.user_badges for insert
  with check (auth.uid() = user_id);
