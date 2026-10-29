import { factEntailed } from '../../logic/index.js';
import type { CaseDefinition } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v4PhysicalEntailedCheck: ValidatorCheck = {
  checkId: 'physical.entailed',
  run(def: CaseDefinition, ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const physicalClues = def.clues.filter((c) => c.reliability === 'physical');
    for (const clue of physicalClues) {
      clue.asserts.forEach((fact, fIdx) => {
        if (!factEntailed(fact, def.truth.timeline, ctx.logicCtx)) {
          issues.push({
            checkId: 'physical.entailed',
            severity: 'error',
            message: `Physical clue '${clue.id}' asserts fact at index ${fIdx} that is not entailed by truth.timeline: ${JSON.stringify(fact)}`,
            refs: [clue.id, `clues[${clue.id}].asserts[${fIdx}]`],
          });
        }
      });
    }

    return issues;
  },
};
