import { contradicts } from '../../logic/index.js';
import type { CaseDefinition } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v6SolutionConsistentCheck: ValidatorCheck = {
  checkId: 'solution.consistent',
  run(def: CaseDefinition, ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const solutionHyp = def.hypotheses.find((h) => h.id === def.truth.solutionHypothesisId);
    if (!solutionHyp) {
      return issues; // Handled by refs check
    }

    for (let cIdx = 0; cIdx < solutionHyp.claims.length; cIdx++) {
      const claim = solutionHyp.claims[cIdx]!;
      for (let tIdx = 0; tIdx < def.truth.timeline.length; tIdx++) {
        const timelineFact = def.truth.timeline[tIdx]!;
        const contradiction = contradicts(claim, timelineFact, ctx.logicCtx);
        if (contradiction) {
          issues.push({
            checkId: 'solution.consistent',
            severity: 'error',
            message: `Solution hypothesis claim '${solutionHyp.id}' at index ${cIdx} contradicts timeline at index ${tIdx} (${contradiction.ruleId}): ${contradiction.explanation}`,
            refs: [solutionHyp.id, `claims[${cIdx}]`, `timeline[${tIdx}]`],
          });
        }
      }
    }

    return issues;
  },
};
