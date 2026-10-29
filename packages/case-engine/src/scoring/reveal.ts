import { buildContext, contradicts } from '../logic/index.js';
import type { CaseDefinition, ContradictionLink, Reveal, Submission } from '../schema/index.js';

export type SubmissionInput =
  Submission | { submission: Submission } | { contradictions: ContradictionLink[] };

/**
 * Builds the full unredacted reveal for a case and submitted solution.
 * Includes:
 * - full timeline beats (`explanation`)
 * - ground truth and culprit list
 * - all clues in the case
 * - player links evaluated with their specific contradiction ruleId
 */
export function buildReveal(def: CaseDefinition, submissionInput: SubmissionInput): Reveal {
  const submission = 'submission' in submissionInput ? submissionInput.submission : submissionInput;

  const contradictions = submission.contradictions ?? [];
  const logicCtx = buildContext(def);
  const declaredLieClueIds = new Set(def.truth.liars.flatMap((l) => l.statementClueIds));
  const clueMap = new Map(def.clues.map((c) => [c.id, c]));

  const validLinks: ContradictionLink[] = [];
  const invalidLinks: ContradictionLink[] = [];

  for (const link of contradictions) {
    const clueA = clueMap.get(link.a);
    const clueB = clueMap.get(link.b);

    if (!clueA || !clueB) {
      invalidLinks.push({ a: link.a, b: link.b });
      continue;
    }

    let foundContradiction: { ruleId: string; explanation: string } | null = null;

    for (const factA of clueA.asserts) {
      for (const factB of clueB.asserts) {
        const contra = contradicts(factA, factB, logicCtx);
        if (contra) {
          foundContradiction = contra;
          break;
        }
      }
      if (foundContradiction) break;
    }

    const involvesLie = declaredLieClueIds.has(link.a) || declaredLieClueIds.has(link.b);

    if (foundContradiction && involvesLie) {
      validLinks.push({
        a: link.a,
        b: link.b,
        ruleId: foundContradiction.ruleId,
        explanation: foundContradiction.explanation,
      });
    } else {
      invalidLinks.push({
        a: link.a,
        b: link.b,
      });
    }
  }

  return {
    caseId: def.id,
    solutionHypothesisId: def.truth.solutionHypothesisId,
    explanation: def.truth.explanation,
    truth: def.truth,
    allClues: def.clues,
    culprits: def.truth.culpritIds,
    validLinks,
    invalidLinks,
  };
}
