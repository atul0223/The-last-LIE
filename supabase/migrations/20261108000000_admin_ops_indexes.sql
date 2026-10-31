-- WP-63: Admin & Ops Tooling, Hot Query Indexes, and Retention Cleanup Procedure

-- 1. Performance Indexes for Hot Query Paths

-- Hot Query 1: Session lookup (c.req.param('id'), userId)
create index if not exists idx_case_sessions_user_lookup on public.case_sessions(id, user_id);

-- Hot Query 2: Submit transaction check (session_id)
create index if not exists idx_case_results_session_id on public.case_results(session_id);

-- Hot Query 3: Daily case retrieval by date
create index if not exists idx_daily_cases_date_lookup on public.daily_cases(date, case_id);

-- Hot Query 4: Conspiracy graph user reveals join
create index if not exists idx_player_graph_reveals_user_edge on public.player_graph_reveals(user_id, edge_id);

-- Hot Query 5: Published cases query (catalog & daily scheduler candidate pool)
create index if not exists idx_cases_published_status on public.cases(status, published_at);

-- Hot Query 6: Retention cleanup on challenge attempts
create index if not exists idx_challenge_attempts_created on public.challenge_attempts(created_at);

-- 2. Data Retention Cleanup Procedure (Guest attempts and old data)
create or replace function public.cleanup_expired_records(retention_days int default 30)
returns jsonb
language plpgsql
security definer
as $$
declare
  purged_attempts int := 0;
  cutoff_date timestamptz;
begin
  cutoff_date := now() - (retention_days || ' days')::interval;

  -- Purge guest challenge attempts older than retention window
  delete from public.challenge_attempts
  where guest_token is not null
    and created_at < cutoff_date;
  get diagnostics purged_attempts = row_count;

  return jsonb_build_object(
    'purged_guest_attempts', purged_attempts,
    'cutoff_date', cutoff_date
  );
end;
$$;

-- 3. Nightly Scheduled pg_cron Job (03:00 UTC)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'nightly-retention-purge',
      '0 3 * * *',
      'select public.cleanup_expired_records(30);'
    );
  end if;
exception
  when others then
    raise notice 'pg_cron extension not active; skipping cron.schedule';
end;
$$;
