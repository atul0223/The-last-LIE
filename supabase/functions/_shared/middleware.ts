import type { Context, MiddlewareHandler } from 'hono';
import type { AppConfig, AppContextVariables, AuthVerifier, RateLimiter } from './types.js';

export function requestIdMiddleware(): MiddlewareHandler<{ Variables: AppContextVariables }> {
  return async (c, next) => {
    const existing = c.req.header('x-request-id');
    const requestId = existing && existing.length > 0 ? existing : `req_${Math.random().toString(36).substring(2, 11)}`;
    c.set('requestId', requestId);
    c.header('x-request-id', requestId);
    await next();
  };
}

export function corsMiddleware(config: AppConfig): MiddlewareHandler<{ Variables: AppContextVariables }> {
  return async (c, next) => {
    const origin = c.req.header('origin');
    const isAllowed =
      !origin ||
      config.corsOrigins.includes('*') ||
      config.corsOrigins.includes(origin);

    if (isAllowed && origin) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-request-id');
      c.header('Access-Control-Max-Age', '86400');
    }

    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204);
    }

    await next();
  };
}

export function bodyLimitMiddleware(maxBytes = 65536): MiddlewareHandler<{ Variables: AppContextVariables }> {
  return async (c, next) => {
    const lengthHeader = c.req.header('content-length');
    if (lengthHeader) {
      const length = parseInt(lengthHeader, 10);
      if (length > maxBytes) {
        const requestId = c.get('requestId');
        return c.json(
          {
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: `Request payload exceeds maximum allowed size of ${maxBytes} bytes`,
              requestId,
            },
          },
          413,
        );
      }
    }
    await next();
  };
}

export function authMiddleware(
  verifier: AuthVerifier,
  opts?: { optional?: boolean },
): MiddlewareHandler<{ Variables: AppContextVariables }> {
  return async (c, next) => {
    const authHeader = c.req.header('authorization');
    const requestId = c.get('requestId');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (opts?.optional) {
        await next();
        return;
      }
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or malformed Authorization header with Bearer token',
            requestId,
          },
        },
        401,
      );
    }

    const token = authHeader.substring(7).trim();
    const user = await verifier.verify(token);

    if (!user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired authentication token',
            requestId,
          },
        },
        401,
      );
    }

    c.set('userId', user.userId);
    c.set('user', user);
    await next();
  };
}

export function rateLimitMiddleware(
  limiter: RateLimiter,
  limitPerMinute = 60,
): MiddlewareHandler<{ Variables: AppContextVariables }> {
  return async (c, next) => {
    const userId = c.get('userId');
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip') ?? 'unknown_ip';
    const key = userId ? `user:${userId}` : `ip:${ip}`;

    const res = await limiter.check(key, limitPerMinute, 60_000);
    c.header('X-RateLimit-Limit', limitPerMinute.toString());
    c.header('X-RateLimit-Remaining', res.remaining.toString());
    c.header('X-RateLimit-Reset', Math.ceil(res.resetAt / 1000).toString());

    if (!res.allowed) {
      const retryAfter = Math.max(1, Math.ceil((res.resetAt - Date.now()) / 1000));
      c.header('Retry-After', retryAfter.toString());
      const requestId = c.get('requestId');
      return c.json(
        {
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests. Please slow down.',
            requestId,
          },
        },
        429,
      );
    }

    await next();
  };
}

export function errorResponse(c: Context<{ Variables: AppContextVariables }>, code: string, message: string, status: number = 400) {
  const requestId = c.get('requestId');
  return c.json(
    {
      error: {
        code,
        message,
        requestId,
      },
    },
    status as any,
  );
}
