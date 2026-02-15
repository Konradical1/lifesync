-- Profile and goals (one row per user)
create table if not exists public.profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  age text,
  height text,
  weight text,
  medical_conditions text,
  calorie_goal int,
  protein_goal int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profile enable row level security;

create policy "Users can manage own profile"
  on public.profile for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
