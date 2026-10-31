import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  ApiClient,
  CreateSessionRequest,
  CreateSessionResponse,
  UnlockClueRequest,
  UnlockClueResponse,
  SaveBoardRequest,
  SaveBoardResponse,
  SubmitSessionRequest,
  SubmitSessionResponse,
  DailyCaseResponse,
  WeeklyCaseResponse,
  WeeklyAggregateResponse,
  CreateChallengeResponse,
  GetChallengeResponse,
  CreateGuestTokenResponse,
  ChallengeCompareResponse,
  MigrateLocalResponse,
  DeleteAccountResponse,
  GraphResponse,
  RegisterPushTokenResponse,
} from '@lastlie/api-contract';
import type { BoardState, CasePublic, SessionState } from '@lastlie/case-engine';
import { RemoteGameService } from '../src/services/remote/RemoteGameService';
import { FetchApiClient } from '../src/services/remote/FetchApiClient';
import { SaveBoardOfflineQueue } from '../src/services/remote/offlineQueue';
import { createRemoteQueryClient } from '../src/services/remote/queryClient';
import { RemoteServiceError } from '../src/services/remote/errors';
import { MemoryKeyValueStore } from '../src/services/local/storage/MemoryKeyValueStore';
import { useSessionStore } from '../src/store';

const FORBIDDEN_LEAK_KEYS = new Set([
  'truth',
  'claims',
  'culpritIds',
  'seed',
  'keyEvidence',
  'liars',
]);

function deepScan(value: unknown, path: string = 'root'): void {
  if (value === null || value === undefined) return;

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => deepScan(item, `${path}[${idx}]`));
    } else {
      const record = value as Record<string, unknown>;

      for (const [key, val] of Object.entries(record)) {
        if (FORBIDDEN_LEAK_KEYS.has(key)) {
          throw new Error(`Security leak detected: key '${key}' found at path '${path}.${key}'`);
        }
        deepScan(val, `${path}.${key}`);
      }

      if (record.locked === true && typeof record.text === 'string' && record.text.length > 0) {
        throw new Error(`Security leak detected: locked clue exposed text at path '${path}'`);
      }
    }
  }
}

// Sample mock data conforming to CasePublic and SessionState
const MOCK_PUBLIC_CASE: CasePublic = {
  kind: 'authored',
  id: 'case_remote_001',
  version: 1,
  title: 'The Stolen Ledger',
  difficulty: 2,
  estimatedMinutes: 15,
  mysteryType: 'missing_item',
  briefing: 'A rare financial ledger disappeared from the city archives vault.',
  meta: { status: 'validated' },
  lockedClueIds: ['clue_door_log'],
  setting: {
    date: '1928-04-12',
    locationIds: ['loc_vault', 'loc_office'],
    summary: 'A rare financial ledger disappeared from the city archives vault.',
  },
  characters: [
    { id: 'char_clerk', name: 'Julian Vance', role: 'Archivist', publicDescription: 'Vault archivist' },
    { id: 'char_guard', name: 'Marcus Bell', role: 'Security Guard', publicDescription: 'Security guard' },
  ],
  locations: [
    { id: 'loc_vault', name: 'Main Vault', doorIds: ['door_vault'], adjacency: [{ to: 'loc_office', travelMinutes: 2 }] },
    { id: 'loc_office', name: 'Head Office', doorIds: ['door_office'], adjacency: [{ to: 'loc_vault', travelMinutes: 2 }] },
  ],
  objects: [
    { id: 'item_ledger', name: 'Ledger 1927', type: 'item', description: 'Handwritten financial register' },
  ],
  clues: [
    {
      id: 'clue_ledger_missing',
      type: 'object',
      reliability: 'physical',
      text: 'Shelf B-4 in the vault is empty where the ledger was kept.',
      unlock: { kind: 'default' },
      locked: false,
    },
    {
      id: 'clue_door_log',
      type: 'access_log',
      locked: true,
      hint: { kind: 'after_clue', clueId: 'clue_ledger_missing' },
    },
  ],
  hypotheses: [
    { id: 'hyp_clerk', label: 'Julian Vance took the ledger' },
    { id: 'hyp_guard', label: 'Marcus Bell took the ledger' },
  ],
};

const MOCK_SESSION_STATE: SessionState = {
  id: 'sess_remote_999',
  caseId: 'case_remote_001',
  caseVersion: 1,
  mode: 'normal',
  status: 'in_progress',
  unlockedClueIds: ['clue_ledger_missing'],
  board: { cards: [], links: [] },
  startedAt: '2026-10-31T12:00:00.000Z',
};

