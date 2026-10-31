import { describe, it, expect } from 'vitest';
import {
  handleAdminScheduleDaily,
  handleAdminSetWeekly,
  handleAdminRetireCase,
  handleAdminPurge,
  type AdminOpsClient,
} from '../src/admin/index.js';

describe('WP-63 Admin & Ops Tooling Suite', () => {
  const mockCases = [
    { id: 'case_0001', title: 'The Forged Telegram', status: 'published' },
    { id: 'case_0002', title: 'The Missing Artifact', status: 'published' },
    { id: 'case_0003', title: 'The Silent Dispatch', status: 'draft' },
  ];

  const createMockClient = (): AdminOpsClient & {
    dailySchedule: Map<string, string>;
    weeklyCases: Map<string, { id: string; caseId: string; startsAt: string; endsAt: string }>;
    retiredCases: Set<string>;
    purgedCallCount: number;
  } => {
    const dailySchedule = new Map<string, string>();
    const weeklyCases = new Map<string, { id: string; caseId: string; startsAt: string; endsAt: string }>();
    const retiredCases = new Set<string>();
    let purgedCallCount = 0;

    return {
      dailySchedule,
      weeklyCases,
      retiredCases,
      get purgedCallCount() {
        return purgedCallCount;
      },
      async listEligibleDailyCases() {
        return mockCases.filter((c) => c.status === 'published' && !retiredCases.has(c.id));
      },
      async setDailyCase(date: string, caseId: string) {
        dailySchedule.set(date, caseId);
      },
      async getCase(caseId: string) {
        const found = mockCases.find((c) => c.id === caseId);
        if (!found) return null;
        return {
          ...found,
          status: retiredCases.has(caseId) ? 'retired' : found.status,
        };
      },
      async setWeeklyCase(weekly: { id: string; caseId: string; startsAt: string; endsAt: string }) {
        weeklyCases.set(weekly.id, weekly);
      },
      async retireCase(caseId: string) {
        retiredCases.add(caseId);
        return true;
      },
      async purgeExpiredRecords(olderThanDays: number) {
        purgedCallCount++;
        return { purgedCount: olderThanDays * 2 };
      },
    };
  };

  describe('schedule-daily', () => {
    it('validates date format and limits', async () => {
      await expect(
        handleAdminScheduleDaily({
          from: 'invalid-date',
          days: 5,
          env: 'local',
        }),
      ).rejects.toThrow('Invalid --from date format');

      await expect(
        handleAdminScheduleDaily({
          from: '2026-11-01',
          days: 0,
          env: 'local',
        }),
      ).rejects.toThrow('Invalid --days');
    });

    it('previews daily schedule in dry-run mode without writing', async () => {
      const client = createMockClient();
      const res = await handleAdminScheduleDaily({
        from: '2026-11-01',
        days: 3,
        env: 'local',
        dryRun: true,
        client,
      });

      expect(res.success).toBe(true);
      expect(res.applied).toBe(false);
      expect(res.planned).toHaveLength(3);
      expect(res.planned[0]?.date).toBe('2026-11-01');
      expect(client.dailySchedule.size).toBe(0);
    });

    it('applies daily schedule when dryRun is false', async () => {
      const client = createMockClient();
      const res = await handleAdminScheduleDaily({
        from: '2026-11-01',
        days: 3,
        env: 'local',
        dryRun: false,
        client,
      });

      expect(res.success).toBe(true);
      expect(res.applied).toBe(true);
      expect(client.dailySchedule.size).toBe(3);
      expect(client.dailySchedule.get('2026-11-01')).toBe('case_0001');
    });

    it('blocks prod execution without explicit confirmation', async () => {
      const client = createMockClient();
      await expect(
        handleAdminScheduleDaily({
          from: '2026-11-01',
          days: 3,
          env: 'prod',
          dryRun: false,
          confirmProd: false,
          client,
        }),
      ).rejects.toThrow('Production operations without dry-run require explicit confirmation');
    });
  });

  describe('set-weekly', () => {
    it('validates window timestamps and order', async () => {
      await expect(
        handleAdminSetWeekly({
          caseId: 'case_0001',
          open: 'invalid',
          close: '2026-11-08T00:00:00Z',
          env: 'local',
        }),
      ).rejects.toThrow('Invalid --open ISO timestamp');

      await expect(
        handleAdminSetWeekly({
          caseId: 'case_0001',
          open: '2026-11-08T00:00:00Z',
          close: '2026-11-01T00:00:00Z',
          env: 'local',
        }),
      ).rejects.toThrow('--open timestamp must be before --close timestamp');
    });

    it('refuses draft or nonexistent case for weekly', async () => {
      const client = createMockClient();
      await expect(
        handleAdminSetWeekly({
          caseId: 'case_0003', // draft
          open: '2026-11-01T00:00:00Z',
          close: '2026-11-08T00:00:00Z',
          env: 'local',
          client,
        }),
      ).rejects.toThrow("must be 'published'");
    });

    it('previews and applies weekly configuration', async () => {
      const client = createMockClient();
      const res = await handleAdminSetWeekly({
        caseId: 'case_0001',
        open: '2026-11-01T00:00:00Z',
        close: '2026-11-08T00:00:00Z',
        env: 'local',
        dryRun: false,
        client,
      });

      expect(res.success).toBe(true);
      expect(res.applied).toBe(true);
      expect(client.weeklyCases.size).toBe(1);
    });
  });

  describe('retire-case', () => {
    it('previews and retires case', async () => {
      const client = createMockClient();

      // Dry run
      const dryRes = await handleAdminRetireCase({
        caseId: 'case_0001',
        env: 'local',
        dryRun: true,
        client,
      });
      expect(dryRes.applied).toBe(false);
      expect(client.retiredCases.has('case_0001')).toBe(false);

      // Apply
      const applyRes = await handleAdminRetireCase({
        caseId: 'case_0001',
        env: 'local',
        dryRun: false,
        client,
      });
      expect(applyRes.applied).toBe(true);
      expect(client.retiredCases.has('case_0001')).toBe(true);

      // Already retired check
      const reRetire = await handleAdminRetireCase({
        caseId: 'case_0001',
        env: 'local',
        dryRun: false,
        client,
      });
      expect(reRetire.message).toContain('already retired');
    });
  });

  describe('purge', () => {
    it('validates retention threshold and executes purge', async () => {
      const client = createMockClient();

      await expect(
        handleAdminPurge({
          olderThanDays: 0,
          env: 'local',
          client,
        }),
      ).rejects.toThrow('Must be at least 1 day');

      // Dry run
      const dryRes = await handleAdminPurge({
        olderThanDays: 30,
        env: 'local',
        dryRun: true,
        client,
      });
      expect(dryRes.applied).toBe(false);
      expect(client.purgedCallCount).toBe(0);

      // Apply
      const applyRes = await handleAdminPurge({
        olderThanDays: 30,
        env: 'local',
        dryRun: false,
        client,
      });
      expect(applyRes.applied).toBe(true);
      expect(applyRes.purgedCount).toBe(60);
      expect(client.purgedCallCount).toBe(1);
    });
  });
});
