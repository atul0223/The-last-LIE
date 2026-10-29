import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';
import { selectNextCase } from '../src/features/home/selectNextCase';
import { CASE_CATALOG, type CaseCatalogItem } from '../src/features/library/catalog';
import HomeFeature from '../src/features/home';
import { setAppNavigator } from '../src/features/home/navigation';
import { useSessionStore } from '../src/store';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  router: {
    push: mockPush,
    back: vi.fn(),
  },
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
  }),
}));

const mockStartSession = vi.fn().mockResolvedValue({
  session: { id: 'sess_new_123', caseId: 'case_0001', status: 'in_progress' },
  case: { id: 'case_0001', title: 'The Missing Message' },
});

vi.mock('../src/store', async () => {
  const actual = await vi.importActual<typeof import('../src/store')>('../src/store');
  return {
    ...actual,
    useGameService: () => ({
      startSession: mockStartSession,
      unlockClue: vi.fn(),
      saveBoard: vi.fn(),
      submit: vi.fn(),
      getProgress: vi.fn().mockResolvedValue({
        rank: 'Junior Detective',
        masteryPoints: 0,
        solvedCasesCount: 0,
        streakDays: 0,
        unlockedDossiers: [],
      }),
      listArchive: vi.fn().mockResolvedValue([]),
      getDaily: vi.fn().mockResolvedValue({
        caseId: 'case_0001',
        title: 'The Missing Message',
        summary: 'Daily brief',
        difficulty: 1,
        estimatedMinutes: 6,
      }),
    }),
  };
});

describe('WP-24: Home Feature & Selection Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAppNavigator(mockPush);
    useSessionStore.setState({
      sessions: {},
      cases: {},
      results: {},
      readClueIds: {},
      errors: {},
      activeSessionId: null,
    });
  });

  describe('selectNextCase (Pure Selection Function)', () => {
    const testCases: CaseCatalogItem[] = [
      {
        id: 'c1',
        code: 'CASE-0001',
        title: 'Beginner Mystery',
        briefing: 'B1',
        summary: 'S1',
        difficulty: 1,
        mysteryType: 'forged_message',
        estimatedMinutes: 5,
        hypothesesCount: 3,
        cluesCount: 5,
      },
      {
        id: 'c2',
        code: 'CASE-0002',
        title: 'Intermediate Case',
        briefing: 'B2',
        summary: 'S2',
        difficulty: 2,
        mysteryType: 'missing_item',
        estimatedMinutes: 10,
        hypothesesCount: 3,
        cluesCount: 7,
      },
      {
        id: 'c3',
        code: 'CASE-0003',
        title: 'Advanced Mystery',
        briefing: 'B3',
        summary: 'S3',
        difficulty: 4,
        mysteryType: 'false_alibi',
        estimatedMinutes: 18,
        hypothesesCount: 4,
        cluesCount: 12,
      },
    ];

    it('picks the unplayed case closest to player level (level 1 -> difficulty 1)', () => {
      const res = selectNextCase(testCases, [], 1);
      expect(res.kind).toBe('unplayed');
      expect(res.caseItem?.id).toBe('c1');
    });

    it('picks unplayed case closest to player level (level 3 -> difficulty 2 or 4)', () => {
      const res = selectNextCase(testCases, ['c1'], 3);
      expect(res.kind).toBe('unplayed');
      // c2 (diff 2, dist 1) vs c3 (diff 4, dist 1); tie-breaker sorts by difficulty
      expect(res.caseItem?.id).toBe('c2');
    });

    it('skips solved cases and in-progress case', () => {
      const res = selectNextCase(testCases, ['c1'], 1, 'c2');
      expect(res.kind).toBe('unplayed');
      expect(res.caseItem?.id).toBe('c3');
    });

    it('falls back to archive suggestion when all cases are solved', () => {
      const solvedAll = ['c1', 'c2', 'c3'];
      const res = selectNextCase(testCases, solvedAll, 3);
      expect(res.kind).toBe('archive_replay');
      expect(res.caseItem).toBeDefined();
      expect(res.reason).toContain('All cases solved');
    });

    it('returns kind: none when available cases is empty', () => {
      const res = selectNextCase([], [], 1);
      expect(res.kind).toBe('none');
      expect(res.caseItem).toBeUndefined();
    });
  });

  describe('HomeFeature Component', () => {
    it('renders dominant "Solve a case" CTA, title, and daily investigation', () => {
      let root: renderer.ReactTestRenderer | undefined;
      act(() => {
        root = renderer.create(<HomeFeature />);
      });

      const str = JSON.stringify(root!.toJSON());
      expect(str).toContain('THE LAST LIE');
      expect(str).toContain('SOLVE A CASE');
      expect(str).toContain('DAILY INVESTIGATION');
      expect(str).toContain('The Missing Message');
    });

    it('does not render "Continue investigation" card when no session is in-progress', () => {
      let root: renderer.ReactTestRenderer | undefined;
      act(() => {
        root = renderer.create(<HomeFeature />);
      });

      const continueCard = root!.root.findAll((node) => node.props?.testID === 'home.card.continue');
      expect(continueCard.length).toBe(0);
    });

    it('renders "Continue investigation" card when a session is in-progress', async () => {
      useSessionStore.setState({
        sessions: {
          sess_open_01: {
            id: 'sess_open_01',
            caseId: 'case_0001',
            caseVersion: 1,
            mode: 'normal',
            unlockedClueIds: ['clue_1', 'clue_2'],
            board: { cards: [], links: [] },
            status: 'in_progress',
            startedAt: '2026-10-29T10:00:00Z',
          },
        },
        cases: {},
        results: {},
        readClueIds: {},
        errors: {},
        activeSessionId: 'sess_open_01',
      });

      let root: renderer.ReactTestRenderer | undefined;
      act(() => {
        root = renderer.create(<HomeFeature />);
      });

      const continueCard = root!.root.findByProps({ testID: 'home.card.continue' });
      expect(continueCard).toBeTruthy();

      // Tapping continue navigates to the open session
      await act(async () => {
        await continueCard.props.onPress();
      });
      expect(mockPush).toHaveBeenCalledWith('/case/sess_open_01');
    });

    it('tapping dominant "Solve a case" CTA starts or resumes recommended case', async () => {
      let root: renderer.ReactTestRenderer | undefined;
      act(() => {
        root = renderer.create(<HomeFeature />);
      });

      const ctaBtn = root!.root.findByProps({ testID: 'home.cta.solve' });
      expect(ctaBtn).toBeTruthy();

      await act(async () => {
        await ctaBtn.props.onPress();
      });

      expect(mockStartSession).toHaveBeenCalledWith({
        caseId: CASE_CATALOG[0]!.id,
        mode: 'normal',
      });
      expect(mockPush).toHaveBeenCalledWith('/case/sess_new_123');
    });

    it('tapping Daily card launches daily investigation', async () => {
      let root: renderer.ReactTestRenderer | undefined;
      act(() => {
        root = renderer.create(<HomeFeature />);
      });

      const dailyCard = root!.root.findByProps({ testID: 'home.card.daily' });
      expect(dailyCard).toBeTruthy();

      await act(async () => {
        dailyCard.props.onPress();
      });

      expect(mockStartSession).toHaveBeenCalledWith({
        caseId: 'case_0001',
        mode: 'daily',
      });
    });
  });
});
