DROP TABLE IF EXISTS public.queue_entries;

CREATE TABLE public.queue_entries (
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

CREATE INDEX idx_queue_active_position ON public.queue_entries (position) WHERE is_active = true;

ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON public.queue_entries
  FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
