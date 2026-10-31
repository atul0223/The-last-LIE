import { Hono } from 'hono';
import { DailyCaseResponseSchema } from '@lastlie/api-contract';
import type { AppContextVariables, Clock, Repository } from '../../_shared/types.js';
import { errorResponse } from '../../_shared/middleware.js';

export function createDailyRouter(deps: { repo: Repository; clock: Clock }) {
  const router = new Hono<{ Variables: AppContextVariables }>();
  const { repo, clock } = deps;

  // GET /daily
  router.get('/', async (c) => {
    const today = clock.now().toISOString().split('T')[0]!;
    const caseId = await repo.getDailyCase(today);

    if (!caseId) {
      return errorResponse(c, 'NOT_FOUND', `No daily case configured for ${today}`, 404);
    }

    const caseRow = await repo.getPublishedCase(caseId);
    if (!caseRow) {
      return errorResponse(c, 'NOT_FOUND', `Daily case '${caseId}' is not published`, 404);
    }

    return c.json(
      DailyCaseResponseSchema.parse({
        date: today,
        caseId: caseRow.id,
        case: caseRow.publicPayload,
      }),
      200,
    );
  });

  return router;
}
