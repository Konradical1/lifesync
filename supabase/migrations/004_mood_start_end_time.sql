-- Add start_time and end_time to mood for timeline display
alter table public.mood add column if not exists start_time text;
alter table public.mood add column if not exists end_time text;
