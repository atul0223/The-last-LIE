import { Hono } from 'hono';
import crypto from 'node:crypto';
import {
  ChallengeCompareResponseSchema,
  CreateChallengeRequestSchema,
  CreateChallengeResponseSchema,
  CreateGuestTokenRequestSchema,
  CreateGuestTokenResponseSchema,
  GetChallengeResponseSchema,
} from '@lastlie/api-contract';
import type { AppConfig, AppContextVariables, Clock, Repository } from '../../_shared/types.js';
import { errorResponse } from '../../_shared/middleware.js';
import { signGuestToken, verifyGuestToken } from '../../_shared/guest_token.js';

const UNAMBIGUOUS_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateShortCode(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += UNAMBIGUOUS_CHARS[bytes[i]! % UNAMBIGUOUS_CHARS.length];
  }
  return result;
}

export function createChallengesRouter(deps: { repo: Repository; clock: Clock; config: AppConfig }) {
  const router = new Hono<{ Variables: AppContextVariables }>();
  const { repo, clock, config } = deps;

  // POST /challenges (auth required)
  router.post('/', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return errorResponse(c, 'UNAUTHORIZED', 'Missing authenticated user', 401);
    }

    const rawBody = await c.req.json().catch(() => null);
    const parseResult = CreateChallengeRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return errorResponse(c, 'BAD_REQUEST', parseResult.error.message, 400);
    }

    const { sessionId } = parseResult.data;
    const session = await repo.getSession(sessionId, userId);
    if (!session) {
      return errorResponse(c, 'SESSION_NOT_FOUND', `Session '${sessionId}' not found`, 404);
    }

    // Creator MUST have submitted the session before creating a challenge
    if (session.status !== 'submitted') {
      return errorResponse(
        c,
        'SUBMISSION_REQUIRED',
        'You must complete and submit your investigation before creating a challenge',
        400,
      );
    }

    const code = generateShortCode(8);
    const now = clock.now();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();

    await repo.createChallenge({
      id: code,
      creatorId: userId,
      caseId: session.caseId,
      caseVersion: session.caseVersion,
      createdAt: now.toISOString(),
      expiresAt,
    });

    return c.json(
      CreateChallengeResponseSchema.parse({
        code,
        url: `https://thelastlie.game/c/${code}`,
        expiresAt,
      }),
      201,
    );
  });

  // GET /challenges/:code (public)
  router.get('/:code', async (c) => {
    const code = c.req.param('code');
    const challenge = await repo.getChallenge(code);
    if (!challenge) {
      return errorResponse(c, 'CHALLENGE_NOT_FOUND', `Challenge '${code}' not found`, 404);
    }

    const now = clock.now().toISOString();
    if (challenge.expiresAt < now) {
      return errorResponse(c, 'CHALLENGE_EXPIRED', `Challenge '${code}' has expired`, 410);
    }

    const caseRow = await repo.getPublishedCase(challenge.caseId);
    if (!caseRow) {
      return errorResponse(c, 'NOT_FOUND', `Case '${challenge.caseId}' not found`, 404);
    }

    return c.json(
      GetChallengeResponseSchema.parse({
        code: challenge.id,
        caseId: challenge.caseId,
        caseVersion: challenge.caseVersion,
        expiresAt: challenge.expiresAt,
        case: caseRow.publicPayload,
      }),
      200,
    );
  });

  // POST /challenges/:code/guest (public, creates 7-day signed guest token)
  router.post('/:code/guest', async (c) => {
    const code = c.req.param('code');
    const challenge = await repo.getChallenge(code);
    if (!challenge) {
      return errorResponse(c, 'CHALLENGE_NOT_FOUND', `Challenge '${code}' not found`, 404);
    }

    const now = clock.now().toISOString();
    if (challenge.expiresAt < now) {
      return errorResponse(c, 'CHALLENGE_EXPIRED', `Challenge '${code}' has expired`, 410);
    }

    const rawBody = await c.req.json().catch(() => ({}));
    const parseResult = CreateGuestTokenRequestSchema.safeParse(rawBody);
    const guestId = parseResult.success && parseResult.data.guestId
      ? parseResult.data.guestId
      : `guest_${crypto.randomUUID()}`;

    const { token, expiresAt } = signGuestToken(
      { challengeId: code, caseId: challenge.caseId, guestId },
      config.guestHmacSecret,
      7,
    );

    return c.json(
      CreateGuestTokenResponseSchema.parse({
        guestToken: token,
        expiresAt,
      }),
      200,
    );
  });

  // GET /challenges/:code/compare (only callers who have submitted get comparison aggregates)
  router.get('/:code/compare', async (c) => {
    const code = c.req.param('code');
    const challenge = await repo.getChallenge(code);
    if (!challenge) {
      return errorResponse(c, 'CHALLENGE_NOT_FOUND', `Challenge '${code}' not found`, 404);
    }

    // Determine caller identity: authenticated user or guest token
    const userId = c.get('userId');
    const guestHeader = c.req.header('x-guest-token');
    let callerGuestId: string | null = null;

    if (guestHeader) {
      const verifyRes = verifyGuestToken(guestHeader, config.guestHmacSecret);
      if (verifyRes.valid && verifyRes.payload?.challengeId === code) {
        callerGuestId = verifyRes.payload.guestId;
      }
    }

    const attempts = await repo.getChallengeAttempts(code);

    // Verify caller has submitted an attempt
    const hasSubmitted =
      (userId && attempts.some((a) => a.userId === userId)) ||
      (callerGuestId && attempts.some((a) => a.guestToken?.includes(callerGuestId!)));

    // Also creator has inherently submitted
    const isCreator = userId && challenge.creatorId === userId;

    if (!hasSubmitted && !isCreator) {
      return errorResponse(
        c,
        'SUBMISSION_REQUIRED',
        'You must complete this challenge before viewing the comparison summary',
        403,
      );
    }

    // Aggregate statistics
    const hypothesisDistribution: Record<string, number> = {};
    const clueCountMap = new Map<string, number>();

    for (const att of attempts) {
      hypothesisDistribution[att.hypothesisId] = (hypothesisDistribution[att.hypothesisId] ?? 0) + 1;
      for (const clueId of att.supportingClueIds) {
        clueCountMap.set(clueId, (clueCountMap.get(clueId) ?? 0) + 1);
      }
    }

    const mostUsedClues = Array.from(clueCountMap.entries())
      .map(([clueId, count]) => ({ clueId, count }))
      .sort((a, b) => b.count - a.count);

    return c.json(
      ChallengeCompareResponseSchema.parse({
        code,
        totalParticipants: attempts.length,
        hypothesisDistribution,
        mostUsedClues,
      }),
      200,
    );
  });

  // POST /challenges/:code/attach (attaches guest result to account on sign-in once)
  router.post('/:code/attach', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return errorResponse(c, 'UNAUTHORIZED', 'Missing authenticated user', 401);
    }

    const code = c.req.param('code');
    const rawBody = await c.req.json().catch(() => null);
    const guestToken = rawBody?.guestToken;

    if (!guestToken || typeof guestToken !== 'string') {
      return errorResponse(c, 'BAD_REQUEST', 'guestToken is required', 400);
    }

    const verification = verifyGuestToken(guestToken, config.guestHmacSecret);
    if (!verification.valid || !verification.payload) {
      return errorResponse(c, 'GUEST_TOKEN_INVALID', 'Guest token is invalid or expired', 400);
    }

    const attempts = await repo.getChallengeAttempts(code);
    const guestAttempt = attempts.find((a) => a.guestToken === guestToken);

    if (guestAttempt && guestAttempt.userId) {
      return errorResponse(c, 'ALREADY_ATTACHED', 'This guest attempt is already attached to an account', 409);
    }

    if (guestAttempt) {
      guestAttempt.userId = userId;
    }

    return c.json({ success: true, message: 'Guest result successfully attached to your account' }, 200);
  });

  return router;
}
