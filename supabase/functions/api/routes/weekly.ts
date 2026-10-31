import { Hono } from 'hono';
import {
  WeeklyAggregateResponseSchema,
  WeeklyCaseResponseSchema,
} from '@lastlie/api-contract';
import type { AppContextVariables, Clock, Repository } from '../../_shared/types.js';
import { errorResponse } from '../../_shared/middleware.js';

export function createWeeklyRouter(deps: { repo: Repository; clock: Clock }) {
  const router = new Hono<{ Variables: AppContextVariables }>();
  const { repo, clock } = deps;

  // GET /weekly
  router.get('/', async (c) => {
    const now = clock.now();
    const currentWeek = await repo.getCurrentWeeklyCase(now);
    if (!currentWeek) {
      return errorResponse(c, 'NOT_FOUND', 'No active weekly community case found', 404);
    }

    const isoNow = now.toISOString();
    const isOpen = currentWeek.opensAt <= isoNow && isoNow <= currentWeek.closesAt;

    const caseRow = await repo.getPublishedCase(currentWeek.caseId);
    if (!caseRow) {
      return errorResponse(c, 'NOT_FOUND', `Weekly case '${currentWeek.caseId}' not found`, 404);
    }

    return c.json(
      WeeklyCaseResponseSchema.parse({
        id: currentWeek.id,
        caseId: currentWeek.caseId,
        weekNumber: currentWeek.weekNumber,
        year: currentWeek.year,
        opensAt: currentWeek.opensAt,
        closesAt: currentWeek.closesAt,
        isOpen,
        case: caseRow.publicPayload,
      }),
      200,
    );
  });

  // GET /weekly/:id/aggregate
  // Server-enforced: Aggregate theory distribution is HIDDEN until the window closes!
  router.get('/:id/aggregate', async (c) => {
    const weeklyId = c.req.param('id');
    const week = await repo.getWeeklyCaseById(weeklyId);
    if (!week) {
      return errorResponse(c, 'NOT_FOUND', `Weekly case '${weeklyId}' not found`, 404);
    }

    const now = clock.now();
    const isoNow = now.toISOString();

    // Check if window is still open
    if (isoNow < week.closesAt) {
      return errorResponse(
        c,
        'WEEKLY_NOT_CLOSED',
        'Weekly community aggregate is hidden until the competitive window closes',
        403,
      );
    }

    const agg = await repo.getWeeklyAggregate(weeklyId);
    if (!agg) {
      return errorResponse(c, 'NOT_FOUND', `No aggregate data found for '${weeklyId}'`, 404);
    }

    return c.json(WeeklyAggregateResponseSchema.parse(agg), 200);
  });

  return router;
}
