import { contradicts } from '../../logic/index.js';
import type { CaseDefinition } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

/**
 * V14: lie.contradictable
 *
 * For each clue id in truth.liars[].statementClueIds, at least one of its
 * asserted facts must be contradicted by a fact asserted by an OBTAINABLE physical clue.
 * Fair-play rule: The player must have reachable physical evidence to refute every declared lie.
 */
export const v14LieContradictableCheck: ValidatorCheck = {
  checkId: 'lie.contradictable',
  run(def: CaseDefinition, ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Collect all facts asserted by obtainable physical clues
    const obtainablePhysicalFacts = def.clues
      .filter((c) => c.reliability === 'physical' && ctx.obtainableClueIds.has(c.id))
      .flatMap((c) => c.asserts);

    const clueMap = new Map(def.clues.map((c) => [c.id, c]));
    const seenLieClueIds = new Set<string>();

    for (const liar of def.truth.liars) {
      for (const clueId of liar.statementClueIds) {
        if (seenLieClueIds.has(clueId)) continue;
        seenLieClueIds.add(clueId);

        const clue = clueMap.get(clueId);
        if (!clue) continue;

        const isContradicted = clue.asserts.some((lieFact) =>
          obtainablePhysicalFacts.some((physFact) =>
            contradicts(lieFact, physFact, ctx.logicCtx),
          ),
        );

        if (!isContradicted) {
          issues.push({
            checkId: 'lie.contradictable',
            severity: 'error',
            message: `Lie clue '${clueId}': no physical evidence contradicts this lie`,
            refs: [clueId, liar.who],
          });
        }
      }
    }

    return issues;
  },
};
