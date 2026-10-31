import type {
  CasePublic,
  PublicClue,
  SessionState,
  BoardState,
  Submission,
  ScoreResult,
  Reveal,
  ClueUnlock,
} from '@lastlie/case-engine';
import type { ApiClient } from '@lastlie/api-contract';
import type { QueryClient } from '@tanstack/react-query';
import type {
  GameService,
  StartSessionOptions,
  PlayerProgress,
  ArchiveEntry,
  CaseSummary,
} from '../GameService';
import { useSessionStore } from '../../store';
import { FetchApiClient } from './FetchApiClient';
import { SaveBoardOfflineQueue } from './offlineQueue';
import { createRemoteQueryClient } from './queryClient';
import { RemoteServiceError } from './errors';

export interface RemoteGameServiceOptions {
  apiClient?: ApiClient;
  queryClient?: QueryClient;
  offlineQueue?: SaveBoardOfflineQueue;
}

export class RemoteGameService implements GameService {
  private readonly apiClient: ApiClient;
  private readonly queryClient: QueryClient;
  private readonly offlineQueue: SaveBoardOfflineQueue;
  private readonly submittingSessions = new Set<string>();
  private cachedPlayerProgress: PlayerProgress | null = null;

  constructor(options?: RemoteGameServiceOptions) {
    this.apiClient = options?.apiClient ?? new FetchApiClient();
    this.queryClient = options?.queryClient ?? createRemoteQueryClient();
    this.offlineQueue = options?.offlineQueue ?? new SaveBoardOfflineQueue();
  }

  getApiClient(): ApiClient {
    return this.apiClient;
  }

  getQueryClient(): QueryClient {
    return this.queryClient;
  }

  getOfflineQueue(): SaveBoardOfflineQueue {
    return this.offlineQueue;
  }

  /**
   * Returns whether a submission is currently in-flight for the given session ID.
   */
  isSubmitting(sessionId: string): boolean {
    return this.submittingSessions.has(sessionId);
  }

  async startSession(opts?: StartSessionOptions): Promise<{ session: SessionState; case: CasePublic }> {
    const res = await this.apiClient.createSession({
      caseId: opts?.caseId,
      mode: opts?.mode ?? 'normal',
      challengeId: opts?.challengeId,
    });

    // Populate active session and public case in local store
    useSessionStore.getState().setSession(res.session, res.case);

    return {
      session: res.session,
      case: res.case,
    };
  }

  async unlockClue(sessionId: string, clueId: string, via: ClueUnlock): Promise<PublicClue> {
    const res = await this.apiClient.unlockClue(sessionId, {
      clueId,
      via,
    });

    // Update store state with newly unlocked clue
    const current = useSessionStore.getState().getSession(sessionId);
    if (current && !current.unlockedClueIds.includes(res.clue.id)) {
      useSessionStore.getState().updateSession(sessionId, {
        unlockedClueIds: [...current.unlockedClueIds, res.clue.id],
      });
    }

    return res.clue;
  }

  /**
   * Save board state.
   * Enqueues into offline queue immediately (last-write-wins per session).
   * Attempts remote flush. If network fails, remains in offline queue.
   */
  async saveBoard(sessionId: string, board: BoardState): Promise<void> {
    // 1. Enqueue in persistent offline store (last write wins)
    this.offlineQueue.enqueue(sessionId, board);

    // 2. Also keep in-memory session store updated immediately
    useSessionStore.getState().updateSession(sessionId, { board });

    // 3. Attempt remote save if online
    try {
      await this.apiClient.saveBoard(sessionId, { board });
      // Successfully synced with server
      this.offlineQueue.dequeue(sessionId);
    } catch (err: unknown) {
      if (err instanceof RemoteServiceError && err.isClientError) {
        // If client error (e.g. 404 or session closed), purge from queue to avoid poisoning
        this.offlineQueue.dequeue(sessionId);
        throw err;
      }
      // Network/server error: remain in offline queue for future flush
    }
  }

