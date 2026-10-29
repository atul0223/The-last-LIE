import type { CaseDefinition, Clue, Fact, Hypothesis } from '../schema/index.js';
import { buildContext, type LogicContext } from './context.js';
import { contradicts } from './contradicts.js';

export interface EliminationRecord {
  claim: Fact;
  fact: Fact;
  ruleId: string;
  explanation: string;
}

export interface HypothesisEvaluationResult {
  eliminated: boolean;
  by: EliminationRecord[];
}

/**
 * Evaluates a hypothesis against a set of clues.
 *
 * Rule per SYSTEM_DESIGN §4.2:
 * Only PHYSICAL clues eliminate hypotheses. Testimony facts do NOT eliminate
 * hypotheses directly because testimonies may be lies.
 */
export function evaluateHypothesis(
  h: Hypothesis,
  clues: Clue[],
  ctx: LogicContext,
): HypothesisEvaluationResult {
  const by: EliminationRecord[] = [];

  // Filter strictly for physical clues
  const physicalClues = clues.filter((c) => c.reliability === 'physical');
  const physicalFacts = physicalClues.flatMap((c) => c.asserts);

  for (const claim of h.claims) {
    for (const fact of physicalFacts) {
      const contradiction = contradicts(claim, fact, ctx);
      if (contradiction) {
        by.push({
          claim,
          fact,
          ruleId: contradiction.ruleId,
          explanation: contradiction.explanation,
        });
      }
    }
  }

  return {
    eliminated: by.length > 0,
    by,
  };
}

/**
 * Returns the hypotheses from `def` that survive (are not eliminated)
 * by the specified clue IDs.
 */
export function survivingHypotheses(
  def: CaseDefinition,
  clueIds: string[],
  ctx?: LogicContext,
): Hypothesis[] {
  const effectiveCtx = ctx ?? buildContext(def);
  const activeClueSet = new Set(clueIds);
  const activeClues = def.clues.filter((c) => activeClueSet.has(c.id));

  return def.hypotheses.filter((h) => {
    const result = evaluateHypothesis(h, activeClues, effectiveCtx);
    return !result.eliminated;
  });
}
