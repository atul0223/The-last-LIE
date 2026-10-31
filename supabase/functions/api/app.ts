import { Hono } from 'hono';
import type {
  AppConfig,
  AppContextVariables,
  AuthVerifier,
  Clock,
  RateLimiter,
  Repository,
} from '../_shared/types.js';
import {
  authMiddleware,
  bodyLimitMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  requestIdMiddleware,
} from '../_shared/middleware.js';
import { createSessionsRouter } from './routes/sessions.js';
import { createDailyRouter } from './routes/daily.js';
import { createChallengesRouter } from './routes/challenges.js';

export interface AppDeps {
  repo: Repository;
  auth: AuthVerifier;
  clock: Clock;
  rateLimiter: RateLimiter;
  config: AppConfig;
}

export function createApp(deps: AppDeps) {
  const { repo, auth, clock, rateLimiter, config } = deps;
  const app = new Hono<{ Variables: AppContextVariables }>();

  // Global Middlewares
  app.use('*', requestIdMiddleware());
  app.use('*', corsMiddleware(config));
  app.use('*', bodyLimitMiddleware(config.maxBodySizeBytes));

  // Global Error Handler - never leak stack traces
  app.onError((err, c) => {
    const requestId = c.get('requestId') || 'unknown';
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: config.env === 'production' ? 'An unexpected internal error occurred' : err.message,
          requestId,
        },
      },
      500,
    );
  });

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok', timestamp: clock.now().toISOString() }));

  // Public routes (Rate Limiter)
  const publicGroup = new Hono<{ Variables: AppContextVariables }>();
  publicGroup.use('*', rateLimitMiddleware(rateLimiter, config.rateLimitPerMin));
  publicGroup.route('/daily', createDailyRouter({ repo, clock }));
  app.route('/', publicGroup);

  // Authenticated routes
  const sessionsRouter = createSessionsRouter({ repo, clock, config });
  const authGroup = new Hono<{ Variables: AppContextVariables }>();
  authGroup.use('*', authMiddleware(auth));
  authGroup.use('*', rateLimitMiddleware(rateLimiter, config.rateLimitPerMin));
  authGroup.route('/', sessionsRouter);

  app.route('/sessions', authGroup);

  // Challenges routes (hybrid: public get/guest + auth create/attach)
  const challengesRouter = createChallengesRouter({ repo, clock, config });
  const challengesGroup = new Hono<{ Variables: AppContextVariables }>();
  challengesGroup.use('*', authMiddleware(auth, { optional: true }));
  challengesGroup.use('*', rateLimitMiddleware(rateLimiter, config.rateLimitPerMin));
  challengesGroup.route('/', challengesRouter);

  app.route('/challenges', challengesGroup);

  // Not Found Handler
  app.notFound((c) => {
    const requestId = c.get('requestId') || 'unknown';
    return c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${c.req.method} ${c.req.path} not found`,
          requestId,
        },
      },
      404,
    );
  });

  return app;
}
