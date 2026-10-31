import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../functions/api/app.js';
import { InMemoryRepository } from '../functions/_shared/in_memory_repo.js';
import { MockAuthVerifier } from '../functions/_shared/auth.js';
import { MockClock } from '../functions/_shared/clock.js';
import { InMemoryRateLimiter } from '../functions/_shared/rate_limiter.js';
import { deepScanForLeaks } from '../functions/_shared/deep_scan.js';
import { verifyGuestToken } from '../functions/_shared/guest_token.js';
import type { AppConfig } from '../functions/_shared/types.js';
import { toPublicCase, type CaseDefinition } from '@lastlie/case-engine';
import case0001Raw from '../../packages/content/cases/authored/case_0001.json';

const case0001 = case0001Raw as unknown as CaseDefinition;

const defaultClueIds = [
  'clue_message_carrier',
  'clue_arjun_testimony',
  'clue_maya_testimony',
  'clue_rhea_testimony',
  'clue_marcus_log',
];

describe('WP-45s Challenges Suite', () => {
  let repo: InMemoryRepository;
  let auth: MockAuthVerifier;
  let clock: MockClock;
  let rateLimiter: InMemoryRateLimiter;
  let config: AppConfig;
  let app: ReturnType<typeof createApp>;

  const creator = { userId: 'user_creator' };
  const challenger = { userId: 'user_challenger' };

  beforeEach(async () => {
    repo = new InMemoryRepository();
    auth = new MockAuthVerifier([creator, challenger]);
    clock = new MockClock('2026-11-01T10:00:00Z');
    rateLimiter = new InMemoryRateLimiter();

    config = {
      env: 'test',
      corsOrigins: ['*'],
      rateLimitPerMin: 60,
      maxBodySizeBytes: 65536,
      guestHmacSecret: 'super_secret_test_key_123',
      minSubmitDurationSeconds: 15,
    };

    const publicCase = toPublicCase(case0001, defaultClueIds);
    await repo.upsertCase(
      {
        id: case0001.id,
        version: case0001.version,
        kind: case0001.kind,
        title: case0001.title,
        difficulty: case0001.difficulty,
        mysteryType: case0001.mysteryType,
        estimatedMinutes: case0001.estimatedMinutes,
        status: 'published',
        publicPayload: publicCase,
      },
      case0001,
    );

    app = createApp({
      repo,
      auth,
      clock,
      rateLimiter,
      config,
    });
  });

  it('requires creator to have submitted session before creating challenge', async () => {
    // 1. Create active unsubmitted session
    const sessRes = await app.request('/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_creator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caseId: 'case_0001' }),
    });
    const { session } = await sessRes.json();

    // 2. Attempt to create challenge before submit -> must be rejected
    const failRes = await app.request('/challenges', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_creator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId: session.id }),
    });

    expect(failRes.status).toBe(400);
    const failData = await failRes.json();
    expect(failData.error.code).toBe('SUBMISSION_REQUIRED');

    // 3. Submit session
    clock.advance(20_000);
    await app.request(`/sessions/${session.id}/submit`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_creator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hypothesisId: case0001.truth.solutionHypothesisId,
        supportingClueIds: ['clue_message_carrier'],
        contradictions: [],
      }),
    });

    // 4. Now challenge creation succeeds
    const okRes = await app.request('/challenges', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_creator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId: session.id }),
    });

    expect(okRes.status).toBe(201);
    const okData = await okRes.json();
    expect(okData.code).toHaveLength(8);
    expect(okData.url).toContain(`/c/${okData.code}`);
    expect(new Date(okData.expiresAt).getTime()).toBeGreaterThan(clock.now().getTime());

    // Record creator attempt on the challenge
    await repo.recordChallengeAttempt({
      challengeId: okData.code,
      sessionId: session.id,
      userId: 'user_creator',
      hypothesisId: case0001.truth.solutionHypothesisId,
      supportingClueIds: ['clue_message_carrier'],
      score: 100,
      createdAt: clock.now().toISOString(),
    });

    // DeepScan
    expect(deepScanForLeaks(okData)).toEqual([]);
  });

  it('serves challenge case metadata publicly (GET /challenges/:code)', async () => {
    // Setup a submitted challenge
    const sessRes = await app.request('/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer user_creator', 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: 'case_0001' }),
    });
    const { session } = await sessRes.json();
    clock.advance(20_000);
    await app.request(`/sessions/${session.id}/submit`, {
      method: 'POST',
      headers: { Authorization: 'Bearer user_creator', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hypothesisId: case0001.truth.solutionHypothesisId,
        supportingClueIds: [],
        contradictions: [],
      }),
    });
    const chalRes = await app.request('/challenges', {
      method: 'POST',
      headers: { Authorization: 'Bearer user_creator', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });
    const { code } = await chalRes.json();

    // Public fetch
    const getRes = await app.request(`/challenges/${code}`, { method: 'GET' });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.code).toBe(code);
    expect(getData.case.id).toBe('case_0001');

    // DeepScan
    expect(deepScanForLeaks(getData)).toEqual([]);

    // Expired check: advance clock by 8 days
    clock.advance(8 * 24 * 3600 * 1000);
    const expRes = await app.request(`/challenges/${code}`, { method: 'GET' });
    expect(expRes.status).toBe(410);
    const expData = await expRes.json();
    expect(expData.error.code).toBe('CHALLENGE_EXPIRED');
  });

  it('issues and validates signed guest tokens (POST /challenges/:code/guest)', async () => {
    // Setup challenge
    const sessRes = await app.request('/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer user_creator', 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: 'case_0001' }),
    });
    const { session } = await sessRes.json();
    clock.advance(20_000);
    await app.request(`/sessions/${session.id}/submit`, {
      method: 'POST',
      headers: { Authorization: 'Bearer user_creator', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hypothesisId: case0001.truth.solutionHypothesisId,
        supportingClueIds: [],
        contradictions: [],
      }),
    });
    const chalRes = await app.request('/challenges', {
      method: 'POST',
      headers: { Authorization: 'Bearer user_creator', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });
    const { code } = await chalRes.json();

    // Request guest token
    const guestRes = await app.request(`/challenges/${code}/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId: 'guest_test_player' }),
    });

    expect(guestRes.status).toBe(200);
    const { guestToken } = await guestRes.json();
    expect(guestToken).toBeDefined();

    // Validate signature
    const verified = verifyGuestToken(guestToken, config.guestHmacSecret);
    expect(verified.valid).toBe(true);
    expect(verified.payload?.challengeId).toBe(code);
    expect(verified.payload?.guestId).toBe('guest_test_player');

    // Test forged token rejection
    const forgedToken = `${guestToken.split('.')[0]}.forged_signature`;
    const forgedVerify = verifyGuestToken(forgedToken, config.guestHmacSecret);
    expect(forgedVerify.valid).toBe(false);
  });

  it('denies compare before submit and returns aggregates after (GET /challenges/:code/compare)', async () => {
    // Setup challenge
    const sessRes = await app.request('/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer user_creator', 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: 'case_0001' }),
    });
    const { session } = await sessRes.json();
    clock.advance(20_000);
    await app.request(`/sessions/${session.id}/submit`, {
      method: 'POST',
      headers: { Authorization: 'Bearer user_creator', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hypothesisId: case0001.truth.solutionHypothesisId,
        supportingClueIds: ['clue_message_carrier'],
        contradictions: [],
      }),
    });
    const chalRes = await app.request('/challenges', {
      method: 'POST',
      headers: { Authorization: 'Bearer user_creator', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });
    const { code } = await chalRes.json();

    // Challenger attempts compare before submitting -> denied
    const deniedRes = await app.request(`/challenges/${code}/compare`, {
      method: 'GET',
      headers: { Authorization: 'Bearer user_challenger' },
    });
    expect(deniedRes.status).toBe(403);
    const deniedData = await deniedRes.json();
    expect(deniedData.error.code).toBe('SUBMISSION_REQUIRED');

    // Record challenger attempt
    await repo.recordChallengeAttempt({
      challengeId: code,
      sessionId: 'sess_chal_1',
      userId: 'user_challenger',
      hypothesisId: case0001.truth.solutionHypothesisId,
      supportingClueIds: ['clue_message_carrier', 'clue_arjun_testimony'],
      score: 95,
      createdAt: clock.now().toISOString(),
    });

    // Now compare is granted
    const allowedRes = await app.request(`/challenges/${code}/compare`, {
      method: 'GET',
      headers: { Authorization: 'Bearer user_challenger' },
    });
    expect(allowedRes.status).toBe(200);
    const compareData = await allowedRes.json();
    expect(compareData.totalParticipants).toBe(1);
    expect(compareData.hypothesisDistribution[case0001.truth.solutionHypothesisId]).toBe(1);
    expect(compareData.mostUsedClues.length).toBeGreaterThan(0);

    // DeepScan: verify no PII or user IDs in compare response
    expect(deepScanForLeaks(compareData)).toEqual([]);
    expect(JSON.stringify(compareData)).not.toContain('user_challenger');
    expect(JSON.stringify(compareData)).not.toContain('user_creator');
  });

  it('attaches guest result to account once on sign-in (POST /challenges/:code/attach)', async () => {
    // Setup challenge and guest token
    const sessRes = await app.request('/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer user_creator', 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: 'case_0001' }),
    });
    const { session } = await sessRes.json();
    clock.advance(20_000);
    await app.request(`/sessions/${session.id}/submit`, {
      method: 'POST',
      headers: { Authorization: 'Bearer user_creator', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hypothesisId: case0001.truth.solutionHypothesisId,
        supportingClueIds: [],
        contradictions: [],
      }),
    });
    const chalRes = await app.request('/challenges', {
      method: 'POST',
      headers: { Authorization: 'Bearer user_creator', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id }),
    });
    const { code } = await chalRes.json();

    const guestRes = await app.request(`/challenges/${code}/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId: 'guest_convert' }),
    });
    const { guestToken } = await guestRes.json();

    // Guest solves challenge
    await repo.recordChallengeAttempt({
      challengeId: code,
      sessionId: 'sess_guest_attempt',
      guestToken,
      hypothesisId: case0001.truth.solutionHypothesisId,
      supportingClueIds: [],
      score: 80,
      createdAt: clock.now().toISOString(),
    });

    // Sign in and attach
    const attachRes = await app.request(`/challenges/${code}/attach`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_challenger',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ guestToken }),
    });
    expect(attachRes.status).toBe(200);

    // Attempt second attach -> 409 ALREADY_ATTACHED
    const attachAgainRes = await app.request(`/challenges/${code}/attach`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_challenger',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ guestToken }),
    });
    expect(attachAgainRes.status).toBe(409);
    const attachAgainData = await attachAgainRes.json();
    expect(attachAgainData.error.code).toBe('ALREADY_ATTACHED');
  });
});
