-- =============================================================================
-- pgTAP Test Suite: RLS Policies, Permission Revocations & Auth Triggers
-- Run via: supabase test db (requires Docker Desktop + Supabase CLI)
-- =============================================================================

begin;

-- Ensure pgTAP extension is available
create extension if not exists pgtap with schema extensions;

select plan(12);

-- -----------------------------------------------------------------------------
-- Setup Test Fixtures: Two distinct users in auth.users
-- -----------------------------------------------------------------------------
create temp table _test_state (
  user_a_id uuid,
  user_b_id uuid,
  session_a_id uuid,
  session_b_id uuid
);

do $$
declare
  uid_a uuid := '11111111-1111-1111-1111-111111111111'::uuid;
  uid_b uuid := '22222222-2222-2222-2222-222222222222'::uuid;
  sess_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;
  sess_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid;
begin
  -- Insert mock auth users
  insert into auth.users (id, email, raw_user_meta_data, role, aud)
  values
    (uid_a, 'detective_a@vesper.city', '{"display_name": "Detective Alpha"}'::jsonb, 'authenticated', 'authenticated'),
    (uid_b, 'detective_b@vesper.city', '{"display_name": "Detective Beta"}'::jsonb, 'authenticated', 'authenticated');

  -- Insert mock draft case for testing draft visibility
  insert into public.cases (id, version, kind, title, difficulty, mystery_type, estimated_minutes, status, public_payload)
  values
    ('case_draft_test', 1, 'authored', 'The Secret Draft', 1, 'theft', 5, 'draft', '{}'::jsonb);

  -- Insert test sessions as service_role (bypassing client revokes)
  insert into public.case_sessions (id, user_id, case_id, case_version, mode, status)
  values
    (sess_a, uid_a, 'case_0001', 1, 'normal', 'in_progress'),
    (sess_b, uid_b, 'case_0001', 1, 'normal', 'in_progress');

  insert into _test_state values (uid_a, uid_b, sess_a, sess_b);
end;
$$;

-- -----------------------------------------------------------------------------
-- Test 1 & 2: case_private is completely inaccessible to anon and authenticated
-- -----------------------------------------------------------------------------

set local role anon;

select throws_ok(
  'select * from public.case_private',
  '42501', -- insufficient_privilege
  'permission denied for table case_private',
  'Anon role cannot select from case_private (permission denied)'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  'select * from public.case_private',
  '42501',
  'permission denied for table case_private',
  'Authenticated role cannot select from case_private (permission denied)'
);

-- -----------------------------------------------------------------------------
-- Test 3 & 4: Published cases are readable, but draft cases are hidden from anon
-- -----------------------------------------------------------------------------

set local role anon;

select is_empty(
  'select * from public.cases where status = ''draft''',
  'Anon cannot read cases where status is draft'
);

select isnt_empty(
  'select * from public.cases where id = ''case_0001'' and status = ''published''',
  'Anon can read published cases (e.g. case_0001)'
);

-- -----------------------------------------------------------------------------
-- Test 5 & 6: User A cannot select User B sessions; User A sees only own sessions
-- -----------------------------------------------------------------------------

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

select is_empty(
  'select * from public.case_sessions where user_id = ''22222222-2222-2222-2222-222222222222''::uuid',
  'User A cannot select User B case_sessions'
);

select results_eq(
  'select user_id from public.case_sessions where id = ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa''::uuid',
  'select ''11111111-1111-1111-1111-111111111111''::uuid',
  'User A can select own case_sessions'
);

-- -----------------------------------------------------------------------------
-- Test 7: Direct client INSERT on case_sessions is revoked
-- -----------------------------------------------------------------------------

select throws_ok(
  'insert into public.case_sessions (user_id, case_id, case_version, mode, status) values (''11111111-1111-1111-1111-111111111111'', ''case_0001'', 1, ''normal'', ''in_progress'')',
  '42501',
  'permission denied for table case_sessions',
  'Authenticated user cannot directly insert into case_sessions'
);

-- -----------------------------------------------------------------------------
-- Test 8: Direct client INSERT on case_results is revoked
-- -----------------------------------------------------------------------------

select throws_ok(
  'insert into public.case_results (session_id, user_id, case_id, hypothesis_id, score, breakdown, xp) values (''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'', ''11111111-1111-1111-1111-111111111111'', ''case_0001'', ''hyp_arjun_forged'', 100, ''{}''::jsonb, 100)',
  '42501',
  'permission denied for table case_results',
  'Authenticated user cannot directly insert into case_results'
);

-- -----------------------------------------------------------------------------
-- Test 9: Direct client UPDATE on player_progress is revoked
-- -----------------------------------------------------------------------------

select throws_ok(
  'update public.player_progress set xp = 9999 where user_id = ''11111111-1111-1111-1111-111111111111''',
  '42501',
  'permission denied for table player_progress',
  'Authenticated user cannot directly update player_progress'
);

-- -----------------------------------------------------------------------------
-- Test 10: Direct client INSERT on player_unlocks is revoked
-- -----------------------------------------------------------------------------

select throws_ok(
  'insert into public.player_unlocks (user_id, kind, ref_id) values (''11111111-1111-1111-1111-111111111111'', ''dossier'', ''char_arjun'')',
  '42501',
  'permission denied for table player_unlocks',
  'Authenticated user cannot directly insert into player_unlocks'
);

-- -----------------------------------------------------------------------------
-- Test 11 & 12: Trigger created profile and player_progress on auth.users insert
-- -----------------------------------------------------------------------------

select results_eq(
  'select display_name from public.profiles where id = ''11111111-1111-1111-1111-111111111111''::uuid',
  'select ''Detective Alpha''::text',
  'Profile automatically created by handle_new_user trigger with custom display_name'
);

select results_eq(
  'select rank from public.player_progress where user_id = ''11111111-1111-1111-1111-111111111111''::uuid',
  'select ''Trainee''::text',
  'Player progress initialized by handle_new_user trigger with default Trainee rank'
);

select finish();
rollback;
