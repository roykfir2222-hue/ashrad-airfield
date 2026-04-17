-- Ashrad Airfield - Supabase Schema
-- Run this in your Supabase SQL Editor (full reset)

-- Drop existing table if re-running
drop table if exists public.queue_entries;

-- Queue entries table
create table public.queue_entries (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  flight_modes text[] not null default array['independent'],
  duration_min integer not null check (duration_min between 1 and 60),
  position     integer not null,
  status       text not null default 'waiting' check (status in ('waiting', 'flying', 'done')),
  is_active    boolean not null default true,
  is_verified  boolean not null default false,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz
);

-- Index for ordered queue reads
create index idx_queue_active_position on public.queue_entries (position) where is_active = true;

-- Enable Row Level Security (open for this app - no auth)
alter table public.queue_entries enable row level security;

create policy "Allow all operations" on public.queue_entries
  for all using (true) with check (true);

-- Enable Realtime
alter publication supabase_realtime add table public.queue_entries;


-- ============================================================
-- MIGRATION (if you already have data and want to keep it):
-- Run these commands instead of the DROP + CREATE above
-- ============================================================

-- Step 1: Add new column
-- ALTER TABLE public.queue_entries
--   ADD COLUMN IF NOT EXISTS flight_modes text[] NOT NULL DEFAULT array['independent'];

-- Step 2: Migrate existing data
-- UPDATE public.queue_entries
--   SET flight_modes = ARRAY[flight_type];

-- Step 3: Update duration check (allows up to 60 min for combined modes)
-- ALTER TABLE public.queue_entries
--   DROP CONSTRAINT IF EXISTS queue_entries_duration_min_check;
-- ALTER TABLE public.queue_entries
--   ADD CONSTRAINT queue_entries_duration_min_check CHECK (duration_min BETWEEN 1 AND 60);

-- Step 4: Drop old column
-- ALTER TABLE public.queue_entries
--   DROP COLUMN IF EXISTS flight_type;
