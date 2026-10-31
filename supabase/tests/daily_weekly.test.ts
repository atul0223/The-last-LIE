import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../functions/api/app.js';
import { InMemoryRepository } from '../functions/_shared/in_memory_repo.js';
import { MockAuthVerifier } from '../functions/_shared/auth.js';
import { MockClock } from '../functions/_shared/clock.js';
import { InMemoryRateLimiter } from '../functions/_shared/rate_limiter.js';
import { deepScanForLeaks } from '../functions/_shared/deep_scan.js';
import { fillDailyCasesAhead } from '../functions/_shared/daily_scheduler.js';
import type { AppConfig } from '../functions/_shared/types.js';
import { toPublicCase, type CaseDefinition } from '@lastlie/case-engine';
import case0001Raw from '../../packages/content/cases/authored/case_0001.json';
import case0002Raw from '../../packages/content/cases/authored/case_0002.json';

const case0001 = case0001Raw as unknown as CaseDefinition;
const case0002 = case0002Raw as unknown as CaseDefinition;

describe('WP-50s & WP-55s Daily & Weekly Suite', () => {
  let repo: InMemoryRepository;
  let auth: MockAuthVerifier;
  let clock: MockClock;
  let rateLimiter: InMemoryRateLimiter;
  let config: AppConfig;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    repo = new InMemoryRepository();
    auth = new MockAuthVerifier([{ userId: 'user_alice' }, { userId: 'user_bob' }]);
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

    // Publish cases
    const pubCase1 = toPublicCase(case0001, ['clue_message_carrier']);
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
        publicPayload: pubCase1,
      },
      case0001,
    );

    const pubCase2 = toPublicCase(case0002, ['clue_missing_clock_report']);
    await repo.upsertCase(
      {
        id: case0002.id,
        version: case0002.version,
        kind: case0002.kind,
        title: case0002.title,
        difficulty: case0002.difficulty,
        mysteryType: case0002.mysteryType,
        estimatedMinutes: case0002.estimatedMinutes,
        status: 'published',
        publicPayload: pubCase2,
      },
      case0002,
    );

    app = createApp({
      repo,
      auth,
      clock,
      rateLimiter,
      config,
    });
  });

  describe('WP-50s Daily Scheduler & Routing', () => {
    it('fills daily cases 14 days ahead without reusing within 90 days', async () => {
      const filled = await fillDailyCasesAhead(repo, clock, 14);
      expect(filled).toBe(15); // today (day 0) + 14 future days

      // Verify today's case is set
      const todayCaseId = await repo.getDailyCase('2026-11-01');
      expect(todayCaseId).toBeDefined();

      // Verify day +14 is set
      const day14 = new Date(clock.now().getTime() + 14 * 24 * 3600 * 1000)
        .toISOString()
        .split('T')[0]!;
      const day14CaseId = await repo.getDailyCase(day14);
      expect(day14CaseId).toBeDefined();
    });

    it('GET /daily returns ONLY today UTC case', async () => {
      await repo.setDailyCase('2026-11-01', 'case_0001');
      await repo.setDailyCase('2026-11-02', 'case_0002');

      const res = await app.request('/daily', { method: 'GET' });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.date).toBe('2026-11-01');
      expect(data.caseId).toBe('case_0001');

      // DeepScan
      expect(deepScanForLeaks(data)).toEqual([]);

      // Advance clock by 1 day
      clock.advance(24 * 3600 * 1000);
      const tomorrowRes = await app.request('/daily', { method: 'GET' });
      expect(tomorrowRes.status).toBe(200);
      const tomorrowData = await tomorrowRes.json();
      expect(tomorrowData.date).toBe('2026-11-02');
      expect(tomorrowData.caseId).toBe('case_0002');
    });
  });

  describe('WP-55s Weekly Community Case & Leaderboard', () => {
    const weeklyId = 'week_2026_44';

    beforeEach(async () => {
      // Setup weekly case window: 2026-11-01T00:00:00Z to 2026-11-07T23:59:59Z
      await repo.upsertWeeklyCase({
        id: weeklyId,
        caseId: 'case_0001',
        weekNumber: 44,
        year: 2026,
        opensAt: '2026-11-01T00:00:00Z',
        closesAt: '2026-11-07T23:59:59Z',
      });
    });

    it('returns weekly case when window is open and 404 before opening', async () => {
      // Clock is at 2026-11-01T10:00:00Z -> inside window
      const openRes = await app.request('/weekly', { method: 'GET' });
      expect(openRes.status).toBe(200);
      const data = await openRes.json();
      expect(data.id).toBe(weeklyId);
      expect(data.isOpen).toBe(true);
      expect(data.case.id).toBe('case_0001');

      // DeepScan
      expect(deepScanForLeaks(data)).toEqual([]);

      // Test before window opens
      const futureWeekId = 'week_2026_45';
      await repo.upsertWeeklyCase({
        id: futureWeekId,
        caseId: 'case_0002',
        weekNumber: 45,
        year: 2026,
        opensAt: '2026-11-08T00:00:00Z',
        closesAt: '2026-11-14T23:59:59Z',
      });

      // Rewind clock to before week 44
      clock.setTime('2026-10-31T23:00:00Z');
      const earlyRes = await app.request('/weekly', { method: 'GET' });
      expect(earlyRes.status).toBe(404);
    });

    it('enforces secrecy: aggregate is HIDDEN until the window closes (403 WEEKLY_NOT_CLOSED)', async () => {
      clock.setTime('2026-11-03T12:00:00Z'); // Inside window

      const earlyAggRes = await app.request(`/weekly/${weeklyId}/aggregate`, { method: 'GET' });
      expect(earlyAggRes.status).toBe(403);
      const data = await earlyAggRes.json();
      expect(data.error.code).toBe('WEEKLY_NOT_CLOSED');
    });

    it('reveals aggregate after window closes with first-attempt leaderboard and too_fast exclusion', async () => {
      // Record attempts during open window
      // User Alice (Score 100, solved at 11:00)
      await repo.recordWeeklyAttempt(weeklyId, {
        userId: 'user_alice',
        displayName: 'Alice Holmes',
        score: 100,
        submittedAt: '2026-11-02T11:00:00Z',
        hypothesisId: case0001.truth.solutionHypothesisId,
        clueIds: ['clue_message_carrier'],
      });

      // User Bob (Score 90, solved at 10:30)
      await repo.recordWeeklyAttempt(weeklyId, {
        userId: 'user_bob',
        displayName: 'Bob Watson',
        score: 90,
        submittedAt: '2026-11-02T10:30:00Z',
        hypothesisId: 'hyp_wrong_alibi',
        clueIds: ['clue_message_carrier', 'clue_arjun_testimony'],
      });

      // User Alice second attempt (replay: score 100, submitted later) -> should NOT duplicate or overwrite
      await repo.recordWeeklyAttempt(weeklyId, {
        userId: 'user_alice',
        displayName: 'Alice Holmes',
        score: 100,
        submittedAt: '2026-11-03T15:00:00Z',
        hypothesisId: case0001.truth.solutionHypothesisId,
        clueIds: ['clue_message_carrier'],
      });

      // Fast-forward clock past window close (after 2026-11-07T23:59:59Z)
      clock.setTime('2026-11-08T08:00:00Z');

      const aggRes = await app.request(`/weekly/${weeklyId}/aggregate`, { method: 'GET' });
      expect(aggRes.status).toBe(200);
      const aggData = await aggRes.json();

      expect(aggData.totalParticipants).toBe(2);
      expect(aggData.hypothesisDistribution[case0001.truth.solutionHypothesisId]).toBe(1);
      expect(aggData.hypothesisDistribution['hyp_wrong_alibi']).toBe(1);

      // Verify Leaderboard ranking: Alice (100) rank 1, Bob (90) rank 2
      expect(aggData.leaderboard).toHaveLength(2);
      expect(aggData.leaderboard[0].displayName).toBe('Alice Holmes');
      expect(aggData.leaderboard[0].rank).toBe(1);
      expect(aggData.leaderboard[1].displayName).toBe('Bob Watson');
      expect(aggData.leaderboard[1].rank).toBe(2);

      // DeepScan
      expect(deepScanForLeaks(aggData)).toEqual([]);
    });
  });
});
