import { contradicts } from '../../logic/index.js';
import type { CaseDefinition } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v5TestimonyLiesCheck: ValidatorCheck = {
  checkId: 'testimony.lies_declared',
  run(def: CaseDefinition, ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Map of declared lies
    const declaredLieClueIds = new Set<string>();
    for (const liar of def.truth.liars) {
      for (const clueId of liar.statementClueIds) {
        declaredLieClueIds.add(clueId);
      }
    }

    // Part A: Every testimony clue that contradicts truth.timeline must be declared in truth.liars
    const testimonyClues = def.clues.filter((c) => c.reliability === 'testimony');
    for (const clue of testimonyClues) {
      let hasContradiction = false;
      for (const fact of clue.asserts) {
        for (const t of def.truth.timeline) {
          if (contradicts(fact, t, ctx.logicCtx)) {
            hasContradiction = true;
            break;
          }
        }
        if (hasContradiction) break;
      }

      if (hasContradiction && !declaredLieClueIds.has(clue.id)) {
        issues.push({
          checkId: 'testimony.lies_declared',
          severity: 'error',
          message: `Testimony clue '${clue.id}' contradicts truth.timeline but is not declared in truth.liars`,
          refs: [clue.id],
        });
      }
    }

    // Part B: Every declared lie in truth.liars must contradict truth.timeline
    const clueMap = new Map(def.clues.map((c) => [c.id, c]));
    for (const liar of def.truth.liars) {
      for (const clueId of liar.statementClueIds) {
        const clue = clueMap.get(clueId);
        if (!clue) continue;

        const hasContradiction = clue.asserts.some((fact) =>
          def.truth.timeline.some((t) => contradicts(fact, t, ctx.logicCtx)),
        );

        if (!hasContradiction) {
          issues.push({
            checkId: 'testimony.lies_declared',
            severity: 'error',
            message: `Declared lie clue '${clueId}' in truth.liars does not contradict truth.timeline`,
            refs: [clueId, liar.who],
          });
        }
      }
    }

    return issues;
  },
};
