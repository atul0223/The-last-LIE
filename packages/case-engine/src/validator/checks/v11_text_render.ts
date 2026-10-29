import type { CaseDefinition } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v11TextRenderCheck: ValidatorCheck = {
  checkId: 'text.render',
  run(def: CaseDefinition, _ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Clue texts
    for (const clue of def.clues) {
      if (!clue.text || clue.text.trim().length === 0) {
        issues.push({
          checkId: 'text.render',
          severity: 'error',
          message: `Clue '${clue.id}' renders to empty or whitespace-only text`,
          refs: [clue.id],
        });
        continue;
      }

      if (/\{\{.*?\}\}/.test(clue.text)) {
        issues.push({
          checkId: 'text.render',
          severity: 'error',
          message: `Clue '${clue.id}' contains unrendered template variable: '${clue.text.match(/\{\{.*?\}\}/)?.[0]}'`,
          refs: [clue.id],
        });
      }

      // Check for forbidden internal id leaks inside clue text
      if (clue.text.includes(def.truth.solutionHypothesisId)) {
        issues.push({
          checkId: 'text.render',
          severity: 'error',
          message: `Clue '${clue.id}' text leaks solution hypothesis id '${def.truth.solutionHypothesisId}'`,
          refs: [clue.id, def.truth.solutionHypothesisId],
        });
      }
    }

    // 2. Reveal beats text
    for (let i = 0; i < def.truth.explanation.length; i++) {
      const beat = def.truth.explanation[i]!;
      if (!beat.text || beat.text.trim().length === 0) {
        issues.push({
          checkId: 'text.render',
          severity: 'error',
          message: `Reveal beat at index ${i} has empty or whitespace-only text`,
          refs: [`truth.explanation[${i}]`],
        });
        continue;
      }

      if (/\{\{.*?\}\}/.test(beat.text)) {
        issues.push({
          checkId: 'text.render',
          severity: 'error',
          message: `Reveal beat at index ${i} contains unrendered template variable: '${beat.text.match(/\{\{.*?\}\}/)?.[0]}'`,
          refs: [`truth.explanation[${i}]`],
        });
      }
    }

    return issues;
  },
};
