-- Case Reports & Moderation Migrations + RLS
-- WP-62: Report a case + moderation

create table if not exists public.case_reports (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('broken_logic', 'unfair', 'typo', 'offensive', 'other')),
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now()
);

-- Indexes for moderation filtering and user rate-limit checks
create index if not exists idx_case_reports_case_created on public.case_reports(case_id, created_at);
create index if not exists idx_case_reports_user_created on public.case_reports(user_id, created_at);

-- Enable RLS
alter table public.case_reports enable row level security;

-- Client permissions: authenticated users can insert their own reports; no client reads
revoke all on table public.case_reports from anon, authenticated;

grant insert on table public.case_reports to authenticated;
create policy case_reports_insert_own
  on public.case_reports
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

revoke select, update, delete on table public.case_reports from anon, authenticated;
