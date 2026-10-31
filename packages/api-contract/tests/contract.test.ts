import { describe, expect, it } from 'vitest';
import {
  API_CONTRACT_VERSION,
  ApiErrorEnvelopeSchema,
  ApiErrorCodeSchema,
  CreateSessionRequestSchema,
  CreateSessionResponseSchema,
  UnlockClueRequestSchema,
  UnlockClueResponseSchema,
  SaveBoardRequestSchema,
  SaveBoardResponseSchema,
  SubmitSessionRequestSchema,
  SubmitSessionResponseSchema,
  DailyCaseResponseSchema,
  WeeklyCaseResponseSchema,
  WeeklyAggregateResponseSchema,
  CreateChallengeRequestSchema,
  CreateChallengeResponseSchema,
  GetChallengeResponseSchema,
  CreateGuestTokenRequestSchema,
  CreateGuestTokenResponseSchema,
  ChallengeCompareResponseSchema,
  MigrateLocalRequestSchema,
  MigrateLocalResponseSchema,
  DeleteAccountResponseSchema,
  GraphResponseSchema,
  RegisterPushTokenRequestSchema,
  RegisterPushTokenResponseSchema,
  UnregisterPushTokenRequestSchema,
  UnregisterPushTokenResponseSchema,
  CaseReportRequestSchema,
  CaseReportResponseSchema,
} from '../src/index.js';
import { toPublicCase, type CaseDefinition } from '@lastlie/case-engine';
import case0001Raw from '../../../packages/content/cases/authored/case_0001.json';

const typedCase0001 = case0001Raw as unknown as CaseDefinition;

