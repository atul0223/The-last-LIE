import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';

// Provide minimal document mock for react-native-web TextInput in node test environment
if (typeof global.document === 'undefined') {
  // @ts-expect-error minimal document mock
  global.document = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    createElement: vi.fn().mockReturnValue({}),
  };
}
import { filterCases } from '../src/features/library/filterCases';
import type { CaseCatalogItem } from '../src/features/library/catalog';
import LibraryFeature from '../src/features/library';
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
  session: { id: 'sess_lib_999', caseId: 'case_0001', status: 'in_progress' },
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

describe('WP-24: Library Feature & Filter Logic', () => {
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

  describe('filterCases (Pure Filter Function)', () => {
    const testCases: CaseCatalogItem[] = [
      {
        id: 'case_0001',
        code: 'CASE-0001',
        title: 'The Missing Message',
        briefing: 'B1',
        summary: 'S1',
        difficulty: 1,
        mysteryType: 'forged_message',
        estimatedMinutes: 6,
        hypothesesCount: 3,
        cluesCount: 7,
      },
      {
        id: 'case_0002',
        code: 'CASE-0002',
        title: 'The Missing Astrum',
        briefing: 'B2',
        summary: 'S2',
        difficulty: 1,
        mysteryType: 'missing_item',
        estimatedMinutes: 4,
        hypothesesCount: 3,
        cluesCount: 8,
      },
      {
        id: 'case_0003',
        code: 'CASE-0003',
        title: 'The Alibi Cipher',
        briefing: 'B3',
        summary: 'S3',
        difficulty: 2,
        mysteryType: 'false_alibi',
        estimatedMinutes: 10,
        hypothesesCount: 3,
        cluesCount: 9,
      },
    ];

    it('returns all cases when filters are empty or all', () => {
      const filtered = filterCases(testCases, { difficulty: 'all', mysteryType: 'all', status: 'all' });
      expect(filtered.length).toBe(3);
    });

    it('filters by difficulty level', () => {
      const diff1 = filterCases(testCases, { difficulty: 1 });
      expect(diff1.map((c) => c.id)).toEqual(['case_0001', 'case_0002']);

      const diff2 = filterCases(testCases, { difficulty: 2 });
      expect(diff2.map((c) => c.id)).toEqual(['case_0003']);

      const diff4 = filterCases(testCases, { difficulty: 4 });
      expect(diff4.length).toBe(0);
    });

    it('filters by mystery type', () => {
      const messages = filterCases(testCases, { mysteryType: 'forged_message' });
      expect(messages.map((c) => c.id)).toEqual(['case_0001']);

      const items = filterCases(testCases, { mysteryType: 'missing_item' });
      expect(items.map((c) => c.id)).toEqual(['case_0002']);
    });

    it('filters by status (solved vs unsolved)', () => {
      const solvedIds = ['case_0001'];

      const solved = filterCases(testCases, { status: 'solved' }, solvedIds);
      expect(solved.map((c) => c.id)).toEqual(['case_0001']);

      const unsolved = filterCases(testCases, { status: 'unsolved' }, solvedIds);
      expect(unsolved.map((c) => c.id)).toEqual(['case_0002', 'case_0003']);
    });

    it('filters by search query matching title or code', () => {
      const byTitle = filterCases(testCases, { searchQuery: 'astrum' });
      expect(byTitle.map((c) => c.id)).toEqual(['case_0002']);

      const byCode = filterCases(testCases, { searchQuery: '0003' });
      expect(byCode.map((c) => c.id)).toEqual(['case_0003']);
    });

    it('handles combined multi-criteria filters', () => {
      const combined = filterCases(
        testCases,
        {
          difficulty: 1,
          mysteryType: 'missing_item',
          status: 'all',
        },
        ['case_0001'],
      );
      expect(combined.map((c) => c.id)).toEqual(['case_0002']);
    });
  });

  describe('LibraryFeature Component', () => {
    it('renders header, filter chips, and case cards', () => {
      let root: renderer.ReactTestRenderer | undefined;
      act(() => {
        root = renderer.create(<LibraryFeature />);
      });

      const str = JSON.stringify(root!.toJSON());
      expect(str).toContain('CASE ARCHIVE');
      expect(str).toContain('The Missing Message');
      expect(str).toContain('CASE-0001');
    });

    it('renders difficulty filter chips and allows filtering', () => {
      let root: renderer.ReactTestRenderer | undefined;
      act(() => {
        root = renderer.create(<LibraryFeature />);
      });

      // Find chip for Level 2
      const chip2 = root!.root.findByProps({ testID: 'library.filter.difficulty.2' });
      expect(chip2).toBeTruthy();

      act(() => {
        chip2.props.onPress();
      });

      const str = JSON.stringify(root!.toJSON());
      expect(str).toContain('The Alibi Cipher');
      // Case 0001 (diff 1) is filtered out
      expect(str).not.toContain('The Missing Message');
    });

    it('renders mystery type filter chips and allows filtering', () => {
      let root: renderer.ReactTestRenderer | undefined;
      act(() => {
        root = renderer.create(<LibraryFeature />);
      });

      const typeChip = root!.root.findByProps({ testID: 'library.filter.type.missing_item' });
      expect(typeChip).toBeTruthy();

      act(() => {
        typeChip.props.onPress();
      });

      const str = JSON.stringify(root!.toJSON());
      expect(str).toContain('The Missing Astrum');
      expect(str).not.toContain('The Missing Message');
    });

    it('renders solved badge when a case has been completed', () => {
      useSessionStore.setState({
        sessions: {
          sess_done_1: {
            id: 'sess_done_1',
            caseId: 'case_0001',
            caseVersion: 1,
            mode: 'normal',
            unlockedClueIds: [],
            board: { cards: [], links: [] },
            status: 'submitted',
            startedAt: '2026-10-29T10:00:00Z',
          },
        },
        cases: {},
        results: {},
        readClueIds: {},
        errors: {},
        activeSessionId: 'sess_done_1',
      });

      let root: renderer.ReactTestRenderer | undefined;
      act(() => {
        root = renderer.create(<LibraryFeature />);
      });

      const str = JSON.stringify(root!.toJSON());
      expect(str).toContain('SOLVED');
    });

    it('pressing a case card or start button launches the case session', async () => {
      let root: renderer.ReactTestRenderer | undefined;
      act(() => {
        root = renderer.create(<LibraryFeature />);
      });

      const startBtn = root!.root.findByProps({ testID: 'library.button.start.case_0001' });
      expect(startBtn).toBeTruthy();

      await act(async () => {
        await startBtn.props.onPress();
      });

      expect(mockStartSession).toHaveBeenCalledWith({
        caseId: 'case_0001',
        mode: 'normal',
      });
      expect(mockPush).toHaveBeenCalledWith('/case/sess_lib_999');
    });
  });
});