  /**
   * Submit investigation theory.
   * Enforces submit pending state and server-side idempotency.
   */
  async submit(submission: Submission): Promise<{ result: ScoreResult; reveal: Reveal }> {
    const sessionId = submission.sessionId;

    if (this.submittingSessions.has(sessionId)) {
      throw new RemoteServiceError(
        'CONFLICT',
        `Submission is already in progress for session ${sessionId}`,
        409,
      );
    }

    this.submittingSessions.add(sessionId);

    try {
      // If there are pending board changes, attempt to flush them prior to submit
      if (this.offlineQueue.hasPending(sessionId)) {
        const pending = this.offlineQueue.getPending(sessionId);
        if (pending) {
          try {
            await this.apiClient.saveBoard(sessionId, { board: pending.board });
            this.offlineQueue.dequeue(sessionId);
          } catch {
            // Non-fatal; continue to submission
          }
        }
      }

      const res = await this.apiClient.submitSession(sessionId, {
        hypothesisId: submission.hypothesisId,
        supportingClueIds: submission.supportingClueIds,
        contradictions: submission.contradictions,
      });

      // Update store with outcome
      useSessionStore.getState().setResult(sessionId, {
        result: res.result,
        reveal: res.reveal,
      });

      // Cache player progress
      if (res.progress) {
        this.cachedPlayerProgress = {
          rank: res.progress.rank,
          masteryPoints: res.progress.xp,
          solvedCasesCount: res.progress.solvedCount,
          streakDays: res.progress.solvedCount > 0 ? 1 : 0,
          unlockedDossiers: res.progress.unlockedDossierIds,
        };
      }

      return {
        result: res.result,
        reveal: res.reveal,
      };
    } finally {
      this.submittingSessions.delete(sessionId);
    }
  }

  async getProgress(): Promise<PlayerProgress> {
    if (this.cachedPlayerProgress) {
      return this.cachedPlayerProgress;
    }

    try {
      const graph = await this.apiClient.getGraph();
      const results = Object.values(useSessionStore.getState().results);
      const totalScore = results.reduce((sum, o) => sum + o.result.score, 0);

      this.cachedPlayerProgress = {
        rank: totalScore > 1000 ? 'Senior Detective' : 'Detective Inspector',
        masteryPoints: totalScore,
        solvedCasesCount: results.length,
        streakDays: results.length > 0 ? 1 : 0,
        unlockedDossiers: graph.nodes.map((n) => n.id),
      };
      return this.cachedPlayerProgress;
    } catch {
      const results = Object.values(useSessionStore.getState().results);
      const totalScore = results.reduce((sum, o) => sum + o.result.score, 0);
      return {
        rank: totalScore > 1000 ? 'Senior Detective' : 'Detective Inspector',
        masteryPoints: totalScore,
        solvedCasesCount: results.length,
        streakDays: results.length > 0 ? 1 : 0,
        unlockedDossiers: [],
      };
    }
  }

  async listArchive(): Promise<ArchiveEntry[]> {
    const entries: ArchiveEntry[] = [];
    const sessions = Object.values(useSessionStore.getState().sessions);

    for (const session of sessions) {
      const outcome = useSessionStore.getState().getResult(session.id);
      const casePublic = useSessionStore.getState().cases[session.id];
      if (outcome && casePublic) {
        entries.push({
          caseId: casePublic.id,
          title: casePublic.title,
          difficulty: casePublic.difficulty,
          solvedAt: session.submittedAt ?? session.startedAt,
          score: outcome.result.score,
          stars: outcome.result.score >= 100 ? 3 : outcome.result.score >= 50 ? 2 : 1,
        });
      }
    }

    return entries;
  }

  async getDaily(): Promise<CaseSummary> {
    const daily = await this.apiClient.getDaily();

    if (daily.case) {
      return {
        caseId: daily.case.id,
        title: daily.case.title,
        summary: daily.case.setting.summary,
        difficulty: daily.case.difficulty,
        estimatedMinutes: daily.case.estimatedMinutes,
      };
    }

    return {
      caseId: daily.caseId,
      title: `Daily Mystery: ${daily.date}`,
      summary: 'Today’s classified citywide investigation.',
      difficulty: 2,
      estimatedMinutes: 10,
    };
  }

  /**
   * Flushes all pending offline board saves to the server.
   */
  async flushOfflineQueue(): Promise<{ flushed: number; failed: number }> {
    return this.offlineQueue.flush(this.apiClient);
  }
}
