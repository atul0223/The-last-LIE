import { describe, it, expect } from 'vitest';
import { CANONICAL_CASES } from '../src/index.js';
import {
  ConspiracyNodeSchema,
  ConspiracyEdgeSchema,
  ConspiracyGraphSchema,
  validateConspiracyGraph,
  loadConspiracyGraph,
  type ConspiracyGraph,
} from '../src/conspiracy/index.js';

describe('WP-53a: Conspiracy Content Model', () => {
  const sampleNodes = [
    {
      id: 'cnode_the_quiet',
      kind: 'organization' as const,
      name: 'The Quiet',
      publicSummary: 'A clandestine syndicate operating in the shadows of Vesper City.',
    },
    {
      id: 'cnode_victor_kessler',
      kind: 'character' as const,
      name: 'Victor Kessler',
      publicSummary: 'Senior freight director suspected of Quiet ties.',
    },
    {
      id: 'cnode_central_station',
      kind: 'location' as const,
      name: 'Vesper Central Station',
      publicSummary: 'Hub of logistics and covert transmissions.',
    },
    {
      id: 'cnode_astrum_cipher',
      kind: 'symbol' as const,
      name: 'Astrum Cipher',
      publicSummary: 'An occult cipher stamp found on sensitive dispatches.',
    },
  ];

  const sampleEdges = [
    {
      id: 'cedge_kessler_quiet',
      from: 'cnode_victor_kessler',
      to: 'cnode_the_quiet',
      rel: 'operates_for',
      revealedBy: {
        caseId: 'case_0001',
        clueId: 'clue_carrier_log',
      },
      teaser: 'Financial records suggest covert ties.',
    },
    {
      id: 'cedge_quiet_station',
      from: 'cnode_the_quiet',
      to: 'cnode_central_station',
      rel: 'infiltrated',
      revealedBy: {
        caseId: 'case_0001',
        clueId: 'clue_device_log',
      },
    },
  ];

  it('validates ConspiracyNode and ConspiracyEdge schemas', () => {
    const node = sampleNodes[0]!;
    expect(ConspiracyNodeSchema.parse(node)).toEqual(node);

    const edge = sampleEdges[0]!;
    expect(ConspiracyEdgeSchema.parse(edge)).toEqual(edge);

    // Invalid node kind
    expect(() =>
      ConspiracyNodeSchema.parse({
        id: 'cnode_invalid',
        kind: 'weapon',
        name: 'Invalid',
        publicSummary: 'Summary',
      }),
    ).toThrow();

    // Missing revealedBy clueId
    expect(() =>
      ConspiracyEdgeSchema.parse({
        id: 'cedge_bad',
        from: 'a',
        to: 'b',
        rel: 'rel',
        revealedBy: { caseId: 'c1' },
      }),
    ).toThrow();

    const graphParsed = ConspiracyGraphSchema.parse({
      nodes: sampleNodes,
      edges: sampleEdges,
    });
    expect(graphParsed.nodes).toHaveLength(4);
    expect(graphParsed.edges).toHaveLength(2);
  });

  it('loads graph via loadConspiracyGraph', () => {
    const graph = loadConspiracyGraph(sampleNodes, sampleEdges);
    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toHaveLength(2);

    // Default loader loads empty or default stubs
    const defaultGraph = loadConspiracyGraph();
    expect(defaultGraph).toHaveProperty('nodes');
    expect(defaultGraph).toHaveProperty('edges');
  });

  it('validates clean graph with case references', () => {
    const graph: ConspiracyGraph = {
      nodes: sampleNodes,
      edges: sampleEdges,
    };

    const mockCases = [
      {
        id: 'case_0001',
        clues: [{ id: 'clue_carrier_log' }, { id: 'clue_device_log' }],
      },
    ];

    const result = validateConspiracyGraph(graph, mockCases);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('detects duplicate node and edge IDs', () => {
    const graph: ConspiracyGraph = {
      nodes: [sampleNodes[0]!, sampleNodes[0]!],
      edges: [sampleEdges[0]!, sampleEdges[0]!],
    };

    const result = validateConspiracyGraph(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate node id'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Duplicate edge id'))).toBe(true);
  });

  it('detects missing from or to node references', () => {
    const graph: ConspiracyGraph = {
      nodes: [sampleNodes[0]!],
      edges: [
        {
          id: 'cedge_missing_ref',
          from: 'cnode_the_quiet',
          to: 'cnode_nonexistent',
          rel: 'links_to',
          revealedBy: { caseId: 'case_0001', clueId: 'clue_1' },
        },
      ],
    };

    const result = validateConspiracyGraph(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('nonexistent to-node'))).toBe(true);
  });

  it('detects missing case or clue in revealedBy', () => {
    const graph: ConspiracyGraph = {
      nodes: sampleNodes,
      edges: sampleEdges,
    };

    const mockCases = [
      {
        id: 'case_0001',
        clues: [{ id: 'clue_carrier_log' }], // missing clue_device_log
      },
    ];

    const result = validateConspiracyGraph(graph, mockCases);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('clue_device_log'))).toBe(true);
  });

  it('allows cyclic relationships in conspiracy network', () => {
    // A -> B -> A is valid in a conspiracy web
    const cyclicEdges = [
      {
        id: 'cedge_1',
        from: 'cnode_the_quiet',
        to: 'cnode_central_station',
        rel: 'controls',
        revealedBy: { caseId: 'case_0001', clueId: 'clue_1' },
      },
      {
        id: 'cedge_2',
        from: 'cnode_central_station',
        to: 'cnode_the_quiet',
        rel: 'harbors',
        revealedBy: { caseId: 'case_0001', clueId: 'clue_2' },
      },
    ];

    const result = validateConspiracyGraph({
      nodes: [sampleNodes[0]!, sampleNodes[2]!],
      edges: cyclicEdges,
    });
    expect(result.valid).toBe(true);
  });

  describe('WP-53: Canonical Chapter 1 Graph Integration', () => {
    it('packaged conspiracy graph contains 15-25 nodes and valid edges', () => {
      const graph = loadConspiracyGraph();
      expect(graph.nodes.length).toBeGreaterThanOrEqual(15);
      expect(graph.nodes.length).toBeLessThanOrEqual(25);
      expect(graph.edges.length).toBeGreaterThanOrEqual(10);
    });

    it('packaged conspiracy graph passes validation against CANONICAL_CASES', () => {
      const graph = loadConspiracyGraph();
      const result = validateConspiracyGraph(graph, CANONICAL_CASES);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('CANONICAL_CASES all have kind canonical and difficulty in range 2-3', () => {
      expect(CANONICAL_CASES).toHaveLength(3);
      for (const c of CANONICAL_CASES) {
        expect(c.kind).toBe('canonical');
        expect(c.difficulty).toBeGreaterThanOrEqual(2);
        expect(c.difficulty).toBeLessThanOrEqual(3);
      }
    });
  });

});
