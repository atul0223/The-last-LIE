import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../functions/api/app.js';
import { InMemoryRepository } from '../functions/_shared/in_memory_repo.js';
import { MockAuthVerifier } from '../functions/_shared/auth.js';
import { MockClock } from '../functions/_shared/clock.js';
import { InMemoryRateLimiter } from '../functions/_shared/rate_limiter.js';
import type { AppConfig } from '../functions/_shared/types.js';
import { toPublicCase, type CaseDefinition } from '@lastlie/case-engine';
import { handleAdminReports } from '../../tools/cli/src/admin/reports.js';
import case0001Raw from '../../packages/content/cases/authored/case_0001.json';

const case0001 = case0001Raw as unknown as CaseDefinition;

const defaultClueIds = [
  'clue_message_carrier',
  'clue_arjun_testimony',
  'clue_maya_testimony',
  'clue_rhea_testimony',
  'clue_marcus_log',
];

describe('WP-62 Case Reports & Moderation Suite', () => {
  let repo: InMemoryRepository;
  let auth: MockAuthVerifier;
  let clock: MockClock;
  let rateLimiter: InMemoryRateLimiter;
  let config: AppConfig;
  let app: ReturnType<typeof createApp>;

  const user1 = { userId: 'user_player_1' };
  const user2 = { userId: 'user_player_2' };
  const user3 = { userId: 'user_player_3' };
  const user4 = { userId: 'user_player_4' };
  const user5 = { userId: 'user_player_5' };

  beforeEach(async () => {
    repo = new InMemoryRepository();
    auth = new MockAuthVerifier([user1, user2, user3, user4, user5]);
    clock = new MockClock('2026-11-01T12:00:00Z');
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
        publishedAt: '2026-11-01T00:00:00Z',
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

  it('rejects unauthenticated reports with 401', async () => {
    const res = await app.request('/cases/case_0001/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'broken_logic' }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 for nonexistent case', async () => {
    const res = await app.request('/cases/case_nonexistent/report', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_player_1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'typo' }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('CASE_NOT_FOUND');
  });

  it('rejects invalid reason or note exceeding 280 characters with 400', async () => {
    // Invalid reason
    const resBadReason = await app.request('/cases/case_0001/report', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_player_1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'not_a_valid_reason' }),
    });
    expect(resBadReason.status).toBe(400);

    // Note too long (>280 chars)
    const resLongNote = await app.request('/cases/case_0001/report', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_player_1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'broken_logic',
        note: 'a'.repeat(281),
      }),
    });
    expect(resLongNote.status).toBe(400);
  });

  it('successfully records a report and returns 200', async () => {
    const res = await app.request('/cases/case_0001/report', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_player_1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'broken_logic',
        note: 'The carrier log does not contradict the alibi.',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.caseId).toBe('case_0001');
    expect(body.reportId).toBeDefined();
  });

  it('enforces 5 reports per day per user rate limit', async () => {
    // 5 allowed reports
    for (let i = 0; i < 5; i++) {
      const res = await app.request('/cases/case_0001/report', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer user_player_1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'unfair', note: `Report #${i + 1}` }),
      });
      expect(res.status).toBe(200);
    }

    // 6th report by the same user is rejected with 429
    const res6 = await app.request('/cases/case_0001/report', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_player_1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'unfair', note: 'One too many' }),
    });

    expect(res6.status).toBe(429);
    const body = await res6.json();
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('auto-flags case to under_review after 5 distinct users report within 7 days', async () => {
    const users = ['user_player_1', 'user_player_2', 'user_player_3', 'user_player_4'];

    // 4 distinct users report -> case stays published
    for (const u of users) {
      const res = await app.request('/cases/case_0001/report', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${u}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'broken_logic' }),
      });
      expect(res.status).toBe(200);
    }

    let caseRow = await repo.getPublishedCase('case_0001');
    expect(caseRow?.status).toBe('published');

    // 5th distinct user reports -> triggers auto-flagging
    const res5 = await app.request('/cases/case_0001/report', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer user_player_5',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'offensive' }),
    });
    expect(res5.status).toBe(200);

    // Case is now under_review (no longer returned by getPublishedCase)
    caseRow = await repo.getPublishedCase('case_0001');
    expect(caseRow).toBeNull();

    // Verify in repo listFlaggedCases
    const flagged = await repo.listFlaggedCases();
    expect(flagged.length).toBe(1);
    expect(flagged[0]?.caseId).toBe('case_0001');
    expect(flagged[0]?.status).toBe('under_review');
    expect(flagged[0]?.distinctReportingUsers).toBe(5);
    expect(flagged[0]?.reasons['broken_logic']).toBe(4);
    expect(flagged[0]?.reasons['offensive']).toBe(1);
  });

  it('admin CLI lists flagged cases and blocks prod execution', async () => {
    // 5 reports already filed in previous tests or direct inject
    for (const u of [user1, user2, user3, user4, user5]) {
      await repo.reportCase({
        caseId: 'case_0001',
        userId: u.userId,
        reason: 'broken_logic',
      });
    }

    // Admin CLI in local env
    const localRes = await handleAdminReports({
      env: 'local',
      client: {
        listFlaggedCases: () => repo.listFlaggedCases(),
      },
    });

    expect(localRes.success).toBe(true);
    expect(localRes.cases.length).toBe(1);
    expect(localRes.cases[0]?.caseId).toBe('case_0001');

    // Admin CLI in prod env is refused
    const prodRes = await handleAdminReports({
      env: 'prod',
      client: {
        listFlaggedCases: () => repo.listFlaggedCases(),
      },
    });

    expect(prodRes.success).toBe(false);
    expect(prodRes.message).toContain('restricted');
  });
});
