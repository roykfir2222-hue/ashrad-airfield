-- Ashrad Airfield - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Drop existing table if re-running
drop table if exists public.queue_entries;

-- Queue entries table
create table public.queue_entries (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  flight_type  text not null check (flight_type in ('independent', 'shared', 'both')),
  duration_min integer not null check (duration_min between 5 and 8),
  position     integer not null,
  status       text not null default 'waiting' check (status in ('waiting', 'flying', 'done')),
  is_active    boolean not null default true,
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
