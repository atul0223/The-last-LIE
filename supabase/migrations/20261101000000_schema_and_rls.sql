-- =============================================================================
-- Migration: 20261101000000_schema_and_rls.sql
-- Description: Core tables, indexes, constraints, RLS policies, write revocation,
--              and auth triggers for THE LAST LIE: Infinite (SYSTEM_DESIGN §8.1).
-- =============================================================================

-- Ensure required extension for UUID generation
create extension if not exists "pgcrypto" with schema extensions;

-- -----------------------------------------------------------------------------
-- 1. Profiles (linked to Supabase Auth users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  title text default 'Detective'::text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Public user profile information and personal client settings.';

-- -----------------------------------------------------------------------------
-- 2. Cases (public metadata and sanitized client payload)
-- -----------------------------------------------------------------------------
create table if not exists public.cases (
  id text primary key,
  version integer not null default 1,
  kind text not null check (kind in ('authored', 'procedural', 'canonical')),
  title text not null,
  difficulty integer not null check (difficulty between 1 and 5),
  mystery_type text not null,
  estimated_minutes integer not null default 5,
  status text not null default 'draft' check (status in ('draft', 'validated', 'reviewed', 'published', 'retired')),
  public_payload jsonb not null,
  fingerprint text,
  template_id text,
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.cases is 'Catalog of cases containing CasePublic representations for client consumption.';

create index if not exists cases_status_kind_difficulty_idx
  on public.cases (status, kind, difficulty);

-- -----------------------------------------------------------------------------
-- 3. Case Private (ground truth, solutions, and full CaseDefinition)
-- -----------------------------------------------------------------------------
create table if not exists public.case_private (
  case_id text primary key references public.cases(id) on delete cascade,
  version integer not null default 1,
  definition jsonb not null,
  created_at timestamptz not null default now()
);

comment on table public.case_private is 'Authoritative ground-truth definitions including solutions. Inaccessible to client roles.';

-- -----------------------------------------------------------------------------
-- 4. Case Sessions (active and completed gameplay sessions)
-- -----------------------------------------------------------------------------
create table if not exists public.case_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id text not null references public.cases(id) on delete cascade,
  case_version integer not null default 1,
  mode text not null check (mode in ('normal', 'daily', 'challenge', 'replay')),
  unlocked_clue_ids text[] not null default '{}'::text[],
  board jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'abandoned')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

comment on table public.case_sessions is 'Individual player investigation sessions recording unlocked clues and board state.';

create index if not exists case_sessions_user_status_idx
  on public.case_sessions (user_id, status);

create index if not exists case_sessions_case_id_idx
  on public.case_sessions (case_id);

-- -----------------------------------------------------------------------------
-- 5. Case Results (scored submission history)
-- -----------------------------------------------------------------------------
create table if not exists public.case_results (
  session_id uuid primary key references public.case_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id text not null references public.cases(id) on delete cascade,
  hypothesis_id text not null,
  supporting_clue_ids text[] not null default '{}'::text[],
  contradictions jsonb not null default '[]'::jsonb,
  score integer not null check (score >= 0),
  breakdown jsonb not null,
  xp integer not null check (xp >= 0),
  created_at timestamptz not null default now()
);

comment on table public.case_results is 'Immutable record of submitted theories, scoring breakdowns, and earned XP.';

create index if not exists case_results_user_created_at_idx
  on public.case_results (user_id, created_at desc);

create index if not exists case_results_case_id_idx
  on public.case_results (case_id);

-- -----------------------------------------------------------------------------
-- 6. Player Progress (detective rank, total XP, and mastery tracking)
-- -----------------------------------------------------------------------------
create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  rank text not null default 'Trainee',
  solved_count integer not null default 0 check (solved_count >= 0),
  mastery jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.player_progress is 'Aggregate player progression metrics, detective rank, and mastery gates.';

-- -----------------------------------------------------------------------------
-- 7. Player Unlocks (dossiers, leads, and permanent items)
-- -----------------------------------------------------------------------------
create table if not exists public.player_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  ref_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, kind, ref_id)
);

comment on table public.player_unlocks is 'Permanent dossier, character, and conspiracy reveals earned by the player.';

create index if not exists player_unlocks_user_id_idx
  on public.player_unlocks (user_id);

