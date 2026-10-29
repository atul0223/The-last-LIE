import type { CaseDefinition } from '../schema/index.js';
import type { ValidationMetrics } from './types.js';

export const DIFFICULTY_WEIGHTS = {
  smallestKeyEvidenceSize: 2.0,
  nonDefaultKeyClues: 1.5,
  redHerrings: 1.0,
  hypotheses: 1.0,
  needsTravelTime: 3.0,
} as const;

/**
 * Computes the deterministic difficulty metric and associated telemetry.
 */
export function computeDifficultyMetrics(def: CaseDefinition): ValidationMetrics {
  const clueMap = new Map(def.clues.map((c) => [c.id, c]));

  // 1. Size of smallest keyEvidence set
  let smallestKeySize = Number.POSITIVE_INFINITY;
  let smallestKeySet: string[] = [];

  for (const set of def.truth.keyEvidence) {
    if (set.length < smallestKeySize) {
      smallestKeySize = set.length;
      smallestKeySet = set;
    }
  }
  if (!Number.isFinite(smallestKeySize)) {
    smallestKeySize = 0;
  }

  // 2. Number of non-default clues in smallest set
  let nonDefaultKeyCluesCount = 0;
  for (const clueId of smallestKeySet) {
    const clue = clueMap.get(clueId);
    if (clue && clue.unlock.kind !== 'default') {
      nonDefaultKeyCluesCount++;
    }
  }

  // 3. Number of red-herring clues
  const redHerringsCount = def.clues.filter((c) => c.tags?.includes('red_herring')).length;

  // 4. Number of hypotheses
  const hypothesesCount = def.hypotheses.length;

  // 5. Check if travel time is required by any decisive key evidence
  let needsTravelTime = false;
  for (const set of def.truth.keyEvidence) {
    for (const clueId of set) {
      const clue = clueMap.get(clueId);
      if (clue) {
        // Check if any asserted fact involves locations with travel time
        for (const f of clue.asserts) {
          if (f.kind === 'at' || (f.kind === 'action' && f.where)) {
            // Check if travel times exist
            for (const loc of def.locations) {
              if (loc.adjacency.length > 0) {
                needsTravelTime = true;
                break;
              }
            }
          }
        }
      }
    }
  }

  const rawScore =
    smallestKeySize * DIFFICULTY_WEIGHTS.smallestKeyEvidenceSize +
    nonDefaultKeyCluesCount * DIFFICULTY_WEIGHTS.nonDefaultKeyClues +
    redHerringsCount * DIFFICULTY_WEIGHTS.redHerrings +
    hypothesesCount * DIFFICULTY_WEIGHTS.hypotheses +
    (needsTravelTime ? DIFFICULTY_WEIGHTS.needsTravelTime : 0);

  let measuredDifficulty = 1;
  if (rawScore > 22.0) {
    measuredDifficulty = 5;
  } else if (rawScore > 18.0) {
    measuredDifficulty = 4;
  } else if (rawScore > 14.0) {
    measuredDifficulty = 3;
  } else if (rawScore > 9.0) {
    measuredDifficulty = 2;
  } else {
    measuredDifficulty = 1;
  }

  return {
    difficultyScore: Math.round(rawScore * 100) / 100,
    measuredDifficulty,
    smallestKeyEvidenceSize: smallestKeySize,
    nonDefaultKeyCluesCount,
    redHerringsCount,
    hypothesesCount,
    needsTravelTime,
    totalCluesCount: def.clues.length,
    obtainableCluesCount: 0, // filled by validateCase
  };
}
