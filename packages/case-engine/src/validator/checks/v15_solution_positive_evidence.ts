import type { CaseDefinition, Clue, Fact } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

function factInvolvesCulprit(fact: Fact, culpritSet: Set<string>): boolean {
  if ('who' in fact && typeof fact.who === 'string' && culpritSet.has(fact.who)) {
    return true;
  }
  if ('by' in fact && typeof fact.by === 'string' && culpritSet.has(fact.by)) {
    return true;
  }
  if ('sender' in fact && typeof fact.sender === 'string' && culpritSet.has(fact.sender)) {
    return true;
  }
  if ('recipient' in fact && typeof fact.recipient === 'string' && culpritSet.has(fact.recipient)) {
    return true;
  }
  return false;
}

function isPhysicalClueWithCulprit(clue: Clue, culpritSet: Set<string>): boolean {
  if (clue.reliability !== 'physical') {
    return false;
  }
  return clue.asserts.some((fact) => factInvolvesCulprit(fact, culpritSet));
}

/**
 * V15: solution.positive_evidence
 *
 * At least one keyEvidence set must contain a physical clue with a fact
 * involving a culprit id (matched against who / by / sender / recipient fields).
 * Fair-play rule: The player must have positive physical evidence connecting the culprit,
 * rather than arriving at the culprit purely through process of elimination.
 *
 * Skips with a warning if culpritIds is empty ("no-crime" cases).
 */
export const v15SolutionPositiveEvidenceCheck: ValidatorCheck = {
  checkId: 'solution.positive_evidence',
  run(def: CaseDefinition, _ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Skip with a warning if culpritIds is empty ("no-crime" cases)
    if (!def.truth.culpritIds || def.truth.culpritIds.length === 0) {
      issues.push({
        checkId: 'solution.positive_evidence',
        severity: 'warning',
        message: 'truth.culpritIds is empty; skipping positive evidence check (no-crime case)',
        refs: [],
      });
      return issues;
    }

    const culpritSet = new Set(def.truth.culpritIds);
    const clueMap = new Map(def.clues.map((c) => [c.id, c]));

    const hasQualifyingKeyEvidence = def.truth.keyEvidence.some((set) =>
      set.some((clueId) => {
        const clue = clueMap.get(clueId);
        return clue ? isPhysicalClueWithCulprit(clue, culpritSet) : false;
      }),
    );

    if (!hasQualifyingKeyEvidence) {
      issues.push({
        checkId: 'solution.positive_evidence',
        severity: 'error',
        message:
          'No keyEvidence set contains a physical clue involving a culprit id (who / by / sender / recipient)',
        refs: [...def.truth.culpritIds],
      });
    }

    return issues;
  },
};
