-- Mood: allow multiple entries per day (history), add time column
-- Summary: no schema change; app uses ignoreDuplicates on upsert to avoid overwriting

-- Drop unique constraint on mood so we can have multiple entries per day
alter table public.mood drop constraint if exists mood_user_id_date_key;

-- Add time column for when the mood was logged (HH:mm)
alter table public.mood add column if not exists time text;
