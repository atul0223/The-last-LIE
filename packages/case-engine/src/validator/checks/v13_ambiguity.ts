import { survivingHypotheses } from '../../logic/index.js';
import type { CaseDefinition } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v13AmbiguityCheck: ValidatorCheck = {
  checkId: 'ambiguity.intentional',
  run(def: CaseDefinition, ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const obtainableList = Array.from(ctx.obtainableClueIds);
    const surviving = survivingHypotheses(def, obtainableList, ctx.logicCtx);

    if (def.meta.allowAmbiguity) {
      if (surviving.length <= 1) {
        issues.push({
          checkId: 'ambiguity.intentional',
          severity: 'warning',
          message: `meta.allowAmbiguity is true, but only ${surviving.length} hypothesis survived under all obtainable clues`,
          refs: surviving.map((s) => s.id),
        });
      } else {
        // When intentional ambiguity is declared, every surviving hypothesis should be acknowledged in reveal explanation
        const explanationText = def.truth.explanation.map((b) => b.text).join(' ');
        for (const hyp of surviving) {
          const mentioned =
            explanationText.includes(hyp.id) ||
            explanationText.toLowerCase().includes(hyp.label.toLowerCase());
          if (!mentioned) {
            issues.push({
              checkId: 'ambiguity.intentional',
              severity: 'warning',
              message: `Case allows ambiguity, but surviving hypothesis '${hyp.id}' (${hyp.label}) is not acknowledged in the reveal explanation`,
              refs: [hyp.id],
            });
          }
        }
      }
    }

    return issues;
  },
};
