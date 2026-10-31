import { describe, expect, it } from 'vitest';
import path from 'node:path';
import {
  publishCases,
  resolveCaseFiles,
  type PublishClient,
} from '../src/publish/publisher.js';
import type { CaseDefinition, CasePublic } from '@lastlie/case-engine';
import case0001 from '../../../packages/content/cases/authored/case_0001.json';

const case1Path = path.resolve(
  __dirname,
  '../../../packages/content/cases/authored/case_0001.json',
);

class MockPublishClient implements PublishClient {
  public cases = new Map<string, { id: string; version: number; publicPayload: CasePublic }>();
  public definitions = new Map<string, CaseDefinition>();

  async getCase(id: string) {
    return this.cases.get(id) ?? null;
  }

  async upsertCase(params: {
    caseRow: {
      id: string;
      version: number;
      kind: string;
      title: string;
      difficulty: number;
      mysteryType: string;
      estimatedMinutes: number;
      status: string;
      publicPayload: CasePublic;
      publishedAt: string;
    };
    definition: CaseDefinition;
  }) {
    this.cases.set(params.caseRow.id, {
      id: params.caseRow.id,
      version: params.caseRow.version,
      publicPayload: params.caseRow.publicPayload,
    });
    this.definitions.set(params.caseRow.id, params.definition);
  }
}

describe('Publish Command Suite (WP-42)', () => {
  it('resolves case files from path or glob pattern', () => {
    const resolved = resolveCaseFiles(case1Path);
    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved[0]).toContain('case_0001.json');
  });

  it('publishes valid case to mock client', async () => {
    const client = new MockPublishClient();

    const result = await publishCases({
      globPattern: case1Path,
      env: 'local',
      client,
    });

    expect(result.success).toBe(true);
    expect(result.publishedCount).toBe(1);
    expect(result.failedCount).toBe(0);

    const published = await client.getCase('case_0001');
    expect(published).toBeDefined();
    expect(published?.id).toBe('case_0001');
    expect(published?.version).toBe(case0001.version);
  });

  it('performs dry run without mutating database', async () => {
    const client = new MockPublishClient();

    const result = await publishCases({
      globPattern: case1Path,
      env: 'local',
      dryRun: true,
      client,
    });

    expect(result.success).toBe(true);
    expect(result.publishedCount).toBe(1);
    expect(result.details[0]?.status).toBe('dry_run');

    const published = await client.getCase('case_0001');
    expect(published).toBeNull();
  });

  it('bumps version on content change', async () => {
    const client = new MockPublishClient();

    // Initial publish at v1
    await publishCases({
      globPattern: case1Path,
      env: 'local',
      client,
    });

    // Simulate existing case with older version & modified payload
    const existing = await client.getCase('case_0001');
    if (existing) {
      existing.publicPayload = { ...existing.publicPayload, title: 'Old Title' };
    }

    // Re-publish -> should bump version
    const result = await publishCases({
      globPattern: case1Path,
      env: 'local',
      client,
    });

    expect(result.success).toBe(true);
    expect(result.details[0]?.version).toBe(2);

    const updated = await client.getCase('case_0001');
    expect(updated?.version).toBe(2);
  });

  it('refuses production publish without confirmation', async () => {
    const client = new MockPublishClient();

    await expect(
      publishCases({
        globPattern: case1Path,
        env: 'prod',
        confirmProd: false,
        client,
      }),
    ).rejects.toThrow(/confirmation/i);
  });
});
