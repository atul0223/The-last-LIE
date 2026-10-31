// Deno-specific entry point for Supabase Edge Functions.
// This is the ONLY file with Deno-specific references.

import { createApp } from './app.js';
import { PostgresRepository } from '../_shared/postgres_repo.js';
import { SupabaseAuthVerifier } from '../_shared/auth.js';
import { SystemClock } from '../_shared/clock.js';
import { InMemoryRateLimiter } from '../_shared/rate_limiter.js';
import type { AppConfig } from '../_shared/types.js';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const corsOrigins = (Deno.env.get('CORS_ORIGINS') || '*').split(',').map((s) => s.trim());
const guestHmacSecret = Deno.env.get('GUEST_HMAC_SECRET') || 'dev_guest_secret_key';

const config: AppConfig = {
  env: (Deno.env.get('NODE_ENV') as any) || 'development',
  corsOrigins,
  rateLimitPerMin: 60,
  maxBodySizeBytes: 65536,
  guestHmacSecret,
  minSubmitDurationSeconds: 15,
};

const repo = new PostgresRepository(supabaseUrl, serviceRoleKey);
const auth = new SupabaseAuthVerifier(supabaseUrl, anonKey);
const clock = new SystemClock();
const rateLimiter = new InMemoryRateLimiter();

const app = createApp({
  repo,
  auth,
  clock,
  rateLimiter,
  config,
});

Deno.serve((req: Request) => app.fetch(req));
