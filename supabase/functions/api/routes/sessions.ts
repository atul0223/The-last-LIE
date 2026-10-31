import { Hono } from 'hono';
import {
  CreateSessionRequestSchema,
  CreateSessionResponseSchema,
  SaveBoardRequestSchema,
  SaveBoardResponseSchema,
  SubmitSessionRequestSchema,
  SubmitSessionResponseSchema,
  UnlockClueRequestSchema,
  UnlockClueResponseSchema,
} from '@lastlie/api-contract';
import {
  applyResult,
  buildReveal,
  canUnlock,
  scoreSubmission,
  toPublicCase,
} from '@lastlie/case-engine';
import type { AppConfig, AppContextVariables, Clock, Repository } from '../../_shared/types.js';
import { errorResponse } from '../../_shared/middleware.js';

export function createSessionsRouter(deps: { repo: Repository; clock: Clock; config: AppConfig }) {
  const router = new Hono<{ Variables: AppContextVariables }>();
  const { repo, clock, config } = deps;

  // POST /sessions
  router.post('/', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return errorResponse(c, 'UNAUTHORIZED', 'Missing authenticated user', 401);
    }

    const rawBody = await c.req.json().catch(() => ({}));
    const parseResult = CreateSessionRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return errorResponse(c, 'BAD_REQUEST', parseResult.error.message, 400);
    }

    const { caseId, mode } = parseResult.data;

    let targetCaseRow = null;
    if (caseId) {
      targetCaseRow = await repo.getPublishedCase(caseId);
      if (!targetCaseRow) {
        return errorResponse(c, 'NOT_FOUND', `Published case '${caseId}' not found`, 404);
      }
    } else {
      const published = await repo.listPublishedCases({ limit: 1 });
      if (published.length === 0) {
        return errorResponse(c, 'NOT_FOUND', 'No published cases available to start session', 404);
      }
      targetCaseRow = published[0]!;
    }

    // Default unlocked clues: any clue with unlock.kind === 'default'
    const def = await repo.getCasePrivate(targetCaseRow.id, targetCaseRow.version);
    const defaultUnlockedIds: string[] = [];
    if (def) {
      for (const clue of def.clues) {
        if (clue.unlock.kind === 'default') {
          defaultUnlockedIds.push(clue.id);
        }
      }
    }

    const publicCase = def ? toPublicCase(def, defaultUnlockedIds) : targetCaseRow.publicPayload;

    const sessionId = `sess_${Math.random().toString(36).substring(2, 12)}`;
    const session = await repo.createSession({
      id: sessionId,
      userId,
      caseId: targetCaseRow.id,
      caseVersion: targetCaseRow.version,
      mode: mode ?? 'normal',
      unlockedClueIds: defaultUnlockedIds,
      board: { cards: [], links: [] },
      status: 'in_progress',
      startedAt: clock.now().toISOString(),
    });

    return c.json(
      CreateSessionResponseSchema.parse({
        session,
        case: publicCase,
      }),
      201,
    );
  });

  // POST /sessions/:id/unlock
  router.post('/:id/unlock', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return errorResponse(c, 'UNAUTHORIZED', 'Missing authenticated user', 401);
    }

    const sessionId = c.req.param('id');
    const session = await repo.getSession(sessionId, userId);
    if (!session) {
      // 404 to avoid enumeration / IDOR leak
      return errorResponse(c, 'SESSION_NOT_FOUND', `Session '${sessionId}' not found`, 404);
    }

    if (session.status !== 'in_progress') {
      return errorResponse(c, 'SESSION_ALREADY_SUBMITTED', 'Cannot unlock clues in a submitted session', 400);
    }

    const rawBody = await c.req.json().catch(() => null);
    const parseResult = UnlockClueRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return errorResponse(c, 'BAD_REQUEST', parseResult.error.message, 400);
    }

    const { clueId, via } = parseResult.data;

    const def = await repo.getCasePrivate(session.caseId, session.caseVersion);
    if (!def) {
      return errorResponse(c, 'INTERNAL_SERVER_ERROR', 'Case definition not found', 500);
    }

    // Map placeholder id ('locked_1', 'locked_0', etc.) to real clue id
    let realClueId = clueId;
    if (clueId.startsWith('locked_')) {
      let counter = 0;
      let matchedId: string | null = null;
      for (const clue of def.clues) {
        if (!session.unlockedClueIds.includes(clue.id)) {
          counter++;
          if (clueId === `locked_${counter}` || clueId === `locked_${counter - 1}`) {
            matchedId = clue.id;
            break;
          }
        }
      }
      if (!matchedId) {
        return errorResponse(c, 'BAD_REQUEST', `Placeholder '${clueId}' does not correspond to an unlockable clue`, 400);
      }
      realClueId = matchedId;
    }

    // Evaluate unlock rules using engine's canUnlock
    const canUnlockResult = canUnlock(def, session, realClueId, via as any);
    if (!canUnlockResult.ok) {
      if (canUnlockResult.error === 'already_unlocked') {
        return errorResponse(c, 'CLUE_ALREADY_UNLOCKED', canUnlockResult.message, 400);
      }
      return errorResponse(c, 'UNLOCK_CONDITION_NOT_MET', canUnlockResult.message, 400);
    }

    const newUnlockedIds = [...session.unlockedClueIds, realClueId];
    await repo.updateSession(sessionId, userId, {
      unlockedClueIds: newUnlockedIds,
    });

    const publicCase = toPublicCase(def, newUnlockedIds);
    const unlockedPublicClue = publicCase.clues.find((cl) => cl.id === realClueId);
    if (!unlockedPublicClue) {
      return errorResponse(c, 'INTERNAL_SERVER_ERROR', 'Failed to render unlocked clue', 500);
    }

    return c.json(
      UnlockClueResponseSchema.parse({
        clue: unlockedPublicClue,
        unlockedClueIds: newUnlockedIds,
      }),
      200,
    );
  });

  // PUT /sessions/:id/board
  router.put('/:id/board', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return errorResponse(c, 'UNAUTHORIZED', 'Missing authenticated user', 401);
    }

    const sessionId = c.req.param('id');
    const session = await repo.getSession(sessionId, userId);
    if (!session) {
      return errorResponse(c, 'SESSION_NOT_FOUND', `Session '${sessionId}' not found`, 404);
    }

    if (session.status !== 'in_progress') {
      return errorResponse(c, 'SESSION_ALREADY_SUBMITTED', 'Cannot modify board of a submitted session', 400);
    }

    const rawBody = await c.req.json().catch(() => null);
    const parseResult = SaveBoardRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return errorResponse(c, 'BAD_REQUEST', parseResult.error.message, 400);
    }

    await repo.updateSession(sessionId, userId, {
      board: parseResult.data.board,
    });

    return c.json(
      SaveBoardResponseSchema.parse({
        success: true,
        updatedAt: clock.now().toISOString(),
      }),
      200,
    );
  });

  // POST /sessions/:id/submit
  router.post('/:id/submit', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return errorResponse(c, 'UNAUTHORIZED', 'Missing authenticated user', 401);
    }

    const sessionId = c.req.param('id');
    const session = await repo.getSession(sessionId, userId);
    if (!session) {
      return errorResponse(c, 'SESSION_NOT_FOUND', `Session '${sessionId}' not found`, 404);
    }

    const rawBody = await c.req.json().catch(() => null);
    const parseResult = SubmitSessionRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return errorResponse(c, 'BAD_REQUEST', parseResult.error.message, 400);
    }

    const { hypothesisId, supportingClueIds, contradictions } = parseResult.data;

    // Check if session was already submitted (idempotency)
    if (session.status === 'submitted') {
      const def = await repo.getCasePrivate(session.caseId, session.caseVersion);
      if (!def) {
        return errorResponse(c, 'INTERNAL_SERVER_ERROR', 'Case definition not found', 500);
      }
      const submission = {
        sessionId,
        hypothesisId,
        supportingClueIds,
        contradictions,
      };
      const scoreResult = scoreSubmission(def, session, submission);
      const reveal = buildReveal(def, submission);
      const progress = (await repo.getPlayerProgress(userId)) ?? {
        userId,
        xp: 0,
        rank: 'Trainee',
        solvedCount: 1,
        correctCount: 1,
        mastery: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        solvedCaseIds: [session.caseId],
        unlockedDossierIds: [],
      };

      return c.json(
        SubmitSessionResponseSchema.parse({
          result: scoreResult,
          reveal,
          progress,
          tooFast: false,
        }),
        200,
      );
    }

    const def = await repo.getCasePrivate(session.caseId, session.caseVersion);
    if (!def) {
      return errorResponse(c, 'INTERNAL_SERVER_ERROR', 'Case definition not found', 500);
    }

    const submission = {
      sessionId,
      hypothesisId,
      supportingClueIds,
      contradictions,
    };

    // Duration timing check
    const now = clock.now();
    const startedAtMs = new Date(session.startedAt).getTime();
    const durationSeconds = Math.max(0, (now.getTime() - startedAtMs) / 1000);
    const tooFast = durationSeconds < config.minSubmitDurationSeconds;

    const scoreResult = scoreSubmission(def, session, submission);
    const reveal = buildReveal(def, submission);

    const currentProgress = (await repo.getPlayerProgress(userId)) ?? {
      userId,
      xp: 0,
      rank: 'Trainee',
      solvedCount: 0,
      correctCount: 0,
      mastery: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      solvedCaseIds: [],
      unlockedDossierIds: [],
    };

    const { progress: updatedProgress } = applyResult(
      currentProgress,
      scoreResult,
      {
        id: def.id,
        difficulty: def.difficulty,
        mode: session.mode,
        characters: def.characters,
      },
    );

    const txResult = await repo.saveSubmitTransaction({
      session,
      result: scoreResult,
      reveal,
      progress: updatedProgress,
      tooFast,
      submission: {
        hypothesisId,
        supportingClueIds,
        contradictions,
      },
    });

    // Grant conspiracy graph reveals if case solved correctly
    if (scoreResult.breakdown.correctHypothesis) {
      await repo.grantGraphReveals(userId, session.caseId);
    }

    return c.json(
      SubmitSessionResponseSchema.parse({
        result: txResult.result,
        reveal: txResult.reveal,
        progress: txResult.progress,
        tooFast,
      }),
      200,
    );
  });

  return router;
}
