import type {
  CasePublic,
  PublicClue,
  SessionState,
  BoardState,
  Submission,
  ScoreResult,
  Reveal,
  ClueUnlock,
} from '@lastlie/case-engine';
import type {
  GameService,
  StartSessionOptions,
  PlayerProgress,
  ArchiveEntry,
  CaseSummary,
} from './GameService';

export class FakeGameService implements GameService {
  private fakeSession: SessionState = {
    id: 'sess_fake_001',
    caseId: 'case_0001',
    caseVersion: 1,
    mode: 'normal',
    unlockedClueIds: ['clue_missing_usb', 'clue_keycard_exit'],
    board: {
      cards: [
        { id: 'clue_missing_usb', x: 100, y: 150 },
        { id: 'clue_keycard_exit', x: 300, y: 150 },
      ],
      links: [],
    },
    status: 'in_progress',
    startedAt: '2026-10-28T14:00:00.000Z',
  };

  private fakeCase: CasePublic = {
    id: 'case_0001',
    version: 1,
    kind: 'authored',
    title: 'The Missing Message',
    difficulty: 1,
    estimatedMinutes: 10,
    mysteryType: 'theft',
    setting: {
      locationIds: ['loc_office', 'loc_lobby'],
      date: '2026-10-28',
      summary: 'Third floor research division of Vesper City.',
    },
    briefing:
      'A critical encrypted flash drive was taken from Maya Lin’s office in the Neon Quarter.',
    characters: [
      {
        id: 'char_maya',
        name: 'Maya Lin',
        role: 'Chief Cryptographer',
        publicDescription: 'Architect of the encryption key.',
      },
      {
        id: 'char_arjun',
        name: 'Arjun Mehta',
        role: 'Security Analyst',
        publicDescription: 'Supervising the terminal logs.',
      },
    ],
    locations: [
      {
        id: 'loc_office',
        name: 'Maya’s Office',
        description: 'Third-floor corner office.',
        doorIds: ['door_office'],
        adjacency: [{ to: 'loc_lobby', travelMinutes: 2 }],
      },
      {
        id: 'loc_lobby',
        name: 'Main Lobby',
        description: 'Access-controlled ground floor lobby.',
        doorIds: ['door_lobby'],
        adjacency: [{ to: 'loc_office', travelMinutes: 2 }],
      },
    ],
    objects: [
      {
        id: 'obj_usb',
        name: 'Encrypted Drive',
        type: 'device',
        description: 'Contains the neural network keys.',
        ownerId: 'char_maya',
      },
    ],
    clues: [
      {
        id: 'clue_missing_usb',
        type: 'object',
        reliability: 'physical',
        source: 'loc_office',
        text: 'The desk drawer lock was forced open with a tension wrench.',
        unlock: { kind: 'default' },
        tags: ['physical'],
      },
      {
        id: 'clue_keycard_exit',
        type: 'access_log',
        reliability: 'physical',
        source: 'loc_lobby',
        text: 'Badge scan records Arjun exiting through turnstile 4 at 14:25.',
        unlock: { kind: 'default' },
        tags: ['alibi'],
      },
      {
        id: 'locked_01',
        type: 'testimony',
        locked: true,
        hint: { kind: 'request', cost: 50 },
      },
    ],
    lockedClueIds: ['locked_01'],
    hypotheses: [
      { id: 'hyp_01', label: 'Arjun stole the drive during the 14:20 power flicker.' },
      { id: 'hyp_02', label: 'An outsider gained entry via the maintenance shaft.' },
    ],
    meta: {
      status: 'published',
    },
  };

  async startSession(
    _opts?: StartSessionOptions,
  ): Promise<{ session: SessionState; case: CasePublic }> {
    return {
      session: { ...this.fakeSession },
      case: { ...this.fakeCase },
    };
  }

  async unlockClue(_sessionId: string, clueId: string, _via: ClueUnlock): Promise<PublicClue> {
    const unlocked: PublicClue = {
      id: clueId,
      type: 'testimony',
      reliability: 'testimony',
      source: 'loc_lobby',
      text: 'Surveillance feed was temporarily routed away between 14:15 and 14:30.',
      unlock: { kind: 'request', cost: 50 },
      tags: ['testimony'],
    };
    return unlocked;
  }

  async saveBoard(_sessionId: string, _board: BoardState): Promise<void> {
    // Simulated persistence
  }

  async submit(_submission: Submission): Promise<{ result: ScoreResult; reveal: Reveal }> {
    const result: ScoreResult = {
      score: 850,
      breakdown: {
        correctHypothesis: true,
        hypothesisPoints: 500,
        evidencePoints: 200,
        contradictionPoints: 200,
        penaltyPoints: 50,
        multiplier: 1.0,
      },
      xp: 150,
    };

    const reveal: Reveal = {
      caseId: 'case_0001',
      solutionHypothesisId: 'hyp_01',
      culprits: ['char_arjun'],
      explanation: [
        {
          text: 'Arjun creates an artificial feed outage to mask the office corridor.',
          clueIds: ['clue_missing_usb'],
        },
      ],
      allClues: [
        {
          id: 'clue_missing_usb',
          type: 'object',
          reliability: 'physical',
          source: 'loc_office',
          asserts: [],
          text: 'The desk drawer lock was forced open with a tension wrench.',
          unlock: { kind: 'default' },
        },
      ],
      validLinks: [],
      invalidLinks: [],
    };

    return { result, reveal };
  }

  async getProgress(): Promise<PlayerProgress> {
    return {
      rank: 'Senior Investigator',
      masteryPoints: 1420,
      solvedCasesCount: 12,
      streakDays: 4,
      unlockedDossiers: ['char_maya', 'char_arjun'],
    };
  }

  async listArchive(): Promise<ArchiveEntry[]> {
    return [
      {
        caseId: 'case_0001',
        title: 'The Missing Message',
        difficulty: 1,
        solvedAt: '2026-10-28T16:00:00Z',
        score: 850,
        stars: 3,
      },
    ];
  }

  async getDaily(): Promise<CaseSummary> {
    return {
      caseId: 'case_0001',
      title: 'The Missing Message',
      summary:
        'A critical encrypted flash drive was taken from Maya Lin’s office in the Neon Quarter.',
      difficulty: 1,
      estimatedMinutes: 10,
    };
  }
}
