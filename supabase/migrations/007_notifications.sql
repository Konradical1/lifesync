-- Push notification tokens (one active token per user per device)
create table if not exists public.push_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  timezone text not null default 'America/New_York',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, token)
);

alter table public.push_tokens enable row level security;

create policy "Users can manage own push tokens"
  on public.push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_push_tokens_user on public.push_tokens(user_id);

-- Notification log to prevent duplicate/spam sends
create table if not exists public.notification_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  sent_at timestamptz default now(),
  message text
);

alter table public.notification_log enable row level security;

create policy "Users can read own notification log"
  on public.notification_log for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS, so cron endpoint can insert without per-user auth
create index if not exists idx_notification_log_user_type on public.notification_log(user_id, notification_type, sent_at);
