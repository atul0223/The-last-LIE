import { buildContext, contradicts } from '../logic/index.js';
import type { CaseDefinition, ScoreResult, SessionState, Submission } from '../schema/index.js';

/**
 * Validates and scores a player submission against the case definition and active session.
 * Following SYSTEM_DESIGN.md §7.2:
 *
 * | Component             | Rule                                              | Points                         |
 * |-----------------------|---------------------------------------------------|--------------------------------|
 * | Correct hypothesis    | hypothesisId === truth.solutionHypothesisId        | 100                            |
 * | Evidence quality      | ⊇ some keyEvidence set → full. Partial → propor.  | 0–50                           |
 * | Contradictions found  | valid link (contradicts & involves declared lie)  | +10 each, cap 30               |
 * | Bad links             | link where no contradiction exists                | −5 each, floor 0 for component |
 * | Evidence requests     | each request-unlocked clue in session             | −10 each                       |
 * | Wrong hypothesis      | evidence & contradiction points ×0.5               | —                              |
 * | Replay mode (XP)      | replays from archive score reduced XP             | ×0.25                          |
 */
export function scoreSubmission(
  def: CaseDefinition,
  session: SessionState,
  submission: Submission,
): ScoreResult {
  // 1. Validate submission against case & session
  const hypMap = new Map(def.hypotheses.map((h) => [h.id, h]));
  if (!hypMap.has(submission.hypothesisId)) {
    throw new Error(
      `Invalid submission: hypothesisId '${submission.hypothesisId}' does not exist in case '${def.id}'`,
    );
  }

  const clueMap = new Map(def.clues.map((c) => [c.id, c]));
  const unlockedSet = new Set(session.unlockedClueIds);

  for (const cId of submission.supportingClueIds) {
    if (!clueMap.has(cId)) {
      throw new Error(
        `Invalid submission: supportingClueId '${cId}' does not exist in case '${def.id}'`,
      );
    }
    if (!unlockedSet.has(cId)) {
      throw new Error(
        `Invalid submission: supportingClueId '${cId}' is not unlocked in session '${session.id}'`,
      );
    }
  }

  for (const link of submission.contradictions) {
    if (!clueMap.has(link.a) || !clueMap.has(link.b)) {
      throw new Error(
        `Invalid submission: contradiction link references non-existent clue (${link.a}, ${link.b})`,
      );
    }
    if (!unlockedSet.has(link.a) || !unlockedSet.has(link.b)) {
      throw new Error(
        `Invalid submission: contradiction link references locked clue in session (${link.a}, ${link.b})`,
      );
    }
  }

  // 2. Correct hypothesis component (100 or 0)
  const isCorrect = submission.hypothesisId === def.truth.solutionHypothesisId;
  const hypothesisPoints = isCorrect ? 100 : 0;

  // 3. Evidence quality component (0-50)
  const supportingSet = new Set(submission.supportingClueIds);
  let bestRatio = 0;

  for (const keySet of def.truth.keyEvidence) {
    if (keySet.length === 0) continue;
    const matchCount = keySet.filter((id) => supportingSet.has(id)).length;
    const ratio = matchCount / keySet.length;
    if (ratio > bestRatio) {
      bestRatio = ratio;
    }
  }

  const evidencePoints = Math.round(bestRatio * 50);

  // 4. Contradictions component (+10 each, cap 30; -5 each bad link; floor 0 for component)
  const logicCtx = buildContext(def);
  const declaredLieClueIds = new Set(def.truth.liars.flatMap((l) => l.statementClueIds));

  let validLinksCount = 0;
  let badLinksCount = 0;

  for (const link of submission.contradictions) {
    const clueA = clueMap.get(link.a)!;
    const clueB = clueMap.get(link.b)!;

    let hasContradiction = false;
    for (const factA of clueA.asserts) {
      for (const factB of clueB.asserts) {
        if (contradicts(factA, factB, logicCtx)) {
          hasContradiction = true;
          break;
        }
      }
      if (hasContradiction) break;
    }

    const involvesLie = declaredLieClueIds.has(link.a) || declaredLieClueIds.has(link.b);

    if (hasContradiction && involvesLie) {
      validLinksCount++;
    } else {
      badLinksCount++;
    }
  }

  const validPoints = Math.min(30, validLinksCount * 10);
  const badPoints = badLinksCount * 5;
  const contradictionPoints = Math.max(0, validPoints - badPoints);

  // 5. Evidence requests penalty (-10 each request-unlocked clue in session)
  let requestUnlockedCount = 0;
  for (const clueId of session.unlockedClueIds) {
    const clue = clueMap.get(clueId);
    if (clue && clue.unlock.kind === 'request') {
      requestUnlockedCount++;
    }
  }
  const penaltyPoints = requestUnlockedCount * 10;

  // 6. Wrong hypothesis multiplier (evidence & contradiction points ×0.5)
  const multiplier = isCorrect ? 1.0 : 0.5;
  const earnedReasoning = Math.round((evidencePoints + contradictionPoints) * multiplier);

  const rawScore = hypothesisPoints + earnedReasoning - penaltyPoints;
  const score = Math.max(0, rawScore);

  // 7. XP & Replay Multiplier (replay ×0.25)
  const difficultyMultiplier = def.difficulty ?? 1;
  const replayFactor = session.mode === 'replay' ? 0.25 : 1.0;
  const xp = Math.max(0, Math.round(score * difficultyMultiplier * replayFactor));

  return {
    score,
    breakdown: {
      correctHypothesis: isCorrect,
      hypothesisPoints,
      evidencePoints,
      contradictionPoints,
      penaltyPoints,
      multiplier,
      validLinksCount,
      badLinksCount,
      requestCost: penaltyPoints,
    },
    xp,
  };
}
