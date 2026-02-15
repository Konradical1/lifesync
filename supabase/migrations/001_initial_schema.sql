-- JournalX2 initial schema for Supabase
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Events table (sleep, food, exercise, meds, other)
create table if not exists public.events (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  date text not null,
  -- Common optional fields
  time text,
  start_time text,
  end_time text,
  description text,
  note text,
  -- Food
  calories int,
  protein int,
  carbs int,
  fat int,
  -- Exercise
  duration int,
  -- Meds
  name text,
  dosage numeric,
  unit text,
  created_at timestamptz default now()
);

-- Journal entries
create table if not exists public.journal_entries (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  date text not null,
  time text not null,
  text text not null,
  created_at timestamptz default now()
);

-- Daily summaries (one per date per user)
create table if not exists public.summaries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  date text not null,
  text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Daily mood (one per date per user)
create table if not exists public.mood (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  date text not null,
  emotion text not null,
  intensity int not null check (intensity >= 1 and intensity <= 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- Row Level Security: users can only access their own data
alter table public.events enable row level security;
alter table public.journal_entries enable row level security;
alter table public.summaries enable row level security;
alter table public.mood enable row level security;

create policy "Users can manage own events"
  on public.events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own journal"
  on public.journal_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own summaries"
  on public.summaries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own mood"
  on public.mood for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes for common queries
create index if not exists idx_events_user_date on public.events(user_id, date);
create index if not exists idx_journal_user_date on public.journal_entries(user_id, date);
create index if not exists idx_summaries_user_date on public.summaries(user_id, date);
create index if not exists idx_mood_user_date on public.mood(user_id, date);
