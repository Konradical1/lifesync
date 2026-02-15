-- Add updated_at to summaries and mood for tracking when records were last modified.
-- Run in Supabase SQL Editor if you already ran 001_initial_schema.sql

alter table public.summaries
  add column if not exists updated_at timestamptz default now();

alter table public.mood
  add column if not exists updated_at timestamptz default now();

-- Trigger to auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists summaries_updated_at on public.summaries;
create trigger summaries_updated_at
  before update on public.summaries
  for each row execute function update_updated_at();

drop trigger if exists mood_updated_at on public.mood;
create trigger mood_updated_at
  before update on public.mood
  for each row execute function update_updated_at();
