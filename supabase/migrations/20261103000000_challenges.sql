-- Challenges, Attempts, and Referrals Migrations + RLS
-- SYSTEM_DESIGN §8.1 / §10 / WP-45s

-- 1. Challenges table
create table if not exists public.challenges (
  id text primary key, -- 8-character short code
  creator_id uuid not null references auth.users(id) on delete cascade,
  case_id text not null references public.cases(id) on delete cascade,
  case_version int not null default 1,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- 2. Challenge attempts table
create table if not exists public.challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.challenges(id) on delete cascade,
  session_id uuid not null references public.case_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  guest_token text,
  hypothesis_id text not null,
  supporting_clue_ids text[] not null default '{}',
  score int not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Referrals table
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.challenges(id) on delete cascade,
  new_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint referrals_challenge_user_unique unique (challenge_id, new_user_id)
);

-- Indexes
create index if not exists idx_challenges_creator on public.challenges(creator_id);
create index if not exists idx_challenges_expires on public.challenges(expires_at);
create index if not exists idx_challenge_attempts_challenge on public.challenge_attempts(challenge_id);
create index if not exists idx_challenge_attempts_user on public.challenge_attempts(user_id);
create index if not exists idx_referrals_challenge on public.referrals(challenge_id);

-- Enable RLS
alter table public.challenges enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.referrals enable row level security;

-- RLS Policies
-- Challenges: anyone can read unexpired challenges
create policy challenges_read_active
  on public.challenges
  for select
  to anon, authenticated
  using (expires_at >= now());

-- Authenticated users can create challenges
create policy challenges_insert_creator
  on public.challenges
  for insert
  to authenticated
  with check ((select auth.uid()) = creator_id);

-- Revoke direct writes on challenge_attempts and referrals from client roles
-- All writes must go through Edge Functions running with service role
revoke all on table public.challenge_attempts from anon, authenticated;
revoke all on table public.referrals from anon, authenticated;

-- Read policies for challenge_attempts: users can select own attempts
grant select on table public.challenge_attempts to authenticated;
create policy challenge_attempts_select_own
  on public.challenge_attempts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
