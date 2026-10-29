import type { Difficulty } from '../schema/case.js';
import type {
  DetectiveRank,
  NextRankRequirements,
  PlayerProgress,
  ProgressionConfig,
  RankDefinition,
} from './types.js';
import { DEFAULT_PROGRESSION_CONFIG, validateProgressionConfig } from './config.js';

/**
 * Creates an empty progression record for a new player.
 */
export function createInitialProgress(userId?: string): PlayerProgress {
  return {
    userId,
    xp: 0,
    rank: 'Trainee',
    solvedCount: 0,
    correctCount: 0,
    mastery: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    solvedCaseIds: [],
    unlockedDossierIds: [],
  };
}

/**
 * Checks whether a player's progress meets both the XP threshold and mastery gate for a specific rank.
 */
export function meetsRankRequirements(
  progress: PlayerProgress,
  rankDef: RankDefinition,
): boolean {
  if (progress.xp < rankDef.xpThreshold) {
    return false;
  }
  const gate = rankDef.masteryGate;
  if (!gate || gate.qualifyingSolves <= 0) {
    return true;
  }
  let qualifyingCount = 0;
  for (let d = gate.minDifficulty; d <= 5; d++) {
    qualifyingCount += progress.mastery[d as Difficulty] ?? 0;
  }
  return qualifyingCount >= gate.qualifyingSolves;
}

/**
 * Computes the highest rank a player qualifies for given their current progress and progression config.
 */
export function rankFor(
  progress: PlayerProgress,
  config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG,
): DetectiveRank {
  const validConfig = validateProgressionConfig(config);
  const sortedRanks = [...validConfig.ranks].sort((a, b) => a.level - b.level);

  let highestQualified: DetectiveRank = sortedRanks[0]?.id ?? 'Trainee';

  for (const rankDef of sortedRanks) {
    if (meetsRankRequirements(progress, rankDef)) {
      highestQualified = rankDef.id;
    } else {
      break;
    }
  }

  return highestQualified;
}

/**
 * Returns the requirements for the next detective rank, including missing XP and missing mastery solves.
 */
export function nextRankRequirements(
  progress: PlayerProgress,
  config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG,
): NextRankRequirements {
  const validConfig = validateProgressionConfig(config);
  const sortedRanks = [...validConfig.ranks].sort((a, b) => a.level - b.level);

  const currentRank = progress.rank ?? rankFor(progress, validConfig);
  const currentIndex = sortedRanks.findIndex((r) => r.id === currentRank);

  const nextRankDef = currentIndex >= 0 ? sortedRanks[currentIndex + 1] : undefined;

  if (!nextRankDef) {
    return {
      currentRank,
      nextRank: null,
      currentXp: progress.xp,
      targetXp: null,
      xpMissing: 0,
      masteryGate: null,
      isMaxRank: true,
      canRankUp: false,
    };
  }
  const targetXp = nextRankDef.xpThreshold;
  const xpMissing = Math.max(0, targetXp - progress.xp);

  const gate = nextRankDef.masteryGate;
  let currentSolves = 0;
  for (let d = gate.minDifficulty; d <= 5; d++) {
    currentSolves += progress.mastery[d as Difficulty] ?? 0;
  }
  const solvesMissing = Math.max(0, gate.qualifyingSolves - currentSolves);
  const canRankUp = xpMissing === 0 && solvesMissing === 0;

  return {
    currentRank,
    nextRank: nextRankDef.id,
    currentXp: progress.xp,
    targetXp,
    xpMissing,
    masteryGate: {
      minDifficulty: gate.minDifficulty,
      qualifyingSolves: gate.qualifyingSolves,
      currentSolves,
      solvesMissing,
      minEvidenceQuality: gate.minEvidenceQuality,
    },
    isMaxRank: false,
    canRankUp,
  };
}
