import { AUTHORED_CASES } from '@lastlie/content';
import * as contentModule from '@lastlie/content';
import {
  toPublicCase,
  canUnlock,
  scoreSubmission,
  buildReveal,
  CaseDefinitionSchema,
} from '@lastlie/case-engine';
import type {
  CaseDefinition,
  CasePublic,
  PublicClue,
  SessionState,
  BoardState,
  Submission,
  ScoreResult,
  Reveal,
  ClueUnlock,
} from '@lastlie/case-engine';
import type {
  GameService,
  StartSessionOptions,
  PlayerProgress,
  ArchiveEntry,
  CaseSummary,
} from '../GameService';
import { useSessionStore } from '../../store';
import { loadPersistedState, savePersistedState } from '../../store/persist';
import { computeDailyStreak } from '../../features/home/streak';
import { GameServiceError } from './errors';

let sessionCounter = 1;

export class LocalGameService implements GameService {
  private readonly caseDefinitions: Map<string, CaseDefinition> = new Map();
  private awardedSessions = new Set<string>();

  constructor(options?: { generatedCases?: CaseDefinition[] }) {
    // Load static authored case definitions into memory (NEVER persisted to disk)
    for (const rawCase of AUTHORED_CASES) {
      const parsed = CaseDefinitionSchema.parse(rawCase);
      this.caseDefinitions.set(parsed.id, parsed);
    }

    // Safely load GENERATED_CASES from @lastlie/content if present (added after pack regeneration)
    const content = contentModule as Record<string, unknown>;
    const contentGenerated = Array.isArray(content.GENERATED_CASES)
      ? (content.GENERATED_CASES as CaseDefinition[])
      : [];

    const allGenerated = [...contentGenerated, ...(options?.generatedCases ?? [])];
    for (const rawCase of allGenerated) {
      const parsed = CaseDefinitionSchema.parse(rawCase);
      this.caseDefinitions.set(parsed.id, parsed);
    }

    // Restore private awardedSessions state from storage
    try {
      const persisted = loadPersistedState();
      if (persisted.awardedSessionIds) {
        for (const id of persisted.awardedSessionIds) {
          this.awardedSessions.add(id);
        }
      }
    } catch {
      // Graceful fallback if storage cannot be read
    }
  }

  async startSession(
    opts?: StartSessionOptions,
  ): Promise<{ session: SessionState; case: CasePublic }> {
    const caseId = opts?.caseId ?? 'case_0001';
    const def = this.caseDefinitions.get(caseId);

    if (!def) {
      throw new GameServiceError(
        'CASE_NOT_FOUND',
        `Case '${caseId}' was not found in local cases`,
      );
    }

    const defaultClues = def.clues.filter((c) => c.unlock.kind === 'default');
    const defaultClueIds = defaultClues.map((c) => c.id);

    // Ensure session IDs do not collide across restarts
    const existingSessions = Object.keys(useSessionStore.getState().sessions);
    const existingCount = existingSessions.length;
    const currentCount = Math.max(sessionCounter, existingCount + 1);
    sessionCounter = currentCount + 1;

    const sessionId = `sess_${def.id}_${currentCount}`;

    const board: BoardState = {
      cards: defaultClueIds.map((id, index) => ({
        id,
        x: 100 + (index % 3) * 220,
        y: 120 + Math.floor(index / 3) * 160,
      })),
      links: [],
    };

    const session: SessionState = {
      id: sessionId,
      caseId: def.id,
      caseVersion: def.version,
      mode: opts?.mode ?? 'normal',
      unlockedClueIds: defaultClueIds,
      board,
      status: 'in_progress',
      startedAt: new Date(1710000000000).toISOString(),
    };

    const publicCase = toPublicCase(def, session.unlockedClueIds);
    useSessionStore.getState().setSession(session, publicCase);

    return { session, case: publicCase };
  }

  async unlockClue(sessionId: string, clueId: string, via: ClueUnlock): Promise<PublicClue> {
    const session = useSessionStore.getState().getSession(sessionId);
    if (!session) {
      throw new GameServiceError('SESSION_NOT_FOUND', `Session '${sessionId}' not found`);
    }

    if (session.status !== 'in_progress') {
      throw new GameServiceError(
        'ALREADY_SUBMITTED',
        `Cannot unlock clues on a ${session.status} session`,
      );
    }

    const def = this.caseDefinitions.get(session.caseId);
    if (!def) {
      throw new GameServiceError('CASE_NOT_FOUND', `Case '${session.caseId}' definition missing`);
    }

    // Check if already unlocked
    if (session.unlockedClueIds.includes(clueId)) {
      const pubCase = toPublicCase(def, session.unlockedClueIds);
      const found = pubCase.clues.find((c) => c.id === clueId);
      if (found) return found;
    }

    // Check unlock eligibility with case-engine
    const check = canUnlock(def, session, clueId, via);
    if (!check.ok) {
      throw new GameServiceError('CANNOT_UNLOCK', check.message, check);
    }

    const nextUnlocked = [...session.unlockedClueIds, clueId];
    const newCard = {
      id: clueId,
      x: 100 + (nextUnlocked.length % 3) * 220,
      y: 120 + Math.floor(nextUnlocked.length / 3) * 160,
    };

    const nextBoard: BoardState = {
      ...session.board,
      cards: [...session.board.cards, newCard],
    };

    useSessionStore.getState().updateSession(sessionId, {
      unlockedClueIds: nextUnlocked,
      board: nextBoard,
    });

    const updatedPublicCase = toPublicCase(def, nextUnlocked);
    useSessionStore.getState().setCasePublic(sessionId, updatedPublicCase);

    const unlockedClue = updatedPublicCase.clues.find((c) => c.id === clueId);
    if (!unlockedClue) {
      throw new GameServiceError('CLUE_NOT_FOUND', `Clue '${clueId}' not found after unlock`);
    }

    return unlockedClue;
  }

