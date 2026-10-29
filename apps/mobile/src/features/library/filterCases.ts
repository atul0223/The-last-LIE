import type { CaseCatalogItem } from './catalog';

export type DifficultyFilter = 'all' | 1 | 2 | 3 | 4 | 5;
export type MysteryTypeFilter = 'all' | string;
export type StatusFilter = 'all' | 'solved' | 'unsolved';

export interface CaseFilterOptions {
  difficulty?: DifficultyFilter;
  mysteryType?: MysteryTypeFilter;
  status?: StatusFilter;
  searchQuery?: string;
}

/**
 * Pure filter function for the Library / Investigate screen.
 */
export function filterCases(
  cases: CaseCatalogItem[],
  filters: CaseFilterOptions = {},
  solvedCaseIds: string[] | Set<string> = [],
): CaseCatalogItem[] {
  const solvedSet = solvedCaseIds instanceof Set ? solvedCaseIds : new Set(solvedCaseIds);

  return cases.filter((item) => {
    // 1. Difficulty filter
    if (filters.difficulty && filters.difficulty !== 'all') {
      if (item.difficulty !== filters.difficulty) {
        return false;
      }
    }

    // 2. Mystery type filter
    if (filters.mysteryType && filters.mysteryType !== 'all') {
      if (item.mysteryType !== filters.mysteryType) {
        return false;
      }
    }

    // 3. Status filter (solved vs unsolved)
    if (filters.status && filters.status !== 'all') {
      const isSolved = solvedSet.has(item.id);
      if (filters.status === 'solved' && !isSolved) {
        return false;
      }
      if (filters.status === 'unsolved' && isSolved) {
        return false;
      }
    }

    // 4. Text search query
    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchCode = item.code.toLowerCase().includes(q);
      const matchSummary = item.summary.toLowerCase().includes(q);
      const matchType = item.mysteryType.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchSummary && !matchType) {
        return false;
      }
    }

    return true;
  });
}