-- -----------------------------------------------------------------------------
-- 8. Daily Cases (calendar assignment of cases)
-- -----------------------------------------------------------------------------
create table if not exists public.daily_cases (
  date date primary key,
  case_id text not null references public.cases(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.daily_cases is 'Global daily featured case mapping.';

create index if not exists daily_cases_case_id_idx
  on public.daily_cases (case_id);

-- -----------------------------------------------------------------------------
-- 9. Game Config (dynamic balance and rank thresholds)
-- -----------------------------------------------------------------------------
create table if not exists public.game_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.game_config is 'Global server-controlled progression and difficulty configuration parameters.';

-- =============================================================================
-- Row Level Security (RLS) Configuration
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.case_private enable row level security;
alter table public.case_sessions enable row level security;
alter table public.case_results enable row level security;
alter table public.player_progress enable row level security;
alter table public.player_unlocks enable row level security;
alter table public.daily_cases enable row level security;
alter table public.game_config enable row level security;

-- -----------------------------------------------------------------------------
-- RLS Policies: Cases
-- Anon & Authenticated can SELECT only published cases.
-- -----------------------------------------------------------------------------
create policy "cases_select_published"
  on public.cases
  for select
  to anon, authenticated
  using (status = 'published');

-- -----------------------------------------------------------------------------
-- RLS Policies: Case Private
-- NO POLICIES for anon or authenticated (deny-all by default).
-- Only service_role can access.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- RLS Policies: Profiles
-- Authenticated users can read and update their own profile only.
-- -----------------------------------------------------------------------------
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS Policies: Case Sessions
-- Authenticated users can SELECT only their own sessions.
-- -----------------------------------------------------------------------------
create policy "case_sessions_select_own"
  on public.case_sessions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS Policies: Case Results
-- Authenticated users can SELECT only their own results.
-- -----------------------------------------------------------------------------
create policy "case_results_select_own"
  on public.case_results
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS Policies: Player Progress
-- Authenticated users can SELECT only their own progress.
-- -----------------------------------------------------------------------------
create policy "player_progress_select_own"
  on public.player_progress
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS Policies: Player Unlocks
-- Authenticated users can SELECT only their own unlocks.
-- -----------------------------------------------------------------------------
create policy "player_unlocks_select_own"
  on public.player_unlocks
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS Policies: Daily Cases & Game Config
-- Global read-only tables for anon and authenticated.
-- -----------------------------------------------------------------------------
create policy "daily_cases_select_all"
  on public.daily_cases
  for select
  to anon, authenticated
  using (true);

create policy "game_config_select_all"
  on public.game_config
  for select
  to anon, authenticated
  using (true);

-- =============================================================================
-- Revoke Direct Mutations from Client Roles (anon, authenticated)
-- All authoritative gameplay writes must flow through Edge Functions (service_role).
-- =============================================================================

-- Case Private: absolute lockdown
revoke all on table public.case_private from anon, authenticated;

-- Cases: read-only for clients
revoke insert, update, delete on table public.cases from anon, authenticated;

-- Sessions, Results, Progress, Unlocks: read-only for client roles
revoke insert, update, delete on table public.case_sessions from anon, authenticated;
revoke insert, update, delete on table public.case_results from anon, authenticated;
revoke insert, update, delete on table public.player_progress from anon, authenticated;
revoke insert, update, delete on table public.player_unlocks from anon, authenticated;

-- Profiles: no client insert or delete (created by trigger, updated via RLS)
revoke insert, delete on table public.profiles from anon, authenticated;

-- Daily cases & Game config: read-only
revoke insert, update, delete on table public.daily_cases from anon, authenticated;
revoke insert, update, delete on table public.game_config from anon, authenticated;

-- Grants for explicit read access
grant usage on schema public to anon, authenticated, service_role;
grant select on public.cases to anon, authenticated;
grant select, update (display_name, settings) on public.profiles to authenticated;
grant select on public.case_sessions to authenticated;
grant select on public.case_results to authenticated;
grant select on public.player_progress to authenticated;
grant select on public.player_unlocks to authenticated;
grant select on public.daily_cases to anon, authenticated;
grant select on public.game_config to anon, authenticated;

-- Service role retains full administrative privileges
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

-- =============================================================================
-- Trigger: User Profile & Progress Initialization on auth.users Signup
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Automatically initialize public profile
  insert into public.profiles (id, display_name, settings)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Detective'),
    '{}'::jsonb
  );

  -- Automatically initialize player progression track
  insert into public.player_progress (user_id, xp, rank, solved_count, mastery)
  values (
    new.id,
    0,
    'Trainee',
    0,
    '{}'::jsonb
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
