import type { CaseCatalogItem } from '../library/catalog';

export type SelectionKind = 'unplayed' | 'archive_replay' | 'none';

export interface SelectionResult {
  kind: SelectionKind;
  caseItem?: CaseCatalogItem;
  reason?: string;
}

/**
 * Pure selection function for the dominant "Solve a case" CTA.
 *
 * Rules (WP-24 & WP-26):
 * 1. Unplayed cases exclude solved cases and any session currently open/in-progress.
 * 2. Prefers unplayed AUTHORED cases first, choosing the one closest in difficulty to the player's level.
 * 3. If no unplayed authored cases remain, picks unplayed GENERATED cases closest to the player's level.
 * 4. Ties break toward lowest matching difficulty, then ID.
 * 5. If no unplayed cases remain (all authored and generated solved), falls back to an archive replay suggestion from solved cases.
 * 6. Returns kind: 'none' if availableCases is empty.
 */
export function selectNextCase(
  availableCases: CaseCatalogItem[],
  solvedCaseIds: string[] | Set<string> = [],
  playerLevel: number = 1,
  inProgressCaseId?: string,
): SelectionResult {
  if (!availableCases || availableCases.length === 0) {
    return { kind: 'none' };
  }

  const solvedSet = solvedCaseIds instanceof Set ? solvedCaseIds : new Set(solvedCaseIds);

  // 1. Filter out cases that have been solved or are currently actively in progress
  const unplayed = availableCases.filter(
    (c) => !solvedSet.has(c.id) && c.id !== inProgressCaseId,
  );

  if (unplayed.length > 0) {
    const unplayedAuthored = unplayed.filter((c) => (c.kind ?? 'authored') === 'authored');
    const unplayedGenerated = unplayed.filter((c) => (c.kind ?? 'authored') !== 'authored');

    // Priority 1: Unplayed Authored cases
    // Priority 2: Unplayed Generated cases
    const candidatePool = unplayedAuthored.length > 0 ? unplayedAuthored : unplayedGenerated;
    const isAuthored = unplayedAuthored.length > 0;

    // Pick the case closest in difficulty to the player's level
    const sorted = [...candidatePool].sort((a, b) => {
      const distA = Math.abs(a.difficulty - playerLevel);
      const distB = Math.abs(b.difficulty - playerLevel);
      if (distA !== distB) {
        return distA - distB;
      }
      return a.difficulty - b.difficulty;
    });

    const chosen = sorted[0]!;
    return {
      kind: 'unplayed',
      caseItem: chosen,
      reason: isAuthored
        ? `Recommended for Level ${playerLevel}`
        : `Generated case recommended for Level ${playerLevel}`,
    };
  }

  // 2. Fall back to an archive suggestion if all cases are already solved
  const solved = availableCases.filter((c) => solvedSet.has(c.id));
  if (solved.length > 0) {
    const sortedSolved = [...solved].sort((a, b) => {
      const distA = Math.abs(a.difficulty - playerLevel);
      const distB = Math.abs(b.difficulty - playerLevel);
      if (distA !== distB) {
        return distA - distB;
      }
      return a.difficulty - b.difficulty;
    });

    const replayChoice = sortedSolved[0]!;
    return {
      kind: 'archive_replay',
      caseItem: replayChoice,
      reason: 'All cases solved — replay for mastery XP',
    };
  }

  return { kind: 'none' };
}
