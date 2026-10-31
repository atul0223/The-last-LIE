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

describe('WP-44s Account & Push Routes Suite', () => {
  let repo: InMemoryRepository;
  let auth: MockAuthVerifier;
  let clock: MockClock;
  let rateLimiter: InMemoryRateLimiter;
  let config: AppConfig;
  let app: ReturnType<typeof createApp>;

  const user = { userId: 'user_migrator' };

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

    const publicCase = toPublicCase(case0001, ['clue_message_carrier']);
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

  describe('Local Progress Migration (Anti-Cheat)', () => {
    it('grants archive unlocks only and never awards XP', async () => {
      const migrateRes = await app.request('/account/migrate-local', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_migrator',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solvedCaseIds: ['case_0001'],
          localResults: [
            { caseId: 'case_0001', completedAt: '2026-10-30T12:00:00Z' },
          ],
        }),
      });

      expect(migrateRes.status).toBe(200);
      const data = await migrateRes.json();
      expect(data.success).toBe(true);
      expect(data.unlockedCaseIds).toContain('case_0001');

      // Verify that NO XP was granted (anti-cheat enforcement)
      const progress = await repo.getPlayerProgress('user_migrator');
      expect(progress).toBeNull(); // No progress/XP row created

      // DeepScan
      expect(deepScanForLeaks(data)).toEqual([]);
    });

    it('filters out non-existent case IDs during migration', async () => {
      const migrateRes = await app.request('/account/migrate-local', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_migrator',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solvedCaseIds: ['case_0001', 'case_non_existent'],
        }),
      });

      expect(migrateRes.status).toBe(200);
      const data = await migrateRes.json();
      expect(data.unlockedCaseIds).toEqual(['case_0001']);
      expect(data.unlockedCaseIds).not.toContain('case_non_existent');
    });
  });

  describe('Account Deletion', () => {
    it('permanently deletes user account and associated rows', async () => {
      // 1. Create a session and submit to generate rows
      const sessRes = await app.request('/sessions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_migrator',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: 'case_0001' }),
      });
      const { session } = await sessRes.json();
      clock.advance(20_000);

      await app.request(`/sessions/${session.id}/submit`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_migrator',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hypothesisId: case0001.truth.solutionHypothesisId,
          supportingClueIds: [],
          contradictions: [],
        }),
      });

      // Verify session exists
      const existingSession = await repo.getSession(session.id, 'user_migrator');
      expect(existingSession).toBeDefined();

      // 2. Execute DELETE /account
      const deleteRes = await app.request('/account', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer user_migrator',
        },
      });

      expect(deleteRes.status).toBe(200);
      const deleteData = await deleteRes.json();
      expect(deleteData.success).toBe(true);

      // 3. Verify user's session and progress are deleted
      const deletedSession = await repo.getSession(session.id, 'user_migrator');
      expect(deletedSession).toBeNull();

      const deletedProgress = await repo.getPlayerProgress('user_migrator');
      expect(deletedProgress).toBeNull();
    });
  });

  describe('Push Token Registration', () => {
    it('registers push notification token for authenticated user', async () => {
      const res = await app.request('/push/token', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_migrator',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'ExponentPushToken[AbCdEf123456]',
          platform: 'ios',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // DeepScan
      expect(deepScanForLeaks(data)).toEqual([]);
    });

    it('rejects unauthenticated push token registration (401 UNAUTHORIZED)', async () => {
      const res = await app.request('/push/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'ExponentPushToken[AbCdEf123456]',
        }),
      });

      expect(res.status).toBe(401);
    });

    it('unregisters push notification token for authenticated user (DELETE /push/token)', async () => {
      // First register
      await app.request('/push/token', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_migrator',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'ExponentPushToken[AbCdEf123456]',
          platform: 'ios',
        }),
      });

      // Now unregister
      const delRes = await app.request('/push/token', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer user_migrator',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'ExponentPushToken[AbCdEf123456]',
        }),
      });

      expect(delRes.status).toBe(200);
      const data = await delRes.json();
      expect(data.success).toBe(true);
      expect(deepScanForLeaks(data)).toEqual([]);
    });

    it('rejects unauthenticated push token deregistration (401 UNAUTHORIZED)', async () => {
      const res = await app.request('/push/token', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'ExponentPushToken[AbCdEf123456]',
        }),
      });

      expect(res.status).toBe(401);
    });
  });
});
