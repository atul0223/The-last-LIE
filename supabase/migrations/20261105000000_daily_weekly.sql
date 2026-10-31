-- Daily Scheduler & Weekly Community Case Migrations + RLS
-- SYSTEM_DESIGN §8.1 / §8.2 / WP-50s / WP-55s

-- 1. Tighten RLS on daily_cases: clients can only read today or past dates
drop policy if exists daily_cases_select on public.daily_cases;
create policy daily_cases_select_current_or_past
  on public.daily_cases
  for select
  to anon, authenticated
  using (date <= current_date);

-- 2. Weekly cases table
create table if not exists public.weekly_cases (
  id text primary key, -- e.g. 'week_2026_44'
  case_id text not null references public.cases(id) on delete cascade,
  week_number int not null,
  year int not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  constraint weekly_cases_week_year_unique unique (year, week_number)
);

create index if not exists idx_weekly_cases_window on public.weekly_cases(opens_at, closes_at);

-- 3. Weekly attempts table (first attempt only counts for leaderboard)
create table if not exists public.weekly_attempts (
  weekly_id text not null references public.weekly_cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous Detective',
  session_id uuid not null references public.case_sessions(id) on delete cascade,
  score int not null default 0,
  hypothesis_id text not null,
  clue_ids text[] not null default '{}',
  too_fast boolean not null default false,
  submitted_at timestamptz not null default now(),
  primary key (weekly_id, user_id)
);

create index if not exists idx_weekly_attempts_score on public.weekly_attempts(weekly_id, score desc, submitted_at asc);

-- Enable RLS
alter table public.weekly_cases enable row level security;
alter table public.weekly_attempts enable row level security;

-- Weekly cases policy: unrevealed until window opens
create policy weekly_cases_read_active
  on public.weekly_cases
  for select
  to anon, authenticated
  using (opens_at <= now());

-- Revoke direct writes on weekly_attempts from client roles
revoke all on table public.weekly_attempts from anon, authenticated;
grant select on table public.weekly_attempts to authenticated;

-- Users can read own attempts
create policy weekly_attempts_select_own
  on public.weekly_attempts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- 4. Stored Procedure: fills daily_cases 14 days ahead from eligible published cases
create or replace function public.fill_daily_cases_ahead(p_days_ahead int default 14)
returns int
language plpgsql
security definer
as $$
declare
  v_target_date date;
  v_chosen_case_id text;
  v_inserted_count int := 0;
begin
  for i in 0..p_days_ahead loop
    v_target_date := current_date + i;

    -- If this date is already populated, skip
    if not exists (select 1 from public.daily_cases where date = v_target_date) then
      -- Select published case not used in the last 90 days
      select c.id into v_chosen_case_id
      from public.cases c
      where c.status = 'published'
        and c.id not in (
          select case_id from public.daily_cases
          where date >= (v_target_date - 90)
        )
      order by random()
      limit 1;

      if v_chosen_case_id is not null then
        insert into public.daily_cases (date, case_id)
        values (v_target_date, v_chosen_case_id)
        on conflict (date) do nothing;

        v_inserted_count := v_inserted_count + 1;
      end if;
    end if;
  end loop;

  return v_inserted_count;
end;
$$;
