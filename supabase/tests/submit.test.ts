import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../functions/api/app.js';
import { InMemoryRepository } from '../functions/_shared/in_memory_repo.js';
import { MockAuthVerifier } from '../functions/_shared/auth.js';
import { MockClock } from '../functions/_shared/clock.js';
import { InMemoryRateLimiter } from '../functions/_shared/rate_limiter.js';
import { deepScanForLeaks } from '../functions/_shared/deep_scan.js';
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

describe('WP-42 Submit Suite', () => {
  let repo: InMemoryRepository;
  let auth: MockAuthVerifier;
  let clock: MockClock;
  let rateLimiter: InMemoryRateLimiter;
  let config: AppConfig;
  let app: ReturnType<typeof createApp>;

  const user = { userId: 'user_investigator' };

  beforeEach(async () => {
    repo = new InMemoryRepository();
    auth = new MockAuthVerifier([user]);
    clock = new MockClock('2026-11-01T10:00:00Z');
    rateLimiter = new InMemoryRateLimiter();

    config = {
      env: 'test',
      corsOrigins: ['*'],
      rateLimitPerMin: 60,
      maxBodySizeBytes: 65536,
      guestHmacSecret: 'test_hmac_secret_key',
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

  it('submits a case session transactionally with score and reveal', async () => {
    // 1. Create session
    const createRes = await app.request('/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_investigator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caseId: 'case_0001', mode: 'normal' }),
    });
    const { session, case: initialCase } = await createRes.json();

    // Verify initial state has zero leaks
    expect(deepScanForLeaks(initialCase)).toEqual([]);

    // Advance clock past minimum duration
    clock.advance(30_000); // 30 seconds

    // 2. Submit solution
    const submitRes = await app.request(`/sessions/${session.id}/submit`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_investigator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hypothesisId: case0001.truth.solutionHypothesisId,
        supportingClueIds: ['clue_message_carrier', 'clue_arjun_testimony'],
        contradictions: [],
      }),
    });

    expect(submitRes.status).toBe(200);
    const data = await submitRes.json();

    expect(data.result.score).toBeGreaterThan(0);
    expect(data.reveal.solutionHypothesisId).toBe(case0001.truth.solutionHypothesisId);
    expect(data.reveal.explanation.length).toBeGreaterThan(0);
    expect(data.progress.solvedCount).toBe(1);
    expect(data.progress.xp).toBeGreaterThan(0);
    expect(data.tooFast).toBe(false);
  });

  it('is idempotent under concurrent double submit (Promise.all)', async () => {
    const createRes = await app.request('/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_investigator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caseId: 'case_0001', mode: 'normal' }),
    });
    const { session } = await createRes.json();
    clock.advance(20_000);

    const submissionPayload = {
      hypothesisId: case0001.truth.solutionHypothesisId,
      supportingClueIds: ['clue_message_carrier'],
      contradictions: [],
    };

    // Fire concurrent submits
    const [res1, res2] = await Promise.all([
      app.request(`/sessions/${session.id}/submit`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_investigator',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload),
      }),
      app.request(`/sessions/${session.id}/submit`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_investigator',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload),
      }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const data1 = await res1.json();
    const data2 = await res2.json();

    // Exactly one result row and identical score/xp
    expect(data1.result.score).toBe(data2.result.score);
    expect(data1.progress.xp).toBe(data2.progress.xp);
    expect(data1.progress.solvedCount).toBe(1);
  });

  it('flags too_fast if submitted below minimum duration', async () => {
    const createRes = await app.request('/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_investigator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caseId: 'case_0001', mode: 'normal' }),
    });
    const { session } = await createRes.json();

    // Advance only 3 seconds (< 15 seconds)
    clock.advance(3_000);

    const submitRes = await app.request(`/sessions/${session.id}/submit`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_investigator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hypothesisId: case0001.truth.solutionHypothesisId,
        supportingClueIds: [],
        contradictions: [],
      }),
    });

    expect(submitRes.status).toBe(200);
    const data = await submitRes.json();
    expect(data.tooFast).toBe(true);
  });

  it('awards reduced XP in replay mode (0.25x)', async () => {
    // Normal solve first
    const normSessionRes = await app.request('/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_investigator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caseId: 'case_0001', mode: 'normal' }),
    });
    const { session: normSession } = await normSessionRes.json();
    clock.advance(20_000);

    const normSubmitRes = await app.request(`/sessions/${normSession.id}/submit`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_investigator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hypothesisId: case0001.truth.solutionHypothesisId,
        supportingClueIds: ['clue_message_carrier'],
        contradictions: [],
      }),
    });
    const normData = await normSubmitRes.json();
    const normalXp = normData.result.score * 1.0; // diff 1 * 1.0

    // Now replay session
    const replaySessionRes = await app.request('/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_investigator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ caseId: 'case_0001', mode: 'replay' }),
    });
    const { session: replaySession } = await replaySessionRes.json();
    clock.advance(20_000);

    const replaySubmitRes = await app.request(`/sessions/${replaySession.id}/submit`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_investigator',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hypothesisId: case0001.truth.solutionHypothesisId,
        supportingClueIds: ['clue_message_carrier'],
        contradictions: [],
      }),
    });
    const replayData = await replaySubmitRes.json();

    const expectedReplayXpGain = Math.round(normData.result.score * case0001.difficulty * 0.25);
    const actualReplayXpGain = replayData.progress.xp - normData.progress.xp;
    expect(actualReplayXpGain).toBe(expectedReplayXpGain);
  });
});
