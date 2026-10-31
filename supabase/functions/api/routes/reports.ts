import { Hono } from 'hono';
import {
  CaseReportRequestSchema,
  CaseReportResponseSchema,
} from '@lastlie/api-contract';
import type { AppContextVariables, Repository } from '../../_shared/types.js';
import { errorResponse } from '../../_shared/middleware.js';

export function createReportsRouter(deps: { repo: Repository }) {
  const { repo } = deps;
  const router = new Hono<{ Variables: AppContextVariables }>();

  // POST /cases/:id/report
  router.post('/:id/report', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return errorResponse(c, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    const caseId = c.req.param('id');
    const caseRow = await repo.getPublishedCase(caseId);
    if (!caseRow) {
      return errorResponse(c, 'CASE_NOT_FOUND', `Case '${caseId}' not found`, 404);
    }

    // Rate limit: 5 reports per user per day (86,400 seconds)
    const reportsInLast24h = await repo.getUserReportCountInWindow(userId, 86400);
    if (reportsInLast24h >= 5) {
      return errorResponse(
        c,
        'RATE_LIMITED',
        'Daily report limit reached (maximum 5 reports per day)',
        429,
      );
    }

    const rawBody = await c.req.json().catch(() => null);
    const parseResult = CaseReportRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return errorResponse(c, 'BAD_REQUEST', parseResult.error.message, 400);
    }

    const { reason, note } = parseResult.data;

    const { reportId, autoFlagged } = await repo.reportCase({
      caseId,
      userId,
      reason,
      ...(note ? { note } : {}),
    });

    if (autoFlagged) {
      console.warn(
        `[MODERATION] Case '${caseId}' was auto-flagged and changed to 'under_review' status due to 5+ distinct user reports in 7 days.`,
      );
    }

    return c.json(
      CaseReportResponseSchema.parse({
        success: true,
        reportId,
        caseId,
      }),
      200,
    );
  });

  return router;
}
