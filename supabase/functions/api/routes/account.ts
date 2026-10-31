import { Hono } from 'hono';
import {
  DeleteAccountResponseSchema,
  MigrateLocalRequestSchema,
  MigrateLocalResponseSchema,
  RegisterPushTokenRequestSchema,
  RegisterPushTokenResponseSchema,
  UnregisterPushTokenRequestSchema,
  UnregisterPushTokenResponseSchema,
} from '@lastlie/api-contract';
import type { AppContextVariables, Repository } from '../../_shared/types.js';
import { errorResponse } from '../../_shared/middleware.js';

export function createAccountRouter(deps: { repo: Repository }) {
  const router = new Hono<{ Variables: AppContextVariables }>();
  const { repo } = deps;

  // POST /account/migrate-local
  // Anti-Cheat: Accepts local completed cases and grants archive unlocks ONLY.
  // Never awards XP or retroactively updates rank/mastery.
  router.post('/migrate-local', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return errorResponse(c, 'UNAUTHORIZED', 'Missing authenticated user', 401);
    }

    const rawBody = await c.req.json().catch(() => null);
    const parseResult = MigrateLocalRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return errorResponse(c, 'BAD_REQUEST', parseResult.error.message, 400);
    }

    const { solvedCaseIds, localResults } = parseResult.data;

    // Combine distinct case IDs from solvedCaseIds and localResults
    const candidateCaseIds = new Set<string>();
    for (const id of solvedCaseIds) candidateCaseIds.add(id);
    for (const res of localResults) candidateCaseIds.add(res.caseId);

    const validUnlockedCaseIds: string[] = [];

    // Verify case exists before granting unlock
    for (const caseId of candidateCaseIds) {
      const caseRow = await repo.getPublishedCase(caseId);
      if (caseRow) {
        validUnlockedCaseIds.push(caseId);
      }
    }

    const unlocked = await repo.migrateLocalProgress(userId, validUnlockedCaseIds);

    return c.json(
      MigrateLocalResponseSchema.parse({
        success: true,
        unlockedCaseIds: unlocked,
        message: `Successfully migrated ${unlocked.length} solved cases to archive unlocks. Anti-cheat policy: XP must be earned through verified remote submissions.`,
      }),
      200,
    );
  });

  // DELETE /account
  // Permanently deletes the user and all associated gameplay rows
  router.delete('/', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return errorResponse(c, 'UNAUTHORIZED', 'Missing authenticated user', 401);
    }

    await repo.deleteUserAccount(userId);

    return c.json(
      DeleteAccountResponseSchema.parse({
        success: true,
        message: 'Account and all associated investigation records permanently deleted',
      }),
      200,
    );
  });

  return router;
}

export function createPushRouter(deps: { repo: Repository }) {
  const router = new Hono<{ Variables: AppContextVariables }>();
  const { repo } = deps;

  // POST /push/token
  router.post('/token', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return errorResponse(c, 'UNAUTHORIZED', 'Missing authenticated user', 401);
    }

    const rawBody = await c.req.json().catch(() => null);
    const parseResult = RegisterPushTokenRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return errorResponse(c, 'BAD_REQUEST', parseResult.error.message, 400);
    }

    const { token, platform } = parseResult.data;
    await repo.savePushToken(userId, token, platform);

    return c.json(
      RegisterPushTokenResponseSchema.parse({
        success: true,
      }),
      200,
    );
  });

  // DELETE /push/token
  router.delete('/token', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return errorResponse(c, 'UNAUTHORIZED', 'Missing authenticated user', 401);
    }

    const rawBody = await c.req.json().catch(() => ({}));
    const parseResult = UnregisterPushTokenRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return errorResponse(c, 'BAD_REQUEST', parseResult.error.message, 400);
    }

    const token = parseResult.data?.token || c.req.query('token');
    await repo.deletePushToken(userId, token);

    return c.json(
      UnregisterPushTokenResponseSchema.parse({
        success: true,
      }),
      200,
    );
  });

  return router;
}
