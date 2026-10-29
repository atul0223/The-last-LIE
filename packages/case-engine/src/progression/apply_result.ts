import type { Difficulty, ScoreResult } from '../schema/index.js';
import type {
  CaseProgressionMeta,
  PlayerProgress,
  ProgressionConfig,
  ProgressionEvent,
} from './types.js';
import { DEFAULT_PROGRESSION_CONFIG, validateProgressionConfig } from './config.js';
import { rankFor } from './helpers.js';

export interface ApplyResultOutput {
  progress: PlayerProgress;
  events: ProgressionEvent[];
}

/**
 * Pure, deterministic progression update.
 *
 * Single Source of Truth for XP:
 * `applyResult` is the authoritative source of truth for XP progression.
 * In `scoreSubmission` (WP-06), a preview `xp` field is calculated using a hardcoded `def.difficulty ?? 1`.
 * Here, `applyResult` computes XP from `result.score * difficultyMultiplier (from config) * replayMultiplier`.
 * To avoid applying multipliers twice, we never multiply `result.xp` by the difficulty/replay factors;
 * instead, `result.score` is scaled directly by `config.difficultyMultipliers` and `config.replayMultiplier`.
 *
 * @param progress - Current player progression (never mutated)
 * @param result - ScoreResult from scoreSubmission (never mutated)
 * @param caseMeta - Case metadata (id, difficulty, mode, characters)
 * @param config - Optional progression configuration (defaults to DEFAULT_PROGRESSION_CONFIG)
 */
export function applyResult(
  progress: PlayerProgress,
  result: ScoreResult,
  caseMeta: CaseProgressionMeta,
  config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG,
): ApplyResultOutput {
  const validConfig = validateProgressionConfig(config);
  const events: ProgressionEvent[] = [];

  const isReplay = caseMeta.mode === 'replay';
  const diff = caseMeta.difficulty;

  // 1. Calculate XP from score and config multipliers (single source of truth)
  const diffMultiplier = validConfig.difficultyMultipliers[diff] ?? 1.0;
  const replayMultiplier = isReplay ? (validConfig.replayMultiplier ?? 0.25) : 1.0;
  const rawScore = typeof result.score === 'number' ? result.score : 0;
  const earnedXp = Math.max(0, Math.round(rawScore * diffMultiplier * replayMultiplier));
  const newXp = (progress.xp ?? 0) + earnedXp;

  if (earnedXp > 0) {
    events.push({
      type: 'xp_gained',
      amount: earnedXp,
      totalXp: newXp,
    });
  }

  // 2. Track solve & correctness
  const isCorrect = Boolean(result.breakdown?.correctHypothesis);
  const newSolvedCount = (progress.solvedCount ?? 0) + 1;
  const newCorrectCount = (progress.correctCount ?? 0) + (isCorrect ? 1 : 0);

  const existingSolved = progress.solvedCaseIds ?? [];
  const newSolvedCaseIds = existingSolved.includes(caseMeta.id)
    ? [...existingSolved]
    : [...existingSolved, caseMeta.id];

  // 3. Mastery gate tracking
  // Replays never count toward mastery gates.
  // Requires correct solve with evidence quality >= 60% (evidencePoints / 50).
  const evidencePoints = result.breakdown?.evidencePoints ?? 0;
  const evidenceQuality = evidencePoints / 50;
  const meetsMasteryQuality = isCorrect && evidenceQuality >= 0.60;

  const newMastery: Record<Difficulty, number> = {
    1: progress.mastery?.[1] ?? 0,
    2: progress.mastery?.[2] ?? 0,
    3: progress.mastery?.[3] ?? 0,
    4: progress.mastery?.[4] ?? 0,
    5: progress.mastery?.[5] ?? 0,
  };

  if (!isReplay && meetsMasteryQuality) {
    newMastery[diff] = (newMastery[diff] ?? 0) + 1;
    events.push({
      type: 'mastery_progress',
      difficulty: diff,
      currentCount: newMastery[diff],
    });
  }

  // 4. Dossier unlocks for case characters
  const existingUnlocks = progress.unlockedDossierIds ?? [];
  const newUnlockedDossierIds = [...existingUnlocks];
  if (caseMeta.characters && caseMeta.characters.length > 0) {
    for (const char of caseMeta.characters) {
      const charId = typeof char === 'string' ? char : char.id;
      if (charId && !newUnlockedDossierIds.includes(charId)) {
        newUnlockedDossierIds.push(charId);
        events.push({
          type: 'unlock',
          kind: 'dossier',
          id: charId,
        });
      }
    }
  }

  // 5. Evaluate Rank Progression
  const candidateProgress: PlayerProgress = {
    userId: progress.userId,
    xp: newXp,
    rank: progress.rank ?? 'Trainee',
    solvedCount: newSolvedCount,
    correctCount: newCorrectCount,
    mastery: newMastery,
    solvedCaseIds: newSolvedCaseIds,
    unlockedDossierIds: newUnlockedDossierIds,
    updatedAt: progress.updatedAt,
  };

  const newRank = rankFor(candidateProgress, validConfig);
  const previousRank = progress.rank ?? 'Trainee';
  if (newRank !== previousRank) {
    events.push({
      type: 'rank_up',
      previousRank,
      newRank,
    });
    candidateProgress.rank = newRank;
  }

  return {
    progress: candidateProgress,
    events,
  };
}
