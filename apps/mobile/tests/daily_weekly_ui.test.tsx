import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';
import type { ApiClient, WeeklyCaseResponse, WeeklyAggregateResponse } from '@lastlie/api-contract';
import type { CasePublic } from '@lastlie/case-engine';
import { computeDailyStreak, getPreviousDate } from '../src/features/home/streak';
import { LocalGameService } from '../src/services/local/LocalGameService';
import { WeeklySection } from '../src/features/challenges/WeeklySection';
import { formatTimeRemaining } from '../src/features/challenges/useWeekly';

const FORBIDDEN_LEAK_KEYS = new Set([
  'truth',
  'claims',
  'culpritIds',
  'seed',
  'keyEvidence',
  'liars',
  'solutionHypothesisId',
]);

function deepScan(value: unknown, path = 'root'): void {
  if (value === null || value === undefined) return;
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => deepScan(item, `${path}[${idx}]`));
    } else {
      const record = value as Record<string, unknown>;
      for (const [key, val] of Object.entries(record)) {
        if (FORBIDDEN_LEAK_KEYS.has(key)) {
          throw new Error(`Security leak detected: key '${key}' found at path '${path}.${key}'`);
        }
        deepScan(val, `${path}.${key}`);
      }
    }
  }
}

describe('WP-50/55: Daily & Weekly UI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Daily Streak Computation (No Penalties on Miss)', () => {
    it('handles empty dates gracefully with 0 streak', () => {
      const result = computeDailyStreak([]);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.playedToday).toBe(false);
    });

    it('computes streak of 1 when played today', () => {
      const now = new Date('2026-10-31T12:00:00.000Z');
      const dates = ['2026-10-31T08:00:00.000Z'];
      const result = computeDailyStreak(dates, now);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.playedToday).toBe(true);
    });

    it('computes consecutive days streak ending today', () => {
      const now = new Date('2026-10-31T12:00:00.000Z');
      const dates = [
        '2026-10-29T10:00:00.000Z',
        '2026-10-30T11:00:00.000Z',
        '2026-10-31T09:00:00.000Z',
      ];
      const result = computeDailyStreak(dates, now);
      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
      expect(result.playedToday).toBe(true);
    });

    it('preserves streak if played yesterday but not yet today', () => {
      const now = new Date('2026-10-31T12:00:00.000Z');
      const dates = [
        '2026-10-29T10:00:00.000Z',
        '2026-10-30T11:00:00.000Z',
      ];
      const result = computeDailyStreak(dates, now);
      expect(result.currentStreak).toBe(2);
      expect(result.longestStreak).toBe(2);
      expect(result.playedToday).toBe(false);
    });

    it('gracefully resets current streak when a day is missed without deleting career longest streak', () => {
      const now = new Date('2026-10-31T12:00:00.000Z');
      // Last played on 2026-10-28 (2 days gap)
      const dates = [
        '2026-10-26T10:00:00.000Z',
        '2026-10-27T10:00:00.000Z',
        '2026-10-28T10:00:00.000Z',
      ];
      const result = computeDailyStreak(dates, now);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(3);
      expect(result.playedToday).toBe(false);
    });

    it('getPreviousDate calculates correct previous YYYY-MM-DD across month boundaries', () => {
      expect(getPreviousDate('2026-11-01')).toBe('2026-10-31');
      expect(getPreviousDate('2026-03-01')).toBe('2026-02-28');
      expect(getPreviousDate('2026-01-01')).toBe('2025-12-31');
    });
  });

  describe('LocalGameService Deterministic Daily Case Selection', () => {
    it('returns the same case deterministically for the same UTC date string', async () => {
      const service = new LocalGameService();
      const caseA = await service.getDaily('2026-10-31');
      const caseB = await service.getDaily('2026-10-31');
      expect(caseA.caseId).toBe(caseB.caseId);
      expect(caseA.title).toBe(caseB.title);
      expect(caseA.difficulty).toBe(caseB.difficulty);
    });

    it('cycles deterministically across dates', async () => {
      const service = new LocalGameService();
      const case1 = await service.getDaily('2026-10-30');
      const case2 = await service.getDaily('2026-10-31');
      const case3 = await service.getDaily('2026-11-01');

      expect(case1.caseId).toBeTruthy();
      expect(case2.caseId).toBeTruthy();
      expect(case3.caseId).toBeTruthy();
    });

    it('passes deepScan security check with zero sensitive leaks', async () => {
      const service = new LocalGameService();
      const daily = await service.getDaily('2026-10-31');
      expect(() => deepScan(daily)).not.toThrow();
    });
  });

  describe('Weekly Countdown Formatting', () => {
    it('formats days and hours when closesAt is > 24 hours away', () => {
      const now = new Date('2026-10-31T12:00:00.000Z').getTime();
      const closesAt = new Date('2026-11-03T18:30:00.000Z').toISOString();
      const text = formatTimeRemaining(closesAt, now);
      expect(text).toContain('3D');
      expect(text).toContain('REMAINING');
    });

    it('formats hours and minutes when closesAt is < 24 hours away', () => {
      const now = new Date('2026-10-31T12:00:00.000Z').getTime();
      const closesAt = new Date('2026-10-31T16:45:00.000Z').toISOString();
      const text = formatTimeRemaining(closesAt, now);
      expect(text).toBe('4H 45M REMAINING');
    });

    it('returns WINDOW CLOSED when past closesAt', () => {
      const now = new Date('2026-10-31T12:00:00.000Z').getTime();
      const closesAt = new Date('2026-10-31T11:00:00.000Z').toISOString();
      const text = formatTimeRemaining(closesAt, now);
      expect(text).toBe('WINDOW CLOSED');
    });
  });

  describe('WeeklySection Component', () => {
    const mockCase: CasePublic = {
      id: 'case_0001',
      version: 1,
      kind: 'authored',
      title: 'The Missing Message',
      difficulty: 1,
      estimatedMinutes: 6,
      mysteryType: 'theft',
      briefing: 'Encrypted drive breached.',
      setting: {
        date: '2026-10-26',
        locationIds: ['loc_office'],
        summary: 'Encrypted drive breached in Maya Lin’s office.',
      },
      characters: [],
      locations: [],
      objects: [],
      clues: [],
      lockedClueIds: [],
      hypotheses: [],
      meta: { status: 'published' },
    };

    const mockOpenWeekly: WeeklyCaseResponse = {
      id: 'weekly_2026_w44',
      caseId: 'case_0001',
      weekNumber: 44,
      year: 2026,
      opensAt: '2026-10-26T00:00:00.000Z',
      closesAt: '2026-11-02T00:00:00.000Z',
      isOpen: true,
      case: mockCase,
    };

    const mockClosedWeekly: WeeklyCaseResponse = {
      id: 'weekly_2026_w43',
      caseId: 'case_0001',
      weekNumber: 43,
      year: 2026,
      opensAt: '2026-10-19T00:00:00.000Z',
      closesAt: '2026-10-26T00:00:00.000Z',
      isOpen: false,
      case: mockCase,
    };

    const mockAggregate: WeeklyAggregateResponse = {
      weeklyId: 'weekly_2026_w43',
      totalParticipants: 42,
      averageScore: 820,
      hypothesisDistribution: {
        hyp_maya_innocent: 28,
        hyp_arjun_framed: 14,
      },
      clueUsage: {
        clue_server_log: 39,
        clue_alibi_note: 33,
      },
      leaderboard: [
        {
          rank: 1,
          userId: 'user_ace',
          displayName: 'Detective Miller',
          score: 950,
          submittedAt: '2026-10-20T10:00:00.000Z',
        },
        {
          rank: 2,
          userId: 'user_fox',
          displayName: 'Agent Sterling',
          score: 890,
          submittedAt: '2026-10-20T12:00:00.000Z',
        },
      ],
    };

    it('renders OPEN weekly window with countdown and start CTA', async () => {
      const mockClient: ApiClient = {
        getWeekly: vi.fn().mockResolvedValue(mockOpenWeekly),
        getWeeklyAggregate: vi.fn().mockResolvedValue(null),
      } as unknown as ApiClient;

      let tree: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(<WeeklySection apiClientOverride={mockClient} />);
      });

      const jsonStr = JSON.stringify(tree!.toJSON());
      expect(jsonStr).toContain('WEEKLY COMMUNITY DUEL');
      expect(jsonStr).toContain('WEEK #44 // 2026');
      expect(jsonStr).toContain('PARTICIPATE IN WEEKLY CASE');
      expect(jsonStr).toContain('The Missing Message');
      expect(jsonStr).not.toContain('COMMUNITY LEADERBOARD'); // Locked while open
    });

    it('renders CLOSED weekly window with leaderboard, aggregate stats, and community theories', async () => {
      const mockClient: ApiClient = {
        getWeekly: vi.fn().mockResolvedValue(mockClosedWeekly),
        getWeeklyAggregate: vi.fn().mockResolvedValue(mockAggregate),
      } as unknown as ApiClient;

      let tree: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(<WeeklySection apiClientOverride={mockClient} />);
      });

      const jsonStr = JSON.stringify(tree!.toJSON());
      expect(jsonStr).toContain('WINDOW CLOSED');
      expect(jsonStr).toContain('COMMUNITY LEADERBOARD');
      expect(jsonStr).toContain('Detective Miller');
      expect(jsonStr).toContain('950 PTS');
      expect(jsonStr).toContain('Agent Sterling');
      expect(jsonStr).toContain('890 PTS');
      expect(jsonStr).toContain('COMMUNITY THEORIES');
      expect(jsonStr).toContain('42'); // total participants
      expect(jsonStr).toContain('820'); // avg score
    });

    it('triggers onSessionLaunched when participate button is pressed', async () => {
      const mockClient: ApiClient = {
        getWeekly: vi.fn().mockResolvedValue(mockOpenWeekly),
        getWeeklyAggregate: vi.fn().mockResolvedValue(null),
      } as unknown as ApiClient;

      const onLaunched = vi.fn();
      let tree: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(
          <WeeklySection
            apiClientOverride={mockClient}
            onSessionLaunched={onLaunched}
          />
        );
      });

      const button = tree!.root.findByProps({ testID: 'weekly.button.start' });
      await act(async () => {
        button.props.onPress();
      });

      expect(onLaunched).toHaveBeenCalled();
    });

    it('passes deepScan security check on rendered weekly data', async () => {
      const mockClient: ApiClient = {
        getWeekly: vi.fn().mockResolvedValue(mockClosedWeekly),
        getWeeklyAggregate: vi.fn().mockResolvedValue(mockAggregate),
      } as unknown as ApiClient;

      let tree: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(<WeeklySection apiClientOverride={mockClient} />);
      });

      expect(() => deepScan(tree!.toJSON())).not.toThrow();
    });
  });
});
