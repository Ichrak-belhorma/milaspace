-- Mila 0003: weekly schedule, time blocks, task-linked focus sessions, module archive.
-- Safe to re-run.

-- Modules can be finished: grade recorded, then put on the shelf (out of the plan).
alter table public.modules add column if not exists archived_at timestamptz;
alter table public.modules add column if not exists final_grade text check (char_length(final_grade) <= 20);

-- Task time blocks: minutes after midnight (local time) the block starts.
alter table public.study_tasks add column if not exists start_minute integer check (start_minute between 0 and 1439);

-- Focus sessions remember which planned task they were for (module_id already exists).
alter table public.focus_sessions add column if not exists task_id text;

-- The global daily budget, weekly availability and learned pace live in profiles.settings.schedule
-- (jsonb, no column needed). daily_minutes on modules is kept for older clients.
