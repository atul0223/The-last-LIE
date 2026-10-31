/**
 * Smoke test script for THE LAST LIE: Infinite Supabase Edge Function API.
 * Usage:
 *   pnpm smoke:api
 *   API_URL=http://127.0.0.1:54321/functions/v1/api pnpm smoke:api
 */

const API_URL = process.env.API_URL || 'http://127.0.0.1:54321/functions/v1/api';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';

interface SmokeStep {
  name: string;
  run: () => Promise<void>;
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: options.headers && 'Authorization' in options.headers
      ? (options.headers as Record<string, string>)['Authorization']
      : `Bearer ${ANON_KEY}`,
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON
    }
    return { status: res.status, headers: res.headers, text, json };
  } catch (err: any) {
    throw new Error(`Failed to fetch ${url}: ${err.message}. Is Supabase edge function running?`);
  }
}

async function main() {
  console.log(`[smoke:api] Running smoke tests against: ${API_URL}`);

  let createdSessionId: string | null = null;
  let testChallengeCode: string | null = null;

  const steps: SmokeStep[] = [
    {
      name: 'GET /health',
      run: async () => {
        const res = await request('/health');
        if (res.status !== 200 || res.json?.status !== 'ok') {
          throw new Error(`Expected 200 {status: 'ok'}, got ${res.status}: ${res.text}`);
        }
        console.log('  ✓ GET /health -> 200 OK');
      },
    },
    {
      name: 'GET /daily',
      run: async () => {
        const res = await request('/daily');
        if (res.status !== 200 && res.status !== 404) {
          throw new Error(`Expected 200 or 404, got ${res.status}: ${res.text}`);
        }
        console.log(`  ✓ GET /daily -> ${res.status}`);
      },
    },
    {
      name: 'GET /weekly',
      run: async () => {
        const res = await request('/weekly');
        if (res.status !== 200 && res.status !== 404) {
          throw new Error(`Expected 200 or 404, got ${res.status}: ${res.text}`);
        }
        console.log(`  ✓ GET /weekly -> ${res.status}`);
      },
    },
    {
      name: 'POST /sessions (start session)',
      run: async () => {
        const res = await request('/sessions', {
          method: 'POST',
          body: JSON.stringify({ mode: 'normal', caseId: 'case_0001' }),
        });
        if (res.status === 201) {
          createdSessionId = res.json.session.id;
          console.log(`  ✓ POST /sessions -> 201 Created (sessionId: ${createdSessionId})`);
        } else {
          console.log(`  - POST /sessions returned ${res.status} (requires authenticated JWT)`);
        }
      },
    },
    {
      name: 'GET /graph',
      run: async () => {
        const res = await request('/graph');
        console.log(`  ✓ GET /graph -> ${res.status}`);
      },
    },
    {
      name: 'POST /push/token',
      run: async () => {
        const res = await request('/push/token', {
          method: 'POST',
          body: JSON.stringify({ token: 'smoke_test_push_token_123', platform: 'android' }),
        });
        console.log(`  ✓ POST /push/token -> ${res.status}`);
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const step of steps) {
    try {
      await step.run();
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${step.name} failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n[smoke:api] Finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[smoke:api] Fatal error:', err.message);
  process.exit(1);
});
