-- Submit Session RPC for Atomic & Idempotent Submission
-- SYSTEM_DESIGN §8.1 / §8.2 / WP-42

create or replace function public.submit_case_session(
  p_session_id uuid,
  p_user_id uuid,
  p_hypothesis_id text,
  p_supporting_clue_ids text[],
  p_contradictions jsonb,
  p_score int,
  p_breakdown jsonb,
  p_xp int,
  p_too_fast boolean,
  p_case_id text,
  p_progress_xp int,
  p_progress_rank text,
  p_progress_solved_count int,
  p_progress_mastery jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_session record;
  v_existing_result record;
  v_res jsonb;
begin
  -- 1. Check if result already exists (idempotency under concurrent calls)
  select * into v_existing_result
  from public.case_results
  where session_id = p_session_id and user_id = p_user_id;

  if found then
    return jsonb_build_object(
      'already_submitted', true,
      'score', v_existing_result.score,
      'breakdown', v_existing_result.breakdown,
      'xp', v_existing_result.xp
    );
  end if;

  -- 2. Lock and update session
  select * into v_session
  from public.case_sessions
  where id = p_session_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Session % not found for user %', p_session_id, p_user_id;
  end if;

  if v_session.status = 'submitted' then
    select * into v_existing_result
    from public.case_results
    where session_id = p_session_id and user_id = p_user_id;

    if found then
      return jsonb_build_object(
        'already_submitted', true,
        'score', v_existing_result.score,
        'breakdown', v_existing_result.breakdown,
        'xp', v_existing_result.xp
      );
    end if;
  end if;

  -- 3. Mark session submitted
  update public.case_sessions
  set status = 'submitted',
      submitted_at = coalesce(submitted_at, now())
  where id = p_session_id and user_id = p_user_id;

  -- 4. Insert case result
  insert into public.case_results (
    session_id,
    user_id,
    case_id,
    hypothesis_id,
    supporting_clue_ids,
    contradictions,
    score,
    breakdown,
    xp,
    created_at
  ) values (
    p_session_id,
    p_user_id,
    p_case_id,
    p_hypothesis_id,
    p_supporting_clue_ids,
    p_contradictions,
    p_score,
    p_breakdown,
    p_xp,
    now()
  );

  -- 5. Upsert player progress
  insert into public.player_progress (
    user_id,
    xp,
    rank,
    solved_count,
    mastery,
    updated_at
  ) values (
    p_user_id,
    p_progress_xp,
    p_progress_rank,
    p_progress_solved_count,
    p_progress_mastery,
    now()
  )
  on conflict (user_id) do update
  set xp = excluded.xp,
      rank = excluded.rank,
      solved_count = excluded.solved_count,
      mastery = excluded.mastery,
      updated_at = now();

  -- 6. Grant archive unlock
  insert into public.player_unlocks (
    user_id,
    kind,
    ref_id,
    unlocked_at
  ) values (
    p_user_id,
    'archive',
    p_case_id,
    now()
  )
  on conflict (user_id, kind, ref_id) do nothing;

  return jsonb_build_object(
    'already_submitted', false,
    'score', p_score,
    'breakdown', p_breakdown,
    'xp', p_xp
  );
end;
$$;
