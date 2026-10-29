import { contradicts } from '../../logic/index.js';
import type { CaseDefinition } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v3TimelineConsistentCheck: ValidatorCheck = {
  checkId: 'timeline.consistent',
  run(def: CaseDefinition, ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const timeline = def.truth.timeline;

    for (let i = 0; i < timeline.length; i++) {
      const factA = timeline[i]!;
      for (let j = i + 1; j < timeline.length; j++) {
        const factB = timeline[j]!;
        const contradiction = contradicts(factA, factB, ctx.logicCtx);
        if (contradiction) {
          issues.push({
            checkId: 'timeline.consistent',
            severity: 'error',
            message: `Contradiction in truth.timeline between index ${i} and ${j} (${contradiction.ruleId}): ${contradiction.explanation}`,
            refs: [`timeline[${i}]`, `timeline[${j}]`],
          });
        }
      }
    }

    return issues;
  },
};
