import type { Difficulty, DetectiveRank, NextRankRequirements } from '@lastlie/case-engine';

export interface RankInfo {
  currentRank: DetectiveRank;
  nextRank: DetectiveRank | null;
  currentXp: number;
  targetXp: number | null;
  xpMissing: number;
  progressPercent: number;
  masteryGate: NextRankRequirements['masteryGate'];
  isMaxRank: boolean;
  canRankUp: boolean;
}

export interface TheorySnapshot {
  hypothesisId?: string;
  hypothesisLabel?: string;
  score: number;
  xp: number;
  isCorrect: boolean;
  submittedAt: string;
}

export interface ArchiveCaseItem {
  caseId: string;
  sessionId: string;
  title: string;
  difficulty: Difficulty;
  solvedAt: string;
  score: number;
  xp: number;
  isCorrect: boolean;
  stars: number;
  mode: 'normal' | 'replay' | 'daily' | 'challenge';
  previousTheory?: TheorySnapshot;
  latestTheory?: TheorySnapshot;
  isReplay: boolean;
}

export interface DossierCharacterItem {
  id: string;
  name: string;
  role: string;
  publicDescription: string;
  portrait?: string;
  cases: Array<{ id: string; title: string }>;
}
