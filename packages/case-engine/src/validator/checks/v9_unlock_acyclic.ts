import type { CaseDefinition } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v9UnlockAcyclicCheck: ValidatorCheck = {
  checkId: 'unlock.acyclic',
  run(def: CaseDefinition, _ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Check that default clues exist
    const hasDefaultClues = def.clues.some((c) => c.unlock.kind === 'default');
    if (!hasDefaultClues) {
      issues.push({
        checkId: 'unlock.acyclic',
        severity: 'error',
        message: 'No default clues exist. The case must provide at least one default clue.',
      });
    }

    // 2. Build adjacency for after_clue dependencies and detect cycles
    const clueMap = new Map(def.clues.map((c) => [c.id, c]));
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function dfs(clueId: string, path: string[]): boolean {
      visited.add(clueId);
      recursionStack.add(clueId);

      const clue = clueMap.get(clueId);
      if (clue && clue.unlock.kind === 'after_clue') {
        const nextId = clue.unlock.clueId;
        if (recursionStack.has(nextId)) {
          issues.push({
            checkId: 'unlock.acyclic',
            severity: 'error',
            message: `Cycle detected in clue unlock dependencies: ${[...path, nextId].join(' -> ')}`,
            refs: [...path, nextId],
          });
          return true;
        }
        if (!visited.has(nextId)) {
          if (dfs(nextId, [...path, nextId])) {
            return true;
          }
        }
      }

      recursionStack.delete(clueId);
      return false;
    }

    for (const clue of def.clues) {
      if (!visited.has(clue.id)) {
        dfs(clue.id, [clue.id]);
      }
    }

    return issues;
  },
};
