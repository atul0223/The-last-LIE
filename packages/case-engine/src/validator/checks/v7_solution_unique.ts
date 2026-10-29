import { survivingHypotheses } from '../../logic/index.js';
import type { CaseDefinition } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v7SolutionUniqueCheck: ValidatorCheck = {
  checkId: 'solution.unique',
  run(def: CaseDefinition, ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const obtainableList = Array.from(ctx.obtainableClueIds);
    const surviving = survivingHypotheses(def, obtainableList, ctx.logicCtx);

    const isAmbiguousAllowed = def.meta.allowAmbiguity === true;
    const isSingleSolution =
      surviving.length === 1 && surviving[0]?.id === def.truth.solutionHypothesisId;

    if (!isSingleSolution && !isAmbiguousAllowed) {
      issues.push({
        checkId: 'solution.unique',
        severity: 'error',
        message: `With all obtainable clues, expected exactly 1 surviving hypothesis ('${def.truth.solutionHypothesisId}'), but found ${surviving.length} (${surviving.map((s) => s.id).join(', ')})`,
        refs: surviving.map((s) => s.id),
      });
    }

    return issues;
  },
};
