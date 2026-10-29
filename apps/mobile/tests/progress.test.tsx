import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';
import type {
  CasePublic,
  SessionState,
  PlayerProgress,
} from '@lastlie/case-engine';
import {
  computePlayerProgress,
  extractArchiveItems,
  extractDossiers,
  getRankInfo,
} from '../src/features/progress/helpers';
import ProgressFeature from '../src/features/progress';
import { setAppNavigator } from '../src/features/progress/navigation';
import { useSessionStore, type SessionResultOutcome } from '../src/store';

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

const mockStartSession = vi.fn();

vi.mock('../src/services', () => ({
  getGameService: () => ({
    startSession: mockStartSession,
    unlockClue: vi.fn(),
    saveBoard: vi.fn(),
    submit: vi.fn(),
    getProgress: vi.fn().mockResolvedValue({
      rank: 'Trainee',
      masteryPoints: 0,
      solvedCasesCount: 0,
      streakDays: 0,
      unlockedDossiers: [],
    }),
    listArchive: vi.fn().mockResolvedValue([]),
    getDaily: vi.fn().mockResolvedValue({
      caseId: 'case_0001',
      title: 'The Missing Keycard',
      summary: 'Daily brief',
      difficulty: 1,
      estimatedMinutes: 6,
    }),
  }),
  useGameService: () => ({
    startSession: mockStartSession,
    unlockClue: vi.fn(),
    saveBoard: vi.fn(),
    submit: vi.fn(),
    getProgress: vi.fn().mockResolvedValue({
      rank: 'Trainee',
      masteryPoints: 0,
      solvedCasesCount: 0,
      streakDays: 0,
      unlockedDossiers: [],
    }),
    listArchive: vi.fn().mockResolvedValue([]),
    getDaily: vi.fn().mockResolvedValue({
      caseId: 'case_0001',
      title: 'The Missing Keycard',
      summary: 'Daily brief',
      difficulty: 1,
      estimatedMinutes: 6,
    }),
  }),
}));

