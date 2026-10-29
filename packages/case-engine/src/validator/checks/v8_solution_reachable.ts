import { survivingHypotheses } from '../../logic/index.js';
import type { CaseDefinition } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v8SolutionReachableCheck: ValidatorCheck = {
  checkId: 'solution.reachable',
  run(def: CaseDefinition, ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    def.truth.keyEvidence.forEach((set, sIdx) => {
      // 1. Check reachability
      const unreachableClues = set.filter((clueId) => !ctx.obtainableClueIds.has(clueId));
      if (unreachableClues.length > 0) {
        issues.push({
          checkId: 'solution.reachable',
          severity: 'error',
          message: `keyEvidence set ${sIdx} contains unreachable clue(s): ${unreachableClues.join(', ')}`,
          refs: unreachableClues,
        });
        return;
      }

      // 2. Check that keyEvidence alone eliminates all non-solution hypotheses
      const surviving = survivingHypotheses(def, set, ctx.logicCtx);
      const isUniqueSolution =
        surviving.length === 1 && surviving[0]?.id === def.truth.solutionHypothesisId;

      if (!isUniqueSolution) {
        issues.push({
          checkId: 'solution.reachable',
          severity: 'error',
          message: `keyEvidence set ${sIdx} [${set.join(', ')}] does not eliminate all non-solution hypotheses. Surviving: [${surviving.map((s) => s.id).join(', ')}]`,
          refs: set,
        });
      }
    });

    return issues;
  },
};
