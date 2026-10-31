import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../functions/api/app.js';
import { InMemoryRepository } from '../functions/_shared/in_memory_repo.js';
import { MockAuthVerifier } from '../functions/_shared/auth.js';
import { MockClock } from '../functions/_shared/clock.js';
import { InMemoryRateLimiter } from '../functions/_shared/rate_limiter.js';
import { deepScanForLeaks } from '../functions/_shared/deep_scan.js';
import type { AppConfig } from '../functions/_shared/types.js';
import { toPublicCase, type CaseDefinition } from '@lastlie/case-engine';
import { publishConspiracyGraph } from '../../tools/cli/src/publish/publisher.js';
import case0001Raw from '../../packages/content/cases/authored/case_0001.json';
import path from 'node:path';

const case0001 = case0001Raw as unknown as CaseDefinition;

const defaultClueIds = [
  'clue_message_carrier',
  'clue_arjun_testimony',
  'clue_maya_testimony',
  'clue_rhea_testimony',
  'clue_marcus_log',
];

describe('WP-51s Conspiracy Graph Backend Suite', () => {
  let repo: InMemoryRepository;
  let auth: MockAuthVerifier;
  let clock: MockClock;
  let rateLimiter: InMemoryRateLimiter;
  let config: AppConfig;
  let app: ReturnType<typeof createApp>;

  const user = { userId: 'user_agent_51' };
  const otherUser = { userId: 'user_fresh_recruit' };

  beforeEach(async () => {
    repo = new InMemoryRepository();
    auth = new MockAuthVerifier([user, otherUser]);
    clock = new MockClock('2026-11-01T10:00:00Z');
    rateLimiter = new InMemoryRateLimiter();

    config = {
      env: 'test',
      corsOrigins: ['*'],
      rateLimitPerMin: 60,
      maxBodySizeBytes: 65536,
      guestHmacSecret: 'test_hmac_secret_key',
      minSubmitDurationSeconds: 15,
    };

    const publicCase = toPublicCase(case0001, defaultClueIds);
    await repo.upsertCase(
      {
        id: case0001.id,
        version: case0001.version,
        kind: case0001.kind,
        title: case0001.title,
        difficulty: case0001.difficulty,
        mysteryType: case0001.mysteryType,
        estimatedMinutes: case0001.estimatedMinutes,
        status: 'published',
        publicPayload: publicCase,
        publishedAt: '2026-11-01T00:00:00Z',
      },
      case0001,
    );

    app = createApp({
      repo,
      auth,
      clock,
      rateLimiter,
      config,
    });
  });

  it('rejects unauthenticated GET /graph with 401', async () => {
    const res = await app.request('/graph');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns empty graph for fresh user and never leaks unrevealed node names', async () => {
    const res = await app.request('/graph', {
      headers: {
        Authorization: 'Bearer user_agent_51',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      nodes: [],
      edges: [],
    });

    // Deep scan for forbidden keys
    const leaks = deepScanForLeaks(body);
    expect(leaks).toEqual([]);

    // Strict leak check: node names must not exist anywhere in response
    const rawJson = JSON.stringify(body);
    expect(rawJson).not.toContain('The Quiet');
    expect(rawJson).not.toContain('The Shadow Broker');
    expect(rawJson).not.toContain('Dr. Arjun Mehta');
    expect(rawJson).not.toContain('Central Vault');
    expect(rawJson).not.toContain('Ouroboros Seal');
  });

  it('grants graph reveals upon solving case and redacts 1-hop neighbours', async () => {
    // 1. Create a session for case_0001
    const createRes = await app.request('/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer user_agent_51',
      },
      body: JSON.stringify({
        caseId: 'case_0001',
        mode: 'normal',
      }),
    });
    expect(createRes.status).toBe(201);
    const sessionData = await createRes.json();
    const sessionId = sessionData.session.id;

    // Advance clock past minimum duration (20s)
    clock.advance(20000);

    // 2. Submit correct hypothesis for case_0001
    const submitRes = await app.request(`/sessions/${sessionId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer user_agent_51',
      },
      body: JSON.stringify({
        hypothesisId: case0001.truth.solutionHypothesisId,
        supportingClueIds: ['clue_message_carrier', 'clue_arjun_testimony'],
        contradictions: [],
      }),
    });
    expect(submitRes.status).toBe(200);
    const submitBody = await submitRes.json();
    expect(submitBody.result.breakdown.correctHypothesis).toBe(true);

    // 3. GET /graph for the user who solved case_0001
    const graphRes = await app.request('/graph', {
      headers: {
        Authorization: 'Bearer user_agent_51',
      },
    });
    expect(graphRes.status).toBe(200);
    const graphData = await graphRes.json();

    // Check revealed edges
    expect(graphData.edges.length).toBe(2);
    const edgeIds = graphData.edges.map((e: { id: string }) => e.id).sort();
    expect(edgeIds).toEqual(['cedge_arjun_vault', 'cedge_quiet_vault']);

    // Check nodes: 3 fully revealed + 1 unrevealed 1-hop neighbour
    expect(graphData.nodes.length).toBe(4);

    const revealedNodes = graphData.nodes.filter((n: { revealed: boolean }) => n.revealed);
    expect(revealedNodes.length).toBe(3);

    const revealedIds = revealedNodes.map((n: { id: string }) => n.id).sort();
    expect(revealedIds).toEqual(['cnode_central_vault', 'cnode_dr_arjun', 'cnode_the_quiet']);

    for (const node of revealedNodes) {
      expect(typeof node.name).toBe('string');
      expect(node.name.length).toBeGreaterThan(0);
      expect(node.revealed).toBe(true);
    }

    // Check 1-hop unrevealed neighbour
    const unrevealedNeighbours = graphData.nodes.filter((n: { revealed: boolean }) => !n.revealed);
    expect(unrevealedNeighbours.length).toBe(1);
    const neighbour = unrevealedNeighbours[0];
    expect(neighbour.id).toBe('cnode_shadow_broker');
    expect(neighbour.kind).toBe('character');
    expect(neighbour.name).toBeNull();
    expect(neighbour.description).toBeNull();
    expect(neighbour.revealed).toBe(false);

    // 2-hop node (Ouroboros Seal) is NOT present
    const sealNode = graphData.nodes.find((n: { id: string }) => n.id === 'cnode_ouroboros_seal');
    expect(sealNode).toBeUndefined();

    // Leak scans: ensure "The Shadow Broker" and "Ouroboros Seal" never leak in response text
    const rawJson = JSON.stringify(graphData);
    expect(rawJson).not.toContain('The Shadow Broker');
    expect(rawJson).not.toContain('Ouroboros Seal');

    // Forbidden keys scan
    const leaks = deepScanForLeaks(graphData);
    expect(leaks).toEqual([]);
  });

  it('keeps other users isolated without reveals', async () => {
    // Other user still has empty graph
    const res = await app.request('/graph', {
      headers: {
        Authorization: 'Bearer user_fresh_recruit',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      nodes: [],
      edges: [],
    });
  });

  it('cascades reveals when subsequent cases are solved', async () => {
    // User solves case_0001
    await repo.grantGraphReveals(user.userId, 'case_0001');

    // Then user solves case_0002 (which reveals cedge_vault_broker)
    await repo.grantGraphReveals(user.userId, 'case_0002');

    const graphRes = await app.request('/graph', {
      headers: {
        Authorization: 'Bearer user_agent_51',
      },
    });

    const graphData = await graphRes.json();
    expect(graphData.edges.length).toBe(3);

    // cnode_shadow_broker is now fully revealed
    const brokerNode = graphData.nodes.find((n: { id: string }) => n.id === 'cnode_shadow_broker');
    expect(brokerNode).toBeDefined();
    expect(brokerNode.revealed).toBe(true);
    expect(brokerNode.name).toBe('The Shadow Broker');

    // And cnode_ouroboros_seal is now the adjacent 1-hop neighbour with name: null
    const sealNode = graphData.nodes.find((n: { id: string }) => n.id === 'cnode_ouroboros_seal');
    expect(sealNode).toBeDefined();
    expect(sealNode.revealed).toBe(false);
    expect(sealNode.name).toBeNull();
    expect(sealNode.description).toBeNull();
  });

  it('CLI publisher validates conspiracy graph and catches dangling edges', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-pub-test-'));

    const nodesFile = path.join(tmpDir, 'nodes.json');
    const edgesFile = path.join(tmpDir, 'edges.json');

    fs.writeFileSync(
      nodesFile,
      JSON.stringify([
        { id: 'node_alpha', kind: 'organization', name: 'Alpha Org' },
        { id: 'node_beta', kind: 'location', name: 'Beta Site' },
      ]),
    );

    // Valid edges
    fs.writeFileSync(
      edgesFile,
      JSON.stringify([
        { id: 'edge_1', from: 'node_alpha', to: 'node_beta', rel: 'links_to' },
      ]),
    );

    const validRes = await publishConspiracyGraph({
      nodesPath: nodesFile,
      edgesPath: edgesFile,
      env: 'local',
      dryRun: true,
    });

    expect(validRes.success).toBe(true);
    expect(validRes.nodesCount).toBe(2);
    expect(validRes.edgesCount).toBe(1);

    // Dangling edge to non-existent node
    fs.writeFileSync(
      edgesFile,
      JSON.stringify([
        { id: 'edge_broken', from: 'node_alpha', to: 'node_nonexistent', rel: 'links_to' },
      ]),
    );

    const brokenRes = await publishConspiracyGraph({
      nodesPath: nodesFile,
      edgesPath: edgesFile,
      env: 'local',
      dryRun: true,
    });

    expect(brokenRes.success).toBe(false);
    expect(brokenRes.errors?.length).toBeGreaterThan(0);
    expect(brokenRes.errors?.[0]).toContain('nonexistent');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