class FakeApiClient implements ApiClient {
  public sessions: Record<string, SessionState> = {};
  public boards: Record<string, BoardState> = {};
  public submissions: Record<string, SubmitSessionRequest> = {};
  public shouldFailSaveBoard = false;
  public saveBoardFailStatus = 500;
  public shouldReturnBadSchema = false;

  async createSession(req?: CreateSessionRequest): Promise<CreateSessionResponse> {
    const session: SessionState = {
      ...MOCK_SESSION_STATE,
      caseId: req?.caseId ?? MOCK_PUBLIC_CASE.id,
      mode: req?.mode ?? 'normal',
    };
    this.sessions[session.id] = session;
    return {
      session,
      case: MOCK_PUBLIC_CASE,
    };
  }

  async unlockClue(sessionId: string, req: UnlockClueRequest): Promise<UnlockClueResponse> {
    const session = this.sessions[sessionId];
    if (!session) {
      throw new RemoteServiceError('SESSION_NOT_FOUND', 'Session not found', 404);
    }
    const publicClue = {
      id: req.clueId,
      type: 'access_log' as const,
      reliability: 'physical' as const,
      text: 'Vault door was accessed at 21:15.',
      unlock: { kind: 'default' as const },
      locked: false as const,
    };
    if (!session.unlockedClueIds.includes(req.clueId)) {
      session.unlockedClueIds.push(req.clueId);
    }
    return {
      clue: publicClue,
      unlockedClueIds: session.unlockedClueIds,
    };
  }

  async saveBoard(sessionId: string, req: SaveBoardRequest): Promise<SaveBoardResponse> {
    if (this.shouldFailSaveBoard) {
      throw new RemoteServiceError(
        this.saveBoardFailStatus === 404
          ? 'SESSION_NOT_FOUND'
          : this.saveBoardFailStatus === 409
            ? 'SESSION_ALREADY_SUBMITTED'
            : 'INTERNAL_SERVER_ERROR',
        'Save board failed',
        this.saveBoardFailStatus,
      );
    }
    this.boards[sessionId] = req.board;
    return {
      success: true,
      updatedAt: new Date().toISOString(),
    };
  }

  async submitSession(sessionId: string, req: SubmitSessionRequest): Promise<SubmitSessionResponse> {
    const session = this.sessions[sessionId];
    if (!session) {
      throw new RemoteServiceError('SESSION_NOT_FOUND', 'Session not found', 404);
    }
    if (session.status === 'submitted') {
      throw new RemoteServiceError('SESSION_ALREADY_SUBMITTED', 'Session already submitted', 409);
    }
    session.status = 'submitted';
    this.submissions[sessionId] = req;

    return {
      result: {
        score: 120,
        breakdown: {
          correctHypothesis: true,
          hypothesisPoints: 50,
          evidencePoints: 40,
          contradictionPoints: 30,
          penaltyPoints: 0,
          multiplier: 1.0,
        },
        xp: 150,
      },
      reveal: {
        caseId: session.caseId,
        solutionHypothesisId: 'hyp_clerk',
        explanation: [{ text: 'The clerk forged the ledger.', clueIds: ['clue_ledger_missing'] }],
        allClues: [],
        culprits: ['char_clerk'],
        validLinks: [],
        invalidLinks: [],
      },
      progress: {
        rank: 'Investigator',
        xp: 150,
        solvedCount: 1,
        correctCount: 1,
        mastery: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 0 },
        solvedCaseIds: [session.caseId],
        unlockedDossierIds: ['char_clerk'],
      },
    };
  }

  async getDaily(): Promise<DailyCaseResponse> {
    return {
      date: '2026-10-31',
      caseId: MOCK_PUBLIC_CASE.id,
      case: MOCK_PUBLIC_CASE,
    };
  }

  async getWeekly(): Promise<WeeklyCaseResponse> { throw new Error('Not implemented'); }
  async getWeeklyAggregate(): Promise<WeeklyAggregateResponse> { throw new Error('Not implemented'); }
  async createChallenge(): Promise<CreateChallengeResponse> { throw new Error('Not implemented'); }
  async getChallenge(): Promise<GetChallengeResponse> { throw new Error('Not implemented'); }
  async createGuestToken(): Promise<CreateGuestTokenResponse> { throw new Error('Not implemented'); }
  async getChallengeCompare(): Promise<ChallengeCompareResponse> { throw new Error('Not implemented'); }
  async migrateLocal(): Promise<MigrateLocalResponse> { throw new Error('Not implemented'); }
  async deleteAccount(): Promise<DeleteAccountResponse> { throw new Error('Not implemented'); }
  async getGraph(): Promise<GraphResponse> {
    return {
      nodes: [{ id: 'char_clerk', name: 'Julian Vance', kind: 'character', revealed: true }],
      edges: [],
    };
  }
  async registerPushToken(): Promise<RegisterPushTokenResponse> { throw new Error('Not implemented'); }
}

