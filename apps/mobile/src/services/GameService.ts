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

export interface StartSessionOptions {
  caseId?: string;
  mode?: 'normal' | 'daily' | 'challenge' | 'replay';
  challengeId?: string;
}

export interface PlayerProgress {
  rank: string;
  masteryPoints: number;
  solvedCasesCount: number;
  streakDays: number;
  unlockedDossiers: string[];
}

export interface ArchiveEntry {
  caseId: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  solvedAt: string;
  score: number;
  stars: number;
}

export interface CaseSummary {
  caseId: string;
  title: string;
  summary: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: number;
}

export interface GameService {
  startSession(opts?: StartSessionOptions): Promise<{ session: SessionState; case: CasePublic }>;
  unlockClue(sessionId: string, clueId: string, via: ClueUnlock): Promise<PublicClue>;
  saveBoard(sessionId: string, board: BoardState): Promise<void>;
  submit(submission: Submission): Promise<{ result: ScoreResult; reveal: Reveal }>;
  getProgress(): Promise<PlayerProgress>;
  listArchive(): Promise<ArchiveEntry[]>;
  getDaily(): Promise<CaseSummary>;
}
