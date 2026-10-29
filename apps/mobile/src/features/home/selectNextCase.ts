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
 * Rules:
 * 1. Picks the next unplayed case closest to the player's level (difficulty tier).
 * 2. Unplayed cases exclude solved cases and any session currently open/in-progress.
 * 3. If multiple unplayed cases are equally close in distance, ties break toward higher or lowest matching difficulty.
 * 4. If no unplayed cases remain, falls back to an archive replay suggestion from solved cases.
 * 5. Returns kind: 'none' if the catalog is empty.
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
    // Pick the case closest in difficulty to the player's level
    const sorted = [...unplayed].sort((a, b) => {
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
      reason: `Recommended for Level ${playerLevel}`,
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

    const chosen = sortedSolved[0]!;
    return {
      kind: 'archive_replay',
      caseItem: chosen,
      reason: 'All cases solved! Archive replay recommended for mastery.',
    };
  }

  // 3. If there is an in-progress case and no other unplayed cases exist
  if (inProgressCaseId) {
    const inProg = availableCases.find((c) => c.id === inProgressCaseId);
    if (inProg) {
      return {
        kind: 'unplayed',
        caseItem: inProg,
        reason: 'Continue your active investigation.',
      };
    }
  }

  return { kind: 'none' };
}