  async saveBoard(sessionId: string, board: BoardState): Promise<void> {
    const session = useSessionStore.getState().getSession(sessionId);
    if (!session) {
      throw new GameServiceError('SESSION_NOT_FOUND', `Session '${sessionId}' not found`);
    }

    useSessionStore.getState().updateSession(sessionId, { board });
  }

  async submit(submission: Submission): Promise<{ result: ScoreResult; reveal: Reveal }> {
    const session = useSessionStore.getState().getSession(submission.sessionId);
    if (!session) {
      throw new GameServiceError(
        'SESSION_NOT_FOUND',
        `Session '${submission.sessionId}' not found`,
      );
    }

    // Idempotent double submit handling: if result exists, return immediately without re-awarding
    const existing = useSessionStore.getState().getResult(submission.sessionId);
    if (existing) {
      return existing;
    }

    const def = this.caseDefinitions.get(session.caseId);
    if (!def) {
      throw new GameServiceError('CASE_NOT_FOUND', `Case '${session.caseId}' definition missing`);
    }

    let result: ScoreResult;
    try {
      result = scoreSubmission(def, session, submission);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new GameServiceError('INVALID_SUBMISSION', msg);
    }

    const reveal = buildReveal(def, submission);

    // If this session has already been awarded, do not double-award XP
    if (this.awardedSessions.has(submission.sessionId)) {
      result = {
        ...result,
        xp: 0,
      };
    } else {
      this.awardedSessions.add(submission.sessionId);
    }

    const outcome = { result, reveal };

    useSessionStore.getState().updateSession(submission.sessionId, {
      status: 'submitted',
      submittedAt: new Date(1710000600000).toISOString(),
    });

    useSessionStore.getState().setResult(submission.sessionId, outcome);

    // Persist updated awardedSessions along with the store state
    try {
      const persisted = loadPersistedState();
      savePersistedState({
        ...persisted,
        sessions: useSessionStore.getState().sessions,
        cases: useSessionStore.getState().cases,
        results: useSessionStore.getState().results,
        readClueIds: useSessionStore.getState().readClueIds,
        activeSessionId: useSessionStore.getState().activeSessionId,
        awardedSessionIds: Array.from(this.awardedSessions),
      });
    } catch {
      // Storage error does not break game logic
    }

    return outcome;
  }

  async getProgress(): Promise<PlayerProgress> {
    const sessions = Object.values(useSessionStore.getState().sessions);
    const results = Object.values(useSessionStore.getState().results);
    const totalScore = results.reduce((sum, o) => sum + o.result.score, 0);

    const dailyDates = sessions
      .filter((s) => s.mode === 'daily' && s.status === 'submitted' && s.submittedAt)
      .map((s) => s.submittedAt!);

    const streak = computeDailyStreak(dailyDates).currentStreak;

    return {
      rank: totalScore > 1000 ? 'Senior Detective' : 'Detective Inspector',
      masteryPoints: totalScore,
      solvedCasesCount: results.length,
      streakDays: streak,
      unlockedDossiers: ['char_maya', 'char_arjun'],
    };
  }

  async listArchive(): Promise<ArchiveEntry[]> {
    const entries: ArchiveEntry[] = [];
    const sessions = Object.values(useSessionStore.getState().sessions);

    for (const session of sessions) {
      const outcome = useSessionStore.getState().getResult(session.id);
      const def = this.caseDefinitions.get(session.caseId);
      if (outcome && def) {
        entries.push({
          caseId: def.id,
          title: def.title,
          difficulty: def.difficulty,
          solvedAt: session.submittedAt ?? session.startedAt,
          score: outcome.result.score,
          stars: outcome.result.score >= 100 ? 3 : outcome.result.score >= 50 ? 2 : 1,
        });
      }
    }

    return entries;
  }

  async getDaily(dateOverride?: string): Promise<CaseSummary> {
    const today = dateOverride || new Date().toISOString().split('T')[0]!;
    const allDefs = Array.from(this.caseDefinitions.values());
    if (allDefs.length === 0) {
      throw new GameServiceError('CASE_NOT_FOUND', 'No bundled cases available for daily');
    }
    allDefs.sort((a, b) => a.id.localeCompare(b.id));

    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = (hash * 31 + today.charCodeAt(i)) >>> 0;
    }

    const chosen = allDefs[hash % allDefs.length]!;
    return {
      caseId: chosen.id,
      title: chosen.title,
      summary: chosen.briefing,
      difficulty: chosen.difficulty,
      estimatedMinutes: chosen.estimatedMinutes,
    };
  }
}
