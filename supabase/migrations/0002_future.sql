-- Mila: tables for Phase 3 (practice, rewards) and Phase 4 (community).
-- Designed now so the data model is settled; the app starts using them in those phases.
-- Safe to run any time after 0001.

create table if not exists public.practice_items (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  module_id text not null,
  node_id text,
  kind text not null check (kind in ('math', 'coding')),
  prompt text not null,
  solution_steps jsonb,
  language text,
  starter_code text,
  tests jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, module_id) references public.modules (user_id, id) on delete cascade
);

create table if not exists public.practice_attempts (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  item_id text not null,
  correct boolean not null,
  score real,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Focus-minute currency. Written only by server code (service role), never by clients:
-- clients can read their own ledger but cannot insert.
create table if not exists public.currency_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  delta integer not null,
  reason text not null check (reason in ('focus', 'purchase', 'bonus')),
  ref_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_items (
  user_id uuid not null references auth.users on delete cascade,
  item_id text not null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.polaroids (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  storage_path text not null,
  caption text check (char_length(caption) <= 120),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.study_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  is_public boolean not null default false,
  theme jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.study_room_members (
  room_id uuid not null references public.study_rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.theme_likes (
  user_id uuid not null references auth.users on delete cascade,
  theme_owner uuid not null,
  theme_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, theme_owner, theme_id)
);

create table if not exists public.follows (
  follower uuid not null references auth.users on delete cascade,
  followee uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);

do $$
declare t text;
begin
  foreach t in array array['practice_items', 'practice_attempts', 'user_items', 'polaroids']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

alter table public.currency_ledger enable row level security;
drop policy if exists "read own ledger" on public.currency_ledger;
create policy "read own ledger" on public.currency_ledger for select using (user_id = (select auth.uid()));

alter table public.study_rooms enable row level security;
drop policy if exists "rooms visible" on public.study_rooms;
create policy "rooms visible" on public.study_rooms for select using (is_public or host_id = (select auth.uid()));
drop policy if exists "hosts manage rooms" on public.study_rooms;
create policy "hosts manage rooms" on public.study_rooms for all using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));

alter table public.study_room_members enable row level security;
drop policy if exists "members manage own membership" on public.study_room_members;
create policy "members manage own membership" on public.study_room_members for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.theme_likes enable row level security;
drop policy if exists "own likes" on public.theme_likes;
create policy "own likes" on public.theme_likes for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.follows enable row level security;
drop policy if exists "own follows" on public.follows;
create policy "own follows" on public.follows for all using (follower = (select auth.uid())) with check (follower = (select auth.uid()));
