-- Food logging v2: full nutrition per meal and goal settings on the profile.
-- Apply BEFORE any app build that syncs these fields: PostgREST rejects unknown
-- columns, so every event and profile save from a new build fails until then.

-- { fiber, sugar, sodium, health_score, feedback, items, source }. Calories,
-- protein, carbs and fat keep their columns (the portion stays in note) so
-- older builds keep reading them.
alter table public.events add column if not exists nutrition jsonb;

alter table public.profile add column if not exists goal_type text; -- gain | maintain | lose
alter table public.profile add column if not exists sex text; -- male | female
alter table public.profile add column if not exists activity text; -- sedentary | light | moderate | active
alter table public.profile add column if not exists carb_goal int;
alter table public.profile add column if not exists fat_goal int;
alter table public.profile add column if not exists fiber_goal int;
