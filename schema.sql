-- ByteBell by AkihiroLabs — Phase 2 schema
-- Run this in Supabase: SQL Editor → New query → paste → Run.

-- ---------- blocks ----------
create table if not exists public.blocks (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  place       text check (char_length(place) <= 60),
  days        smallint[] not null check (array_length(days, 1) between 1 and 7),
  start_time  time not null,
  end_time    time not null,
  color       text not null default 'navy',
  alert_min   smallint check (alert_min >= 0 and alert_min <= 1440),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists blocks_user_idx on public.blocks(user_id);

alter table public.blocks enable row level security;

drop policy if exists blocks_select_own on public.blocks;
create policy blocks_select_own on public.blocks
  for select using (auth.uid() = user_id);

drop policy if exists blocks_insert_own on public.blocks;
create policy blocks_insert_own on public.blocks
  for insert with check (auth.uid() = user_id);

drop policy if exists blocks_update_own on public.blocks;
create policy blocks_update_own on public.blocks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists blocks_delete_own on public.blocks;
create policy blocks_delete_own on public.blocks
  for delete using (auth.uid() = user_id);

-- ---------- profiles (time zone + language; Phase 3 notifications need the time zone) ----------
create table if not exists public.profiles (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  tz          text not null default 'Asia/Tokyo',
  lang        text not null default 'en',
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- push_subscriptions (Phase 3) ----------
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  updated_at  timestamptz not null default now()
);

create index if not exists push_subs_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;

drop policy if exists push_subs_own on public.push_subscriptions;
create policy push_subs_own on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- notif_log (dedup — prevents double-firing) ----------
create table if not exists public.notif_log (
  id         bigint generated always as identity primary key,
  log_key    text not null unique,
  user_id    uuid references auth.users(id) on delete cascade,
  block_id   uuid,
  created_at timestamptz not null default now()
);
-- Auto-purge old log entries after 2 days
create index if not exists notif_log_created_idx on public.notif_log(created_at);

-- ---------- pg_cron: fire edge function every minute ----------
-- Run AFTER deploying the edge function.
-- Replace <YOUR-PROJECT-REF> with your Supabase project ref (found in Settings → General).
-- select cron.schedule(
--   'bytebell-notifications',
--   '* * * * *',
--   $$
--   select net.http_post(
--     url := 'https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/send-notifications',
--     headers := '{"Authorization":"Bearer <YOUR-ANON-KEY>"}'::jsonb
--   );
--   $$
-- );
