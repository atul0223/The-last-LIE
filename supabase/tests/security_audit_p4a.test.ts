import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../functions/api/app.js';
import { InMemoryRepository } from '../functions/_shared/in_memory_repo.js';
import { MockAuthVerifier } from '../functions/_shared/auth.js';
import { MockClock } from '../functions/_shared/clock.js';
import { InMemoryRateLimiter } from '../functions/_shared/rate_limiter.js';
import { deepScanForLeaks } from '../functions/_shared/deep_scan.js';
import { signGuestToken } from '../functions/_shared/guest_token.js';
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

describe('R3 Security Audit: Phase 4 API Security Gate (audit-p4a)', () => {
  let repo: InMemoryRepository;
  let auth: MockAuthVerifier;
  let clock: MockClock;
  let rateLimiter: InMemoryRateLimiter;
  let config: AppConfig;
  let app: ReturnType<typeof createApp>;

  const userAlice = { userId: 'user_alice' };
  const userBob = { userId: 'user_bob' };

  beforeEach(async () => {
    repo = new InMemoryRepository();
    auth = new MockAuthVerifier([userAlice, userBob]);
    clock = new MockClock('2026-11-01T10:00:00Z');
    rateLimiter = new InMemoryRateLimiter();

    config = {
      env: 'test',
      corsOrigins: ['*'],
      rateLimitPerMin: 10,
      maxBodySizeBytes: 4096, // 4KB for test limit
      guestHmacSecret: 'audit_test_hmac_secret_key_secure',
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

  describe('A. IDOR & Authorization Defense', () => {
    it('prevents User Bob from unlocking clues in User Alice session', async () => {
      // 1. Alice creates session
      const sessRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const { session } = await sessRes.json();

      // 2. Bob attempts to unlock clue in Alice's session -> must be rejected (404/403)
      const attackRes = await app.request(`/sessions/${session.id}/unlock`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_bob',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clueId: 'clue_marcus_keycard' }),
      });

      expect([403, 404]).toContain(attackRes.status);
    });

    it('prevents User Bob from saving evidence boards in User Alice session', async () => {
      const sessRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const { session } = await sessRes.json();

      const attackRes = await app.request(`/sessions/${session.id}/board`, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer user_bob',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ links: [] }),
      });

      expect([403, 404]).toContain(attackRes.status);
    });

    it('prevents User Bob from submitting User Alice session', async () => {
      const sessRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const { session } = await sessRes.json();

      const attackRes = await app.request(`/sessions/${session.id}/submit`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_bob',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hypothesisId: case0001.truth.solutionHypothesisId,
          supportingClueIds: [],
          contradictions: [],
        }),
      });

      expect([403, 404]).toContain(attackRes.status);
    });

    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const protectedEndpoints = [
        { path: '/sessions', method: 'POST', body: { caseId: 'case_0001' } },
        { path: '/sessions/fake_session/unlock', method: 'POST', body: { clueId: 'clue_test' } },
        { path: '/sessions/fake_session/board', method: 'PUT', body: { links: [] } },
        { path: '/sessions/fake_session/submit', method: 'POST', body: {} },
        { path: '/challenges', method: 'POST', body: { sessionId: 'fake_session' } },
        { path: '/account/migrate-local', method: 'POST', body: { solvedCaseIds: [], localResults: [] } },
        { path: '/account', method: 'DELETE', body: undefined },
        { path: '/push/token', method: 'POST', body: { token: 'exp_tok', platform: 'ios' } },
        { path: '/graph', method: 'GET', body: undefined },
      ];

      for (const ep of protectedEndpoints) {
        const res = await app.request(ep.path, {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' },
          body: ep.body ? JSON.stringify(ep.body) : undefined,
        });

        expect(res.status).toBe(401);
      }
    });
  });

  describe('B. Anti-Cheat & Scoring Integrity', () => {
    it('enforces idempotency on re-submission without duplicate XP', async () => {
      const sessRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const { session } = await sessRes.json();
      clock.advance(30_000);

      const submitPayload = {
        hypothesisId: case0001.truth.solutionHypothesisId,
        supportingClueIds: ['clue_message_carrier'],
        contradictions: [],
      };

      const res1 = await app.request(`/sessions/${session.id}/submit`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitPayload),
      });
      expect(res1.status).toBe(200);
      const data1 = await res1.json();

      const res2 = await app.request(`/sessions/${session.id}/submit`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitPayload),
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();

      // Score and XP must be identical
      expect(data1.result.score).toBe(data2.result.score);
      expect(data1.progress.xp).toBe(data2.progress.xp);
      expect(data1.progress.solvedCount).toBe(1);
      expect(data2.progress.solvedCount).toBe(1);
    });

    it('enforces too_fast flag when submitted in under 15 seconds', async () => {
      const sessRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const { session } = await sessRes.json();
      clock.advance(5_000); // 5s < 15s

      const res = await app.request(`/sessions/${session.id}/submit`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hypothesisId: case0001.truth.solutionHypothesisId,
          supportingClueIds: [],
          contradictions: [],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tooFast).toBe(true);
    });

    it('local progress migration grants archive unlocks with ZERO retroactive XP', async () => {
      const res = await app.request('/account/migrate-local', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solvedCaseIds: ['case_0001'],
          localResults: [
            {
              caseId: 'case_0001',
              completedAt: '2026-10-20T00:00:00Z',
            },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.unlockedCaseIds).toContain('case_0001');

      // Verify Alice has 0 XP on remote server
      const progress = await repo.getPlayerProgress('user_alice');
      expect(progress?.xp ?? 0).toBe(0);
    });
  });

  describe('C. Guest Tokens & Challenge Defense', () => {
    it('rejects forged HMAC guest tokens', async () => {
      const fakeToken = 'eyJjaGFsbGVuZ2VJZCI6ImZha2UiLCJleHAiOjk5OTk5OTk5OTl9.forged_signature';

      const res = await app.request('/challenges/fake_code/attach', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guestToken: fakeToken }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('GUEST_TOKEN_INVALID');
    });

    it('rejects expired guest tokens', async () => {
      // Sign a token with -1 days expiration (already expired)
      const { token } = signGuestToken(
        { challengeId: 'chal_test', caseId: 'case_0001', guestId: 'guest_1' },
        config.guestHmacSecret,
        -1, // expired yesterday
      );

      const res = await app.request('/challenges/chal_test/attach', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guestToken: token }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('GUEST_TOKEN_INVALID');
    });

    it('denies compare view to challengers who have not completed the challenge', async () => {
      // 1. Alice creates and completes challenge
      const sessRes = await app.request('/sessions', {
        method: 'POST',
        headers: { Authorization: 'Bearer user_alice', 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const { session } = await sessRes.json();
      clock.advance(20_000);

      await app.request(`/sessions/${session.id}/submit`, {
        method: 'POST',
        headers: { Authorization: 'Bearer user_alice', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hypothesisId: case0001.truth.solutionHypothesisId,
          supportingClueIds: [],
          contradictions: [],
        }),
      });

      const chalRes = await app.request('/challenges', {
        method: 'POST',
        headers: { Authorization: 'Bearer user_alice', 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const { code } = await chalRes.json();

      // 2. Bob attempts compare before completing -> 403 SUBMISSION_REQUIRED
      const compareRes = await app.request(`/challenges/${code}/compare`, {
        method: 'GET',
        headers: { Authorization: 'Bearer user_bob' },
      });

      expect(compareRes.status).toBe(403);
      const compareData = await compareRes.json();
      expect(compareData.error.code).toBe('SUBMISSION_REQUIRED');
    });
  });

  describe('D. Input Validation & Abuse Defense', () => {
    it('enforces request body size limits and rejects payload too large (> 4KB)', async () => {
      const giantString = 'x'.repeat(10000); // 10KB > 4KB limit
      const res = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
          'Content-Length': '10000',
        },
        body: JSON.stringify({ caseId: 'case_0001', padding: giantString }),
      });

      expect([413, 400]).toContain(res.status);
    });

    it('enforces rate limiting when request threshold is exceeded', async () => {
      // Limit is configured to 10/min
      let lastStatus = 200;
      for (let i = 0; i < 15; i++) {
        const res = await app.request('/daily', {
          method: 'GET',
          headers: {
            'x-forwarded-for': '192.168.1.100',
          },
        });
        lastStatus = res.status;
      }

      expect(lastStatus).toBe(429);
    });
  });

  describe('E. DeepScan Answer & Secret Leak Defense', () => {
    it('ensures zero engine forbidden keys in session creation and initial case presentation', async () => {
      const res = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();

      // Deep scan public payload
      expect(deepScanForLeaks(data.case)).toEqual([]);

      // Verify no locked clue text leaked
      const lockedClues = data.case.clues.filter((c: any) => c.locked === true);
      expect(lockedClues.length).toBeGreaterThan(0);
      for (const c of lockedClues) {
        expect('text' in c).toBe(false);
        expect('asserts' in c).toBe(false);
      }
    });

    it('ensures zero unrevealed node names leaked in GET /graph', async () => {
      // 1. Fresh Alice GET /graph -> empty
      const freshRes = await app.request('/graph', {
        method: 'GET',
        headers: { Authorization: 'Bearer user_alice' },
      });
      expect(freshRes.status).toBe(200);
      const freshData = await freshRes.json();
      expect(freshData.nodes).toEqual([]);
      expect(freshData.edges).toEqual([]);
      expect(deepScanForLeaks(freshData)).toEqual([]);

      // 2. Solve case_0001 and grant reveals
      await repo.grantGraphReveals('user_alice', 'case_0001');

      // 3. Alice GET /graph
      const solvedRes = await app.request('/graph', {
        method: 'GET',
        headers: { Authorization: 'Bearer user_alice' },
      });
      expect(solvedRes.status).toBe(200);
      const solvedData = await solvedRes.json();
      expect(deepScanForLeaks(solvedData)).toEqual([]);

      // 4. Verify unrevealed 1-hop neighbours have null names and null descriptions
      const unrevealed = solvedData.nodes.filter((n: any) => n.revealed === false);
      for (const node of unrevealed) {
        expect(node.name).toBeNull();
        expect(node.description).toBeNull();
      }
    });
  });
});
