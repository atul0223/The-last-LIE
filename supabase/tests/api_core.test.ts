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

describe('WP-41 API Core Suite', () => {
  let repo: InMemoryRepository;
  let auth: MockAuthVerifier;
  let clock: MockClock;
  let rateLimiter: InMemoryRateLimiter;
  let config: AppConfig;
  let app: ReturnType<typeof createApp>;

  const userA = { userId: 'user_alice' };
  const userB = { userId: 'user_bob' };

  beforeEach(async () => {
    repo = new InMemoryRepository();
    auth = new MockAuthVerifier([userA, userB]);
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

    // Publish case_0001 with its default clues
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

    // Set daily case for today
    await repo.setDailyCase('2026-11-01', case0001.id);

    app = createApp({
      repo,
      auth,
      clock,
      rateLimiter,
      config,
    });
  });

  describe('Happy Paths & DeepScan Verification', () => {
    it('creates a new session and returns sanitized public case (POST /sessions)', async () => {
      const res = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId: 'case_0001',
          mode: 'normal',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.session.userId).toBe('user_alice');
      expect(data.session.caseId).toBe('case_0001');
      expect(data.case.id).toBe('case_0001');

      // DeepScan for answer leaks
      const leaks = deepScanForLeaks(data);
      expect(leaks).toEqual([]);
    });

    it('unlocks a clue with valid prerequisite (POST /sessions/:id/unlock)', async () => {
      // 1. Create session
      const createRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const createData = await createRes.json();
      const sessionId = createData.session.id;

      // 2. Unlock clue_keycard_exit via clue_maya_testimony prerequisite
      const unlockRes = await app.request(`/sessions/${sessionId}/unlock`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clueId: 'clue_keycard_exit',
          via: {
            kind: 'after_clue',
            clueId: 'clue_maya_testimony',
          },
        }),
      });

      expect(unlockRes.status).toBe(200);
      const unlockData = await unlockRes.json();
      expect(unlockData.clue.id).toBe('clue_keycard_exit');
      expect(unlockData.unlockedClueIds).toContain('clue_keycard_exit');

      // DeepScan
      const leaks = deepScanForLeaks(unlockData);
      expect(leaks).toEqual([]);
    });

    it('unlocks a clue via placeholder id (locked_1)', async () => {
      const createRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const createData = await createRes.json();
      const sessionId = createData.session.id;

      // Unlock using placeholder 'locked_1' (corresponds to clue_keycard_exit)
      const unlockRes = await app.request(`/sessions/${sessionId}/unlock`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clueId: 'locked_1',
          via: {
            kind: 'after_clue',
            clueId: 'clue_maya_testimony',
          },
        }),
      });

      expect(unlockRes.status).toBe(200);
      const unlockData = await unlockRes.json();
      expect(unlockData.clue.id).toBe('clue_keycard_exit');
      expect(unlockData.unlockedClueIds).toContain('clue_keycard_exit');
    });

    it('saves evidence board state (PUT /sessions/:id/board)', async () => {
      const createRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const createData = await createRes.json();
      const sessionId = createData.session.id;

      const boardRes = await app.request(`/sessions/${sessionId}/board`, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board: {
            cards: [{ id: 'clue_maya_testimony', x: 100, y: 150 }],
            links: [],
          },
        }),
      });

      expect(boardRes.status).toBe(200);
      const boardData = await boardRes.json();
      expect(boardData.success).toBe(true);

      const leaks = deepScanForLeaks(boardData);
      expect(leaks).toEqual([]);
    });

    it('returns today UTC case only (GET /daily)', async () => {
      const res = await app.request('/daily', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.date).toBe('2026-11-01');
      expect(data.caseId).toBe('case_0001');
      expect(data.case.id).toBe('case_0001');

      // DeepScan
      const leaks = deepScanForLeaks(data);
      expect(leaks).toEqual([]);
    });
  });

  describe('Security, IDOR & Edge Cases', () => {
    it('prevents IDOR: user B cannot touch user A session (returns 404, not 403)', async () => {
      // User A creates session
      const createRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const { session } = await createRes.json();

      // User B attempts to access user A's session
      const idorUnlockRes = await app.request(`/sessions/${session.id}/unlock`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_bob',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clueId: 'clue_keycard_exit',
          via: { kind: 'after_clue', clueId: 'clue_maya_testimony' },
        }),
      });

      // Must return 404 to avoid enumeration
      expect(idorUnlockRes.status).toBe(404);
      const idorData = await idorUnlockRes.json();
      expect(idorData.error.code).toBe('SESSION_NOT_FOUND');

      // User B attempts to save board on user A's session
      const idorBoardRes = await app.request(`/sessions/${session.id}/board`, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer user_bob',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ board: { cards: [], links: [] } }),
      });

      expect(idorBoardRes.status).toBe(404);
    });

    it('rejects invalid or missing JWT (401 UNAUTHORIZED)', async () => {
      const noAuthRes = await app.request('/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      expect(noAuthRes.status).toBe(401);
      const noAuthData = await noAuthRes.json();
      expect(noAuthData.error.code).toBe('UNAUTHORIZED');

      const invalidAuthRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer invalid',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      expect(invalidAuthRes.status).toBe(401);
    });

    it('enforces 64KB body limit (413 PAYLOAD_TOO_LARGE)', async () => {
      const bigPayload = 'x'.repeat(70000);
      const res = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
          'Content-Length': bigPayload.length.toString(),
        },
        body: bigPayload,
      });

      expect(res.status).toBe(413);
      const data = await res.json();
      expect(data.error.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('enforces rate limiting at 60/min (429 TOO_MANY_REQUESTS)', async () => {
      // Fire 60 allowed requests
      for (let i = 0; i < 60; i++) {
        const res = await app.request('/daily', { method: 'GET' });
        expect(res.status).toBe(200);
      }

      // 61st request should be rate-limited
      const limitedRes = await app.request('/daily', { method: 'GET' });
      expect(limitedRes.status).toBe(429);
      const data = await limitedRes.json();
      expect(data.error.code).toBe('TOO_MANY_REQUESTS');
      expect(limitedRes.headers.get('Retry-After')).toBeDefined();
    });

    it('rejects clue unlock with unmet prerequisites', async () => {
      const createRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const { session } = await createRes.json();

      // Attempt to unlock clue_device_log before clue_keycard_exit is unlocked
      const res = await app.request(`/sessions/${session.id}/unlock`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clueId: 'clue_device_log',
          via: { kind: 'after_clue', clueId: 'clue_keycard_exit' },
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('UNLOCK_CONDITION_NOT_MET');
    });

    it('rejects unlocking an already unlocked clue', async () => {
      const createRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const { session } = await createRes.json();

      // Initial default clue clue_message_carrier is already unlocked
      const res = await app.request(`/sessions/${session.id}/unlock`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_alice',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clueId: 'clue_message_carrier',
          via: { kind: 'default' },
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('CLUE_ALREADY_UNLOCKED');
    });

    it('returns standard 404 envelope on non-existent endpoint', async () => {
      const res = await app.request('/non_existent_route', { method: 'GET' });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.requestId).toBeDefined();
    });
  });
});
