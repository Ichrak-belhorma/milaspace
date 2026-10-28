-- Mila: initial schema (Phase 2).
-- Run once in the Supabase SQL editor, or with `supabase db push`.
-- Every table is private to its owner via row-level security. Row ids are generated on the
-- device (local-first), so primary keys are (user_id, id).

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text check (char_length(display_name) <= 60),
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  -- The active theme (full JSON, so unsaved tweaks follow you) and app settings (timer, audio, motion).
  active_theme jsonb,
  settings jsonb not null default '{}'::jsonb,
  settings_updated_at timestamptz,
  -- Phase 4: public profile showcase.
  showcase jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create a profile for every new account.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- themes (custom themes; sharing in Phase 4) ----------
create table if not exists public.themes (
  user_id uuid not null references auth.users on delete cascade,
  id text not null check (char_length(id) <= 64),
  name text not null check (char_length(name) between 1 and 48),
  based_on text,
  tokens jsonb not null,
  room jsonb not null,
  is_public boolean not null default false,
  forked_from text,
  likes_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------- room ----------
create table if not exists public.room_state (
  user_id uuid primary key references auth.users on delete cascade,
  -- lamp, window, curtains, drink, phone, painting flags
  state jsonb not null default '{}'::jsonb,
  -- object path in the room-images bucket for the painting picture
  painting_path text,
  -- Phase 3: slot → item id
  slots jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- study ----------
create table if not exists public.modules (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  name text not null check (char_length(name) between 1 and 80),
  exam_date date,
  target_grade text check (char_length(target_grade) <= 20),
  syllabus_text text check (char_length(syllabus_text) <= 100000),
  syllabus_path text,
  daily_minutes integer not null default 60 check (daily_minutes between 5 and 720),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.curriculum_nodes (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  module_id text not null,
  parent_id text,
  kind text not null check (kind in ('chapter', 'concept', 'skill')),
  title text not null check (char_length(title) between 1 and 160),
  position integer not null default 0,
  content_type text not null check (content_type in ('memorize', 'conceptual', 'math', 'coding')),
  est_minutes integer not null default 45 check (est_minutes between 1 and 1440),
  mastery real not null default 0 check (mastery between 0 and 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, module_id) references public.modules (user_id, id) on delete cascade
);

-- Only history (done/skipped) and the user's own tasks are stored: generated tasks are
-- re-derived on every device by the deterministic planner.
create table if not exists public.study_tasks (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  module_id text not null,
  node_id text,
  node_ids text[],
  date date not null,
  kind text not null check (kind in ('learn', 'review', 'practice', 'flashcards', 'buffer')),
  title text not null check (char_length(title) <= 400),
  est_minutes integer not null default 25,
  status text not null check (status in ('todo', 'done', 'skipped')),
  source text not null check (source in ('auto', 'manual')),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, module_id) references public.modules (user_id, id) on delete cascade
);

create table if not exists public.flashcards (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  module_id text not null,
  node_id text,
  front text not null check (char_length(front) between 1 and 1000),
  back text not null check (char_length(back) between 1 and 2000),
  -- FSRS state as JSON (ts-fsrs card); `due` duplicated for queries.
  fsrs jsonb not null,
  due timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, module_id) references public.modules (user_id, id) on delete cascade
);
create index if not exists flashcards_due_idx on public.flashcards (user_id, due);

create table if not exists public.review_logs (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  card_id text not null,
  rating text not null check (rating in ('again', 'hard', 'good', 'easy')),
  state text not null,
  due timestamptz not null,
  stability real not null,
  difficulty real not null,
  reviewed_at timestamptz not null,
  primary key (user_id, id)
);

-- ---------- focus and notebook ----------
create table if not exists public.focus_sessions (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  module_id text,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  focus_minutes real not null check (focus_minutes >= 0 and focus_minutes <= 600),
  completed boolean not null default false,
  primary key (user_id, id)
);

create table if not exists public.todos (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  text text not null check (char_length(text) between 1 and 200),
  done boolean not null default false,
  day date not null,
  created_at timestamptz not null,
  done_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Streaks and per-day stats come from this view (no counters to drift).
create or replace view public.focus_daily with (security_invoker = true) as
  select user_id, (started_at at time zone 'utc')::date as day, sum(focus_minutes) as minutes, count(*) as sessions
  from public.focus_sessions
  group by user_id, (started_at at time zone 'utc')::date;

-- ---------- row-level security ----------
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "public profiles are readable" on public.profiles;
create policy "public profiles are readable" on public.profiles for select using (is_public);

do $$
declare t text;
begin
  foreach t in array array['themes', 'room_state', 'modules', 'curriculum_nodes', 'study_tasks', 'flashcards', 'review_logs', 'focus_sessions', 'todos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

drop policy if exists "public themes are readable" on public.themes;
create policy "public themes are readable" on public.themes for select using (is_public);

-- ---------- storage: private room images, one folder per user ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-images', 'room-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "own room images" on storage.objects;
create policy "own room images" on storage.objects
  for all to authenticated
  using (bucket_id = 'room-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'room-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
