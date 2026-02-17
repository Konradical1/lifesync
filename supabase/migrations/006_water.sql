-- Water entries (one row per logged drink)
create table if not exists public.water (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  date text not null,
  time text not null,
  oz int not null,
  created_at timestamptz default now()
);

alter table public.water enable row level security;

create policy "Users can manage own water"
  on public.water for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_water_user_date on public.water(user_id, date);

-- Add water_goal_oz to profile
alter table public.profile add column if not exists water_goal_oz int;