describe('API Contract Suite', () => {
  it('exports valid semantic package version', () => {
    expect(API_CONTRACT_VERSION).toBe('0.2.0');
  });

  describe('Error Envelope', () => {
    it('validates error codes', () => {
      expect(ApiErrorCodeSchema.parse('UNAUTHORIZED')).toBe('UNAUTHORIZED');
      expect(ApiErrorCodeSchema.parse('SESSION_NOT_FOUND')).toBe('SESSION_NOT_FOUND');
    });

    it('accepts standard error envelope', () => {
      const parsed = ApiErrorEnvelopeSchema.parse({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing bearer token',
          requestId: 'req_123',
        },
      });
      expect(parsed.error.code).toBe('UNAUTHORIZED');
      expect(parsed.error.requestId).toBe('req_123');
    });

    it('rejects unknown error code', () => {
      expect(() =>
        ApiErrorEnvelopeSchema.parse({
          error: {
            code: 'NOT_A_REAL_CODE' as unknown as 'UNAUTHORIZED',
            message: 'Boom',
          },
        }),
      ).toThrow();
    });

    it('rejects extra fields on error envelope (strictness)', () => {
      expect(() =>
        ApiErrorEnvelopeSchema.parse({
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid payload',
            extraInfo: 'sneaky',
          } as unknown as { code: 'BAD_REQUEST'; message: string },
        }),
      ).toThrow();
    });
  });

  describe('Sessions Contract', () => {
    const publicCase = toPublicCase(typedCase0001, ['clue_testimony_kavita_initial']);

    it('validates CreateSession request and response', () => {
      const req = CreateSessionRequestSchema.parse({
        caseId: 'case_0001',
        mode: 'normal',
      });
      expect(req.mode).toBe('normal');

      // Default mode
      const defaultReq = CreateSessionRequestSchema.parse({});
      expect(defaultReq.mode).toBe('normal');

      // Response round trip
      const session = {
        id: 'sess_123',
        userId: 'user_456',
        caseId: 'case_0001',
        caseVersion: 1,
        mode: 'normal' as const,
        unlockedClueIds: ['clue_testimony_kavita_initial'],
        board: { cards: [], links: [] },
        status: 'in_progress' as const,
        startedAt: new Date(1700000000000).toISOString(),
      };

      const res = CreateSessionResponseSchema.parse({
        session,
        case: publicCase,
      });
      expect(res.session.id).toBe('sess_123');
      expect(res.case.id).toBe('case_0001');
    });

    it('enforces strictness on CreateSessionRequest', () => {
      expect(() =>
        CreateSessionRequestSchema.parse({
          caseId: 'case_0001',
          unknownField: true,
        }),
      ).toThrow();
    });

    it('validates UnlockClue request and response', () => {
      const req = UnlockClueRequestSchema.parse({
        clueId: 'locked_0',
        via: { kind: 'after_clue', clueId: 'clue_testimony_kavita_initial' },
      });
      expect(req.clueId).toBe('locked_0');

      const res = UnlockClueResponseSchema.parse({
        clue: publicCase.clues[0],
        unlockedClueIds: ['clue_testimony_kavita_initial', 'clue_phone_log'],
      });
      expect(res.unlockedClueIds).toHaveLength(2);
    });

    it('validates SaveBoard request and response', () => {
      const req = SaveBoardRequestSchema.parse({
        board: {
          cards: [{ id: 'clue_1', x: 10, y: 20, pinned: true }],
          links: [{ a: 'clue_1', b: 'clue_2', explanation: 'contradiction' }],
        },
      });
      expect(req.board.cards).toHaveLength(1);

      const res = SaveBoardResponseSchema.parse({
        success: true,
        updatedAt: new Date().toISOString(),
      });
      expect(res.success).toBe(true);
    });

    it('validates SubmitSession request and response', () => {
      const req = SubmitSessionRequestSchema.parse({
        hypothesisId: 'hypo_1',
        supportingClueIds: ['clue_1', 'clue_2'],
        contradictions: [{ a: 'clue_1', b: 'clue_2' }],
      });
      expect(req.supportingClueIds).toHaveLength(2);

      expect(() =>
        SubmitSessionRequestSchema.parse({
          hypothesisId: 'hypo_1',
          supportingClueIds: ['c1', 'c2', 'c3', 'c4'], // exceeds max 3
          contradictions: [],
        }),
      ).toThrow();

      const res = SubmitSessionResponseSchema.parse({
        result: {
          score: 85,
          breakdown: {
            correctHypothesis: true,
            hypothesisPoints: 100,
            evidencePoints: 30,
            contradictionPoints: 10,
            penaltyPoints: 0,
            multiplier: 1.0,
          },
          xp: 85,
        },
        reveal: {
          caseId: 'case_0001',
          solutionHypothesisId: 'hyp_theft_rahul',
          explanation: typedCase0001.truth.explanation,
          allClues: typedCase0001.clues,
          culprits: typedCase0001.truth.culpritIds,
          validLinks: [],
          invalidLinks: [],
        },
        progress: {
          xp: 85,
          rank: 'Trainee',
          solvedCount: 1,
          correctCount: 1,
          mastery: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 },
          solvedCaseIds: ['case_0001'],
          unlockedDossierIds: [],
        },
        tooFast: false,
      });
      expect(res.result.score).toBe(85);
      expect(res.reveal.caseId).toBe('case_0001');
    });
  });

  describe('Daily and Weekly Contracts', () => {
    it('validates DailyCaseResponse', () => {
      const res = DailyCaseResponseSchema.parse({
        date: '2026-11-01',
        caseId: 'case_0001',
      });
      expect(res.date).toBe('2026-11-01');

      expect(() =>
        DailyCaseResponseSchema.parse({
          date: '2026-11-01',
          caseId: 'case_0001',
          extra: 'bad',
        }),
      ).toThrow();
    });

    it('validates WeeklyCase and WeeklyAggregate responses', () => {
      const weeklyRes = WeeklyCaseResponseSchema.parse({
        id: 'week_2026_44',
        caseId: 'case_0002',
        weekNumber: 44,
        year: 2026,
        opensAt: '2026-11-01T00:00:00Z',
        closesAt: '2026-11-07T23:59:59Z',
        isOpen: true,
      });
      expect(weeklyRes.isOpen).toBe(true);

      const aggRes = WeeklyAggregateResponseSchema.parse({
        weeklyId: 'week_2026_44',
        totalParticipants: 42,
        hypothesisDistribution: { hyp_1: 30, hyp_2: 12 },
        clueUsage: { clue_a: 40, clue_b: 15 },
        averageScore: 78.5,
        leaderboard: [
          {
            userId: 'user_1',
            displayName: 'Detective Holmes',
            score: 100,
            submittedAt: '2026-11-02T10:00:00Z',
            rank: 1,
          },
        ],
      });
      expect(aggRes.totalParticipants).toBe(42);
      expect(aggRes.leaderboard[0]?.rank).toBe(1);
    });
  });

  describe('Challenges Contract', () => {
    const publicCase = toPublicCase(typedCase0001, ['clue_testimony_kavita_initial']);

    it('validates create, get, guest and compare challenge endpoints', () => {
      const createReq = CreateChallengeRequestSchema.parse({ sessionId: 'sess_123' });
      expect(createReq.sessionId).toBe('sess_123');

      const createRes = CreateChallengeResponseSchema.parse({
        code: 'XYZ98765',
        url: 'https://thelastlie.game/c/XYZ98765',
        expiresAt: '2026-11-08T00:00:00Z',
      });
      expect(createRes.code).toBe('XYZ98765');

      const getRes = GetChallengeResponseSchema.parse({
        code: 'XYZ98765',
        caseId: 'case_0001',
        caseVersion: 1,
        creatorDisplayName: 'Inspector Gadget',
        expiresAt: '2026-11-08T00:00:00Z',
        case: publicCase,
      });
      expect(getRes.creatorDisplayName).toBe('Inspector Gadget');

      const guestReq = CreateGuestTokenRequestSchema.parse({ guestId: 'guest_abc' });
      expect(guestReq.guestId).toBe('guest_abc');

      const guestRes = CreateGuestTokenResponseSchema.parse({
        guestToken: 'jwt.token.string',
        expiresAt: '2026-11-08T00:00:00Z',
      });
      expect(guestRes.guestToken).toBe('jwt.token.string');

      const compareRes = ChallengeCompareResponseSchema.parse({
        code: 'XYZ98765',
        totalParticipants: 10,
        hypothesisDistribution: { hyp_1: 8, hyp_2: 2 },
        mostUsedClues: [{ clueId: 'clue_testimony_kavita_initial', count: 10 }],
      });
      expect(compareRes.mostUsedClues[0]?.count).toBe(10);
    });
  });

  describe('Account and Migration Contract', () => {
    it('validates local progress migration and account deletion', () => {
      const req = MigrateLocalRequestSchema.parse({
        solvedCaseIds: ['case_0001'],
        localResults: [{ caseId: 'case_0001', completedAt: '2026-10-31T10:00:00Z' }],
      });
      expect(req.solvedCaseIds).toHaveLength(1);

      const res = MigrateLocalResponseSchema.parse({
        success: true,
        unlockedCaseIds: ['case_0001'],
        message: 'Successfully migrated 1 solved case to archive unlocks',
      });
      expect(res.success).toBe(true);

      const delRes = DeleteAccountResponseSchema.parse({
        success: true,
        message: 'Account and all associated records permanently deleted',
      });
      expect(delRes.success).toBe(true);
    });
  });

  describe('Conspiracy Graph Contract', () => {
    it('validates graph response format with revealed/unrevealed nodes', () => {
      const graph = GraphResponseSchema.parse({
        nodes: [
          {
            id: 'node_quiet',
            kind: 'organization',
            name: 'The Quiet',
            revealed: true,
          },
          {
            id: 'node_unknown_contact',
            kind: 'character',
            name: null, // Hidden neighbour name
            revealed: false,
          },
        ],
        edges: [
          {
            id: 'edge_1',
            from: 'node_quiet',
            to: 'node_unknown_contact',
            rel: 'funds',
            revealedByCaseId: 'case_0001',
          },
        ],
      });
      expect(graph.nodes).toHaveLength(2);
      expect(graph.nodes[1]?.name).toBeNull();
      expect(graph.edges[0]?.rel).toBe('funds');
    });
  });

  describe('Push Notifications Contract', () => {
    it('validates push token registration', () => {
      const req = RegisterPushTokenRequestSchema.parse({
        token: 'ExponentPushToken[xxxxxxxxxxxxxx]',
        platform: 'ios',
      });
      expect(req.platform).toBe('ios');

      const res = RegisterPushTokenResponseSchema.parse({
        success: true,
      });
      expect(res.success).toBe(true);
    });

    it('validates push token deregistration', () => {
      const req = UnregisterPushTokenRequestSchema.parse({
        token: 'ExponentPushToken[xxxxxxxxxxxxxx]',
      });
      expect(req.token).toBe('ExponentPushToken[xxxxxxxxxxxxxx]');

      const emptyReq = UnregisterPushTokenRequestSchema.parse({});
      expect(emptyReq.token).toBeUndefined();

      const res = UnregisterPushTokenResponseSchema.parse({
        success: true,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('Case Reports & Moderation Contract', () => {
    it('validates case report request with allowed reasons', () => {
      const req = CaseReportRequestSchema.parse({
        reason: 'broken_logic',
        note: 'The timestamp contradictions do not match the logs.',
      });
      expect(req.reason).toBe('broken_logic');
      expect(req.note).toBeDefined();

      // Note is optional
      const reqNoNote = CaseReportRequestSchema.parse({
        reason: 'typo',
      });
      expect(reqNoNote.note).toBeUndefined();

      // Rejects invalid reason
      expect(() =>
        CaseReportRequestSchema.parse({
          reason: 'invalid_reason',
        }),
      ).toThrow();

      // Rejects note exceeding 280 chars
      expect(() =>
        CaseReportRequestSchema.parse({
          reason: 'offensive',
          note: 'x'.repeat(281),
        }),
      ).toThrow();
    });

    it('validates case report response', () => {
      const res = CaseReportResponseSchema.parse({
        success: true,
        reportId: 'rep_12345',
        caseId: 'case_0001',
      });
      expect(res.success).toBe(true);
      expect(res.reportId).toBe('rep_12345');
    });
  });
});
