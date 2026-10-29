import {
  applyResult,
  createInitialProgress,
  nextRankRequirements,
  rankFor,
  type CaseProgressionMeta,
  type CasePublic,
  type PlayerProgress,
  type SessionState,
} from '@lastlie/case-engine';
import type { SessionResultOutcome } from '../../store/sessionStore';
import type {
  ArchiveCaseItem,
  DossierCharacterItem,
  RankInfo,
  TheorySnapshot,
} from './types';

/**
 * Purely computes the player's progression state by replaying all submitted
 * session results through the authoritative @lastlie/case-engine applyResult pipeline.
 */
export function computePlayerProgress(
  sessions: Record<string, SessionState>,
  cases: Record<string, CasePublic>,
  results: Record<string, SessionResultOutcome>,
): PlayerProgress {
  let progress = createInitialProgress();

  // Sort sessions chronologically to ensure deterministic event replay
  const sessionList = Object.values(sessions).filter(
    (s) => s.status === 'submitted' && Boolean(results[s.id]),
  );

  sessionList.sort((a, b) => {
    const timeA = new Date(a.submittedAt ?? a.startedAt ?? 0).getTime();
    const timeB = new Date(b.submittedAt ?? b.startedAt ?? 0).getTime();
    return timeA - timeB;
  });

  for (const session of sessionList) {
    const outcome = results[session.id];
    if (!outcome) continue;

    const casePublic = cases[session.id];
    const caseMeta: CaseProgressionMeta = {
      id: session.caseId,
      difficulty: casePublic?.difficulty ?? 1,
      mode: session.mode,
      characters: casePublic?.characters?.map((c) => ({ id: c.id, name: c.name })),
    };

    const next = applyResult(progress, outcome.result, caseMeta);
    progress = next.progress;
  }

  return progress;
}

/**
 * Authoritatively computes detective rank and next rank requirements
 * strictly using @lastlie/case-engine helper functions (rankFor and nextRankRequirements).
 */
export function getRankInfo(progress: PlayerProgress): RankInfo {
  const currentRank = rankFor(progress);
  const progressWithCurrentRank = { ...progress, rank: currentRank };
  const requirements = nextRankRequirements(progressWithCurrentRank);

  let progressPercent = 100;
  if (!requirements.isMaxRank && requirements.targetXp && requirements.targetXp > 0) {
    progressPercent = Math.min(
      100,
      Math.max(0, Math.round((progress.xp / requirements.targetXp) * 100)),
    );
  }

  return {
    currentRank,
    nextRank: requirements.nextRank,
    currentXp: progress.xp,
    targetXp: requirements.targetXp,
    xpMissing: requirements.xpMissing,
    progressPercent,
    masteryGate: requirements.masteryGate,
    isMaxRank: requirements.isMaxRank,
    canRankUp: requirements.canRankUp,
  };
}

/**
 * Extracts solved cases for the case archive, identifying multiple solves
 * to present previous theory vs new replay theory.
 */
export function extractArchiveItems(
  sessions: Record<string, SessionState>,
  cases: Record<string, CasePublic>,
  results: Record<string, SessionResultOutcome>,
): ArchiveCaseItem[] {
  // Group submitted sessions by caseId
  const caseSessionMap = new Map<string, SessionState[]>();

  for (const session of Object.values(sessions)) {
    if (session.status === 'submitted' && results[session.id]) {
      const list = caseSessionMap.get(session.caseId) ?? [];
      list.push(session);
      caseSessionMap.set(session.caseId, list);
    }
  }

  const archiveItems: ArchiveCaseItem[] = [];

  for (const [caseId, caseSessions] of caseSessionMap.entries()) {
    // Sort chronological: oldest first
    caseSessions.sort((a, b) => {
      const timeA = new Date(a.submittedAt ?? a.startedAt ?? 0).getTime();
      const timeB = new Date(b.submittedAt ?? b.startedAt ?? 0).getTime();
      return timeA - timeB;
    });

    const latestSession = caseSessions[caseSessions.length - 1];
    const latestOutcome = results[latestSession.id];
    const casePublic = cases[latestSession.id];

    if (!latestOutcome) continue;

    const buildSnapshot = (s: SessionState, o: SessionResultOutcome): TheorySnapshot => {
      const isCorrect = Boolean(o.result.breakdown?.correctHypothesis);
      const hyp = isCorrect
        ? casePublic?.hypotheses.find((h) => h.id === o.reveal.solutionHypothesisId)
        : casePublic?.hypotheses.find((h) => h.id !== o.reveal.solutionHypothesisId);

      return {
        hypothesisId: isCorrect ? o.reveal.solutionHypothesisId : 'decoy',
        hypothesisLabel: hyp?.label ?? (isCorrect ? 'Identified Prime Culprit' : 'Decoy Hypothesis'),
        score: o.result.score,
        xp: o.result.xp,
        isCorrect,
        submittedAt: s.submittedAt ?? s.startedAt,
      };
    };

    const latestTheory = buildSnapshot(latestSession, latestOutcome);
    let previousTheory: TheorySnapshot | undefined = undefined;

    if (caseSessions.length > 1) {
      const prevSession = caseSessions[0];
      const prevOutcome = results[prevSession.id];
      if (prevOutcome) {
        previousTheory = buildSnapshot(prevSession, prevOutcome);
      }
    }

    const score = latestOutcome.result.score;
    const stars = score >= 100 ? 3 : score >= 50 ? 2 : 1;

    archiveItems.push({
      caseId,
      sessionId: latestSession.id,
      title: casePublic?.title ?? `Case ${caseId}`,
      difficulty: casePublic?.difficulty ?? 1,
      solvedAt: latestSession.submittedAt ?? latestSession.startedAt,
      score,
      xp: latestOutcome.result.xp,
      isCorrect: Boolean(latestOutcome.result.breakdown?.correctHypothesis),
      stars,
      mode: latestSession.mode,
      previousTheory,
      latestTheory,
      isReplay: latestSession.mode === 'replay' || caseSessions.length > 1,
    });
  }

  // Sort archive: newest solve first
  archiveItems.sort((a, b) => {
    return new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime();
  });

  return archiveItems;
}

/**
 * Extracts character dossiers ONLY from solved cases.
 * Unsolved cases never expose characters in dossiers.
 */
export function extractDossiers(
  sessions: Record<string, SessionState>,
  cases: Record<string, CasePublic>,
  results: Record<string, SessionResultOutcome>,
): DossierCharacterItem[] {
  // Collect set of solved case IDs
  const solvedCaseIds = new Set<string>();
  for (const session of Object.values(sessions)) {
    if (session.status === 'submitted' && results[session.id]) {
      solvedCaseIds.add(session.caseId);
    }
  }

  const characterMap = new Map<string, DossierCharacterItem>();

  for (const session of Object.values(sessions)) {
    if (!solvedCaseIds.has(session.caseId)) continue;
    const casePublic = cases[session.id];
    if (!casePublic || !casePublic.characters) continue;

    for (const char of casePublic.characters) {
      const existing = characterMap.get(char.id);
      const caseRef = { id: casePublic.id, title: casePublic.title };

      if (existing) {
        if (!existing.cases.some((c) => c.id === caseRef.id)) {
          existing.cases.push(caseRef);
        }
      } else {
        characterMap.set(char.id, {
          id: char.id,
          name: char.name,
          role: char.role,
          publicDescription: char.publicDescription,
          portrait: char.portrait,
          cases: [caseRef],
        });
      }
    }
  }

  const dossiers = Array.from(characterMap.values());
  dossiers.sort((a, b) => a.name.localeCompare(b.name));
  return dossiers;
}
