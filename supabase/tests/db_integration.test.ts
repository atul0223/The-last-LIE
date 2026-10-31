import { describe, it, expect, beforeAll } from 'vitest';
import { PostgresRepository } from '../functions/_shared/postgres_repo.js';
import { createClient } from '@supabase/supabase-js';

const isPostgresMode = process.env.API_TEST_DB === 'postgres';

describe('WP-60 PostgresRepository DB Integration Suite', () => {
  if (!isPostgresMode) {
    it('skips live PostgreSQL tests when API_TEST_DB is not set to "postgres"', () => {
      console.log('API_TEST_DB != postgres; skipping live database tests.');
      expect(true).toBe(true);
    });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  let repo: PostgresRepository;

  beforeAll(() => {
    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required when API_TEST_DB=postgres');
    }
    const client = createClient(supabaseUrl, serviceRoleKey);
    repo = new PostgresRepository(client);
  });

  it('can list published cases from PostgreSQL', async () => {
    const cases = await repo.listPublishedCases();
    expect(Array.isArray(cases)).toBe(true);
  });

  it('queries daily cases from PostgreSQL', async () => {
    const today = new Date().toISOString().split('T')[0];
    const daily = await repo.getDailyCase(today);
    expect(daily === null || typeof daily === 'string').toBe(true);
  });

  it('handles player graph reveals querying with 0 leaks', async () => {
    const dummyUserId = '00000000-0000-0000-0000-000000000000';
    const graph = await repo.getPlayerGraphReveals(dummyUserId);
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });
});