describe('WP-43: RemoteGameService & Offline Queue', () => {
  let fakeApi: FakeApiClient;
  let memoryStore: MemoryKeyValueStore;
  let offlineQueue: SaveBoardOfflineQueue;
  let service: RemoteGameService;

  beforeEach(() => {
    useSessionStore.getState().clear();
    fakeApi = new FakeApiClient();
    memoryStore = new MemoryKeyValueStore();
    offlineQueue = new SaveBoardOfflineQueue(memoryStore);
    service = new RemoteGameService({
      apiClient: fakeApi,
      offlineQueue,
    });
  });

  describe('Full Session Flow (Start -> Unlock -> SaveBoard -> Submit)', () => {
    it('successfully starts remote session and populates local session store', async () => {
      const outcome = await service.startSession({
        caseId: 'case_remote_001',
        mode: 'normal',
      });

      expect(outcome.session.id).toBe('sess_remote_999');
      expect(outcome.session.status).toBe('in_progress');
      expect(outcome.case.id).toBe('case_remote_001');

      // Check store populated
      const storedSession = useSessionStore.getState().getSession('sess_remote_999');
      expect(storedSession).toBeDefined();
      expect(storedSession?.caseId).toBe('case_remote_001');

      // Leak scan
      deepScan(outcome);
    });

    it('unlocks clue remotely and updates session store state', async () => {
      await service.startSession();

      const clue = await service.unlockClue('sess_remote_999', 'clue_door_log', { kind: 'request', cost: 1 });

      expect(clue.id).toBe('clue_door_log');
      expect(clue.locked).toBe(false);

      const storedSession = useSessionStore.getState().getSession('sess_remote_999');
      expect(storedSession?.unlockedClueIds).toContain('clue_door_log');
    });

    it('saves board online and clears offline queue entry', async () => {
      await service.startSession();

      const board: BoardState = {
        cards: [{ id: 'clue_ledger_missing', x: 100, y: 150 }],
        links: [],
      };

      await service.saveBoard('sess_remote_999', board);

      expect(fakeApi.boards['sess_remote_999']).toEqual(board);
      expect(offlineQueue.hasPending('sess_remote_999')).toBe(false);
    });

    it('enforces submit pending state and stores outcome in session store', async () => {
      await service.startSession();

      expect(service.isSubmitting('sess_remote_999')).toBe(false);

      const submitPromise = service.submit({
        sessionId: 'sess_remote_999',
        hypothesisId: 'hyp_clerk',
        supportingClueIds: ['clue_ledger_missing'],
        contradictions: [],
      });

      expect(service.isSubmitting('sess_remote_999')).toBe(true);

      const result = await submitPromise;
      expect(service.isSubmitting('sess_remote_999')).toBe(false);

      expect(result.result.score).toBe(120);
      expect(result.reveal.solutionHypothesisId).toBe('hyp_clerk');

      // Store updated
      const outcome = useSessionStore.getState().getResult('sess_remote_999');
      expect(outcome).toBeDefined();
      expect(outcome?.result.score).toBe(120);

      // Leak scan
      deepScan(result);
    });

    it('rejects concurrent submissions for the same session (submit lock)', async () => {
      await service.startSession();

      let resolveSlowSubmit!: (val: SubmitSessionResponse) => void;
      const slowPromise = new Promise<SubmitSessionResponse>((resolve) => {
        resolveSlowSubmit = resolve;
      });

      vi.spyOn(fakeApi, 'submitSession').mockImplementationOnce(() => slowPromise);

      const firstSubmit = service.submit({
        sessionId: 'sess_remote_999',
        hypothesisId: 'hyp_clerk',
        supportingClueIds: [],
        contradictions: [],
      });

      await expect(
        service.submit({
          sessionId: 'sess_remote_999',
          hypothesisId: 'hyp_clerk',
          supportingClueIds: [],
          contradictions: [],
        }),
      ).rejects.toThrow(/already in progress/i);

      resolveSlowSubmit({
        result: { score: 100, breakdown: { correctHypothesis: true, hypothesisPoints: 50, evidencePoints: 50, contradictionPoints: 0, penaltyPoints: 0, multiplier: 1 }, xp: 100 },
        reveal: { caseId: 'case_remote_001', solutionHypothesisId: 'hyp_clerk', explanation: [], allClues: [], culprits: ['char_clerk'], validLinks: [], invalidLinks: [] },
        progress: { rank: 'Trainee', xp: 100, solvedCount: 1, correctCount: 1, mastery: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, solvedCaseIds: [], unlockedDossierIds: [] },
      });

      await firstSubmit;
    });
  });

  describe('SaveBoard Offline Queue & Last-Write-Wins', () => {
    it('persists queued board and keeps last write wins when offline', async () => {
      fakeApi.shouldFailSaveBoard = true;
      fakeApi.saveBoardFailStatus = 503;

      const board1: BoardState = {
        cards: [{ id: 'card_1', x: 10, y: 20 }],
        links: [],
      };
      const board2: BoardState = {
        cards: [{ id: 'card_1', x: 50, y: 80 }],
        links: [{ a: 'card_1', b: 'card_2' }],
      };

      // First write fails remote, enqueues
      await service.saveBoard('sess_remote_999', board1);
      expect(offlineQueue.hasPending('sess_remote_999')).toBe(true);
      expect(offlineQueue.getPending('sess_remote_999')?.board).toEqual(board1);

      // Second write overwrites previous pending board (last-write-wins)
      await service.saveBoard('sess_remote_999', board2);
      expect(offlineQueue.getPendingCount()).toBe(1);
      expect(offlineQueue.getPending('sess_remote_999')?.board).toEqual(board2);

      // When back online, flush flushes the latest board
      fakeApi.shouldFailSaveBoard = false;
      const { flushed, failed } = await service.flushOfflineQueue();
      expect(flushed).toBe(1);
      expect(failed).toBe(0);
      expect(fakeApi.boards['sess_remote_999']).toEqual(board2);
      expect(offlineQueue.hasPending('sess_remote_999')).toBe(false);
    });

    it('purges entry from offline queue if server returns 4xx client error', async () => {
      offlineQueue.enqueue('sess_expired', { cards: [], links: [] });
      expect(offlineQueue.hasPending('sess_expired')).toBe(true);

      fakeApi.shouldFailSaveBoard = true;
      fakeApi.saveBoardFailStatus = 404; // Session not found

      const { flushed, failed } = await service.flushOfflineQueue();
      expect(flushed).toBe(0);
      expect(failed).toBe(1);

      // 4xx error is non-retryable; dead entry is removed to avoid poisoning queue
      expect(offlineQueue.hasPending('sess_expired')).toBe(false);
    });
  });

  describe('FetchApiClient: Schema Validation & Error Envelope Mapping', () => {
    it('rejects on schema mismatch when server returns invalid payload', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ invalidField: 123 }),
      });

      const client = new FetchApiClient({
        baseUrl: 'http://example.com/api',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      await expect(client.createSession()).rejects.toThrow(RemoteServiceError);
      await expect(client.createSession()).rejects.toThrow(/Schema mismatch/i);
    });

    it('maps ApiErrorEnvelope to typed RemoteServiceError with correct flags', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () =>
          JSON.stringify({
            error: {
              code: 'SESSION_NOT_FOUND',
              message: 'Target session does not exist',
              requestId: 'req_123',
            },
          }),
      });

      const client = new FetchApiClient({
        baseUrl: 'http://example.com/api',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      try {
        await client.unlockClue('sess_999', { clueId: 'clue_1', via: { kind: 'request', cost: 1 } });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(RemoteServiceError);
        const rErr = err as RemoteServiceError;
        expect(rErr.code).toBe('SESSION_NOT_FOUND');
        expect(rErr.status).toBe(404);
        expect(rErr.isNotFound).toBe(true);
        expect(rErr.isClientError).toBe(true);
        expect(rErr.isServerError).toBe(false);
        expect(rErr.requestId).toBe('req_123');
      }
    });

    it('handles network failure gracefully as NETWORK_ERROR', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const client = new FetchApiClient({
        baseUrl: 'http://example.com/api',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      try {
        await client.createSession();
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(RemoteServiceError);
        const rErr = err as RemoteServiceError;
        expect(rErr.code).toBe('NETWORK_ERROR');
      }
    });
  });

  describe('TanStack Query Retry Behavior', () => {
    it('disallows retries for 4xx client errors in query client', () => {
      const qc = createRemoteQueryClient();
      const defaultOptions = qc.getDefaultOptions();
      const retryFn = defaultOptions.queries?.retry;

      expect(typeof retryFn).toBe('function');
      if (typeof retryFn === 'function') {
        const clientErr = new RemoteServiceError('BAD_REQUEST', 'Bad input', 400);
        expect(retryFn(1, clientErr)).toBe(false);

        const notFoundErr = new RemoteServiceError('SESSION_NOT_FOUND', 'Not found', 404);
        expect(retryFn(1, notFoundErr)).toBe(false);

        const serverErr = new RemoteServiceError('INTERNAL_SERVER_ERROR', 'Server crash', 500);
        expect(retryFn(1, serverErr)).toBe(true);
        expect(retryFn(2, serverErr)).toBe(true);
        expect(retryFn(3, serverErr)).toBe(false);
      }
    });
  });
});
