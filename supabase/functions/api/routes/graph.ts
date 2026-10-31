import { Hono } from 'hono';
import { GraphResponseSchema } from '@lastlie/api-contract';
import type { AppContextVariables, Repository } from '../../_shared/types.js';
import { errorResponse } from '../../_shared/middleware.js';

export function createGraphRouter(deps: { repo: Repository }) {
  const { repo } = deps;
  const router = new Hono<{ Variables: AppContextVariables }>();

  // GET /graph - returns player's revealed nodes and edges, plus 1-hop unrevealed neighbours
  router.get('/', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return errorResponse(c, 'UNAUTHORIZED', 'Authentication required', 401);
    }

    const graphData = await repo.getPlayerGraphReveals(userId);
    const validated = GraphResponseSchema.parse(graphData);
    return c.json(validated, 200);
  });

  return router;
}