describe('WP-23: Progress Tab Feature', () => {
  const sampleCase0001: CasePublic = {
    id: 'case_0001',
    version: 1,
    kind: 'authored',
    title: 'The Missing Keycard',
    difficulty: 1,
    estimatedMinutes: 6,
    mysteryType: 'theft',
    setting: {
      locationIds: ['loc_studio'],
      date: '2026-10-28',
      summary: 'Vesper City Studio',
    },
    briefing: 'A keycard vanished from the studio.',
    characters: [
      {
        id: 'char_maya',
        name: 'Maya Lin',
        role: 'Chief Cryptographer',
        publicDescription: 'Expert in quantum cipher protocols.',
      },
      {
        id: 'char_arjun',
        name: 'Arjun Mehta',
        role: 'Security Analyst',
        publicDescription: 'Oversees biometric credentials and logs.',
      },
    ],
    locations: [{ id: 'loc_studio', name: 'Studio', doorIds: [], adjacency: [] }],
    objects: [],
    clues: [],
    lockedClueIds: [],
    hypotheses: [
      { id: 'hyp_solution', label: 'Arjun took the keycard to forge an alibi' },
      { id: 'hyp_decoy', label: 'Maya misplaced the keycard during her exit' },
    ],
    meta: { status: 'published' },
  };

  const sampleCase0002: CasePublic = {
    id: 'case_0002',
    version: 1,
    kind: 'authored',
    title: 'The Missing Astrum',
    difficulty: 2,
    estimatedMinutes: 8,
    mysteryType: 'missing_item',
    setting: {
      locationIds: ['loc_gallery'],
      date: '2026-10-30',
      summary: 'Helios Gallery',
    },
    briefing: 'A priceless artifact vanished.',
    characters: [
      {
        id: 'char_asher',
        name: 'Asher Vance',
        role: 'Curator',
        publicDescription: 'Helios Gallery curator with master key access.',
      },
    ],
    locations: [{ id: 'loc_gallery', name: 'Gallery', doorIds: [], adjacency: [] }],
    objects: [],
    clues: [],
    lockedClueIds: [],
    hypotheses: [
      { id: 'hyp_0002_sol', label: 'Asher switched the lock mechanism' },
      { id: 'hyp_0002_decoy', label: 'Courier misplaced the container' },
    ],
    meta: { status: 'published' },
  };

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

  describe('Pure Progression Calculation (computePlayerProgress & getRankInfo)', () => {
    it('computes initial Trainee progression when no sessions are solved', () => {
      const progress = computePlayerProgress({}, {}, {});
      expect(progress.xp).toBe(0);
      expect(progress.solvedCount).toBe(0);

      const rankInfo = getRankInfo(progress);
      expect(rankInfo.currentRank).toBe('Trainee');
      expect(rankInfo.nextRank).toBe('Investigator');
      expect(rankInfo.currentXp).toBe(0);
      expect(rankInfo.targetXp).toBe(500);
      expect(rankInfo.xpMissing).toBe(500);
      expect(rankInfo.isMaxRank).toBe(false);
    });

    it('accumulates XP and mastery solves through authoritative applyResult', () => {
      const session1: SessionState = {
        id: 'sess_1',
        caseId: 'case_0001',
        caseVersion: 1,
        mode: 'normal',
        unlockedClueIds: [],
        board: { cards: [], links: [] },
        status: 'submitted',
        startedAt: '2026-10-28T10:00:00Z',
        submittedAt: '2026-10-28T10:15:00Z',
      };

      const outcome1: SessionResultOutcome = {
        result: {
          score: 100,
          xp: 100,
          breakdown: {
            correctHypothesis: true,
            hypothesisPoints: 50,
            evidencePoints: 35, // 35 / 50 = 70% quality (>= 60%)
            contradictionPoints: 20,
            penaltyPoints: 5,
            multiplier: 1.0,
          },
        },
        reveal: {
          caseId: 'case_0001',
          solutionHypothesisId: 'hyp_solution',
          explanation: [],
          allClues: [],
          culprits: ['char_arjun'],
          validLinks: [],
          invalidLinks: [],
        },
      };

      const sessions = { sess_1: session1 };
      const cases = { sess_1: sampleCase0001 };
      const results = { sess_1: outcome1 };

      const progress = computePlayerProgress(sessions, cases, results);
      expect(progress.xp).toBe(100);
      expect(progress.solvedCount).toBe(1);
      expect(progress.correctCount).toBe(1);
      expect(progress.mastery[1]).toBe(1);
      expect(progress.solvedCaseIds).toContain('case_0001');

      const rankInfo = getRankInfo(progress);
      expect(rankInfo.currentRank).toBe('Trainee');
      expect(rankInfo.currentXp).toBe(100);
      expect(rankInfo.xpMissing).toBe(400);
    });

    it('promotes to Investigator when XP and difficulty-2 mastery gate are met', () => {
      const customProgress: PlayerProgress = {
        xp: 600,
        rank: 'Trainee',
        solvedCount: 3,
        correctCount: 3,
        mastery: { 1: 1, 2: 2, 3: 0, 4: 0, 5: 0 }, // 2 qualifying solves at difficulty 2+
        solvedCaseIds: ['case_0001', 'case_0002'],
        unlockedDossierIds: ['char_maya', 'char_asher'],
      };

      const rankInfo = getRankInfo(customProgress);
      expect(rankInfo.currentRank).toBe('Investigator');
      expect(rankInfo.nextRank).toBe('Specialist');
      expect(rankInfo.targetXp).toBe(1200);
    });
  });

  describe('Dossier Extraction (extractDossiers)', () => {
    it('only lists characters from solved cases, excluding unsolved cases', () => {
      const solvedSession: SessionState = {
        id: 'sess_solved',
        caseId: 'case_0001',
        caseVersion: 1,
        mode: 'normal',
        unlockedClueIds: [],
        board: { cards: [], links: [] },
        status: 'submitted',
        startedAt: '2026-10-28T10:00:00Z',
        submittedAt: '2026-10-28T10:15:00Z',
      };

      const inProgressSession: SessionState = {
        id: 'sess_active',
        caseId: 'case_0002',
        caseVersion: 1,
        mode: 'normal',
        unlockedClueIds: [],
        board: { cards: [], links: [] },
        status: 'in_progress',
        startedAt: '2026-10-29T10:00:00Z',
      };

      const outcome1: SessionResultOutcome = {
        result: {
          score: 100,
          xp: 100,
          breakdown: {
            correctHypothesis: true,
            hypothesisPoints: 50,
            evidencePoints: 30,
            contradictionPoints: 20,
            penaltyPoints: 0,
            multiplier: 1.0,
          },
        },
        reveal: {
          caseId: 'case_0001',
          solutionHypothesisId: 'hyp_solution',
          explanation: [],
          allClues: [],
          culprits: ['char_arjun'],
          validLinks: [],
          invalidLinks: [],
        },
      };

      const sessions = {
        sess_solved: solvedSession,
        sess_active: inProgressSession,
      };

      const cases = {
        sess_solved: sampleCase0001,
        sess_active: sampleCase0002,
      };

      const results = {
        sess_solved: outcome1,
      };

      const dossiers = extractDossiers(sessions, cases, results);
      const characterIds = dossiers.map((d) => d.id);

      // Solved case_0001 characters MUST be present
      expect(characterIds).toContain('char_maya');
      expect(characterIds).toContain('char_arjun');

      // Unsolved case_0002 characters MUST NOT be present
      expect(characterIds).not.toContain('char_asher');

      // Verify character details
      const maya = dossiers.find((d) => d.id === 'char_maya');
      expect(maya?.name).toBe('Maya Lin');
      expect(maya?.role).toBe('Chief Cryptographer');
      expect(maya?.cases[0].title).toBe('The Missing Keycard');
    });
  });

  describe('Archive Extraction & Replay Comparison (extractArchiveItems)', () => {
    it('groups multiple sessions into an archive item with previous theory comparison', () => {
      const initialSession: SessionState = {
        id: 'sess_initial',
        caseId: 'case_0001',
        caseVersion: 1,
        mode: 'normal',
        unlockedClueIds: [],
        board: { cards: [], links: [] },
        status: 'submitted',
        startedAt: '2026-10-28T10:00:00Z',
        submittedAt: '2026-10-28T10:15:00Z',
      };

      const replaySession: SessionState = {
        id: 'sess_replay',
        caseId: 'case_0001',
        caseVersion: 1,
        mode: 'replay',
        unlockedClueIds: [],
        board: { cards: [], links: [] },
        status: 'submitted',
        startedAt: '2026-10-28T12:00:00Z',
        submittedAt: '2026-10-28T12:15:00Z',
      };

      const initialOutcome: SessionResultOutcome = {
        result: {
          score: 40,
          xp: 40,
          breakdown: {
            correctHypothesis: false,
            hypothesisPoints: 0,
            evidencePoints: 20,
            contradictionPoints: 20,
            penaltyPoints: 0,
            multiplier: 1.0,
          },
        },
        reveal: {
          caseId: 'case_0001',
          solutionHypothesisId: 'hyp_solution',
          explanation: [],
          allClues: [],
          culprits: ['char_arjun'],
          validLinks: [],
          invalidLinks: [],
        },
      };

      const replayOutcome: SessionResultOutcome = {
        result: {
          score: 100,
          xp: 25, // 0.25x replay XP
          breakdown: {
            correctHypothesis: true,
            hypothesisPoints: 50,
            evidencePoints: 30,
            contradictionPoints: 20,
            penaltyPoints: 0,
            multiplier: 1.0,
          },
        },
        reveal: {
          caseId: 'case_0001',
          solutionHypothesisId: 'hyp_solution',
          explanation: [],
          allClues: [],
          culprits: ['char_arjun'],
          validLinks: [],
          invalidLinks: [],
        },
      };

      const sessions = {
        sess_initial: initialSession,
        sess_replay: replaySession,
      };

      const cases = {
        sess_initial: sampleCase0001,
        sess_replay: sampleCase0001,
      };

      const results = {
        sess_initial: initialOutcome,
        sess_replay: replayOutcome,
      };

      const archive = extractArchiveItems(sessions, cases, results);
      expect(archive.length).toBe(1);

      const entry = archive[0];
      expect(entry.caseId).toBe('case_0001');
      expect(entry.isReplay).toBe(true);
      expect(entry.previousTheory).toBeDefined();
      expect(entry.previousTheory?.isCorrect).toBe(false);
      expect(entry.previousTheory?.score).toBe(40);
      expect(entry.latestTheory?.isCorrect).toBe(true);
      expect(entry.latestTheory?.score).toBe(100);
    });
  });

  describe('Component Rendering & Interactive Replay Flow', () => {
    it('renders empty archive and dossier states when player has no solves', () => {
      const tree = renderer.create(<ProgressFeature />).toJSON();
      const str = JSON.stringify(tree);

      expect(str).toContain('CAREER & DOSSIERS');
      expect(str).toContain('Trainee');
      expect(str).toContain('NO CASES ARCHIVED');
      expect(str).toContain('NO DOSSIERS UNLOCKED');
    });

    it('renders solved case archive cards and character dossiers when cases exist', () => {
      const session1: SessionState = {
        id: 'sess_1',
        caseId: 'case_0001',
        caseVersion: 1,
        mode: 'normal',
        unlockedClueIds: [],
        board: { cards: [], links: [] },
        status: 'submitted',
        startedAt: '2026-10-28T10:00:00Z',
        submittedAt: '2026-10-28T10:15:00Z',
      };

      const outcome1: SessionResultOutcome = {
        result: {
          score: 110,
          xp: 110,
          breakdown: {
            correctHypothesis: true,
            hypothesisPoints: 50,
            evidencePoints: 35,
            contradictionPoints: 25,
            penaltyPoints: 0,
            multiplier: 1.0,
          },
        },
        reveal: {
          caseId: 'case_0001',
          solutionHypothesisId: 'hyp_solution',
          explanation: [],
          allClues: [],
          culprits: ['char_arjun'],
          validLinks: [],
          invalidLinks: [],
        },
      };

      useSessionStore.setState({
        sessions: { sess_1: session1 },
        cases: { sess_1: sampleCase0001 },
        results: { sess_1: outcome1 },
      });

      const root = renderer.create(<ProgressFeature />).root;

      // Find archive card
      const archiveItem = root.findByProps({ testID: 'progress.archive.item.case_0001' });
      expect(archiveItem).toBeTruthy();

      // Find Maya Lin dossier card
      const mayaCard = root.findByProps({ testID: 'progress.dossier.character.char_maya' });
      expect(mayaCard).toBeTruthy();
    });

    it('starts a replay-mode session and navigates when Replay button is pressed', async () => {
      const session1: SessionState = {
        id: 'sess_1',
        caseId: 'case_0001',
        caseVersion: 1,
        mode: 'normal',
        unlockedClueIds: [],
        board: { cards: [], links: [] },
        status: 'submitted',
        startedAt: '2026-10-28T10:00:00Z',
        submittedAt: '2026-10-28T10:15:00Z',
      };

      const outcome1: SessionResultOutcome = {
        result: {
          score: 100,
          xp: 100,
          breakdown: {
            correctHypothesis: true,
            hypothesisPoints: 50,
            evidencePoints: 30,
            contradictionPoints: 20,
            penaltyPoints: 0,
            multiplier: 1.0,
          },
        },
        reveal: {
          caseId: 'case_0001',
          solutionHypothesisId: 'hyp_solution',
          explanation: [],
          allClues: [],
          culprits: ['char_arjun'],
          validLinks: [],
          invalidLinks: [],
        },
      };

      useSessionStore.setState({
        sessions: { sess_1: session1 },
        cases: { sess_1: sampleCase0001 },
        results: { sess_1: outcome1 },
      });

      mockStartSession.mockResolvedValueOnce({
        session: { id: 'sess_replay_999', caseId: 'case_0001', mode: 'replay', status: 'in_progress' },
        case: sampleCase0001,
      });

      const root = renderer.create(<ProgressFeature />).root;

      const replayBtn = root.findByProps({ testID: 'progress.archive.replay.case_0001' });
      expect(replayBtn).toBeTruthy();

      await act(async () => {
        await replayBtn.props.onPress();
      });

      // Assert replay session requested with mode='replay'
      expect(mockStartSession).toHaveBeenCalledWith({
        caseId: 'case_0001',
        mode: 'replay',
      });

      // Assert navigated to new replay session
      expect(mockPush).toHaveBeenCalledWith('/case/sess_replay_999');
    });

    it('switches tabs smoothly between Overview, Rank, Archive, and Dossiers', async () => {
      const root = renderer.create(<ProgressFeature />).root;

      const rankTab = root.findByProps({ testID: 'progress.tab.rank' });
      await act(async () => {
        rankTab.props.onPress();
      });

      // In rank tab, rank card must be rendered
      expect(root.findByProps({ testID: 'progress.rank.card' })).toBeTruthy();
    });
  });
});
