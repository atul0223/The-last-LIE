import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';
import {
  computeForceLayout,
  clearLayoutCache,
} from '../src/features/progress/map/layout';
import { useConspiracyMap } from '../src/features/progress/map/useConspiracyMap';
import { ConspiracyMapFeature } from '../src/features/progress/map';
import { NodeDossierSheet } from '../src/features/progress/map/NodeDossierSheet';
import { ConspiracyListView } from '../src/features/progress/map/ConspiracyListView';
import type { MapNode } from '../src/features/progress/map/types';

const FORBIDDEN_LEAK_KEYS = new Set([
  'truth',
  'claims',
  'culpritIds',
  'seed',
  'keyEvidence',
  'liars',
  'solutionHypothesisId',
]);

function deepScan(value: unknown, path = 'root'): void {
  if (value === null || value === undefined) return;
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => deepScan(item, `${path}[${idx}]`));
    } else {
      const record = value as Record<string, unknown>;
      for (const [key, val] of Object.entries(record)) {
        if (FORBIDDEN_LEAK_KEYS.has(key)) {
          throw new Error(`Security leak detected: key '${key}' found at path '${path}.${key}'`);
        }
        deepScan(val, `${path}.${key}`);
      }
    }
  }
}

describe('WP-52: Conspiracy Map UI & Force Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLayoutCache();
  });

  describe('Force Layout Performance & Caching', () => {
    it('computes 50+ nodes in under 50ms and caches subsequent calls', () => {
      // Generate synthetic graph with 55 nodes and 70 edges
      const nodes = Array.from({ length: 55 }, (_, i) => ({ id: `node_${i}` }));
      const edges = Array.from({ length: 70 }, (_, i) => ({
        from: `node_${i % 55}`,
        to: `node_${(i * 3 + 1) % 55}`,
      }));

      const start = performance.now();
      const positions = computeForceLayout(nodes, edges, {
        width: 1000,
        height: 800,
        iterations: 60,
        padding: 50,
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
      expect(Object.keys(positions)).toHaveLength(55);

      // Verify bounds
      for (const pos of Object.values(positions)) {
        expect(pos.x).toBeGreaterThanOrEqual(50);
        expect(pos.x).toBeLessThanOrEqual(950);
        expect(pos.y).toBeGreaterThanOrEqual(50);
        expect(pos.y).toBeLessThanOrEqual(750);
      }

      // Second call should hit the cache immediately (< 5ms)
      const cachedStart = performance.now();
      const cachedPositions = computeForceLayout(nodes, edges, {
        width: 1000,
        height: 800,
        iterations: 60,
        padding: 50,
      });
      const cachedDuration = performance.now() - cachedStart;

      expect(cachedDuration).toBeLessThan(5);
      expect(cachedPositions).toBe(positions); // exact reference from cache
    });

    it('handles single node and empty graphs gracefully', () => {
      const empty = computeForceLayout([], [], { width: 1000, height: 800 });
      expect(empty).toEqual({});

      const single = computeForceLayout([{ id: 'single_node' }], [], {
        width: 1000,
        height: 800,
      });
      expect(single.single_node).toEqual({ x: 500, y: 400 });
    });
  });

  describe('Conspiracy Subgraph & Anti-Leak Redaction', () => {
    it('reveals baseline teaser edge when no canonical cases are solved', () => {
      let resultHook: ReturnType<typeof useConspiracyMap>;
      function TestHookWrapper() {
        resultHook = useConspiracyMap({ solvedCaseIdsOverride: [] });
        return null;
      }

      renderer.create(<TestHookWrapper />);

      const { graph } = resultHook!;
      expect(graph.revealedNodeCount).toBeGreaterThan(0);
      expect(graph.revealedEdgeCount).toBeGreaterThan(0);
      expect(graph.unknownLeadCount).toBeGreaterThan(0);

      // Verify baseline reveals contain The Quiet and Victor Kessler
      const quietNode = graph.nodes.find((n) => n.id === 'cnode_the_quiet');
      expect(quietNode).toBeDefined();
      expect(quietNode?.isRevealed).toBe(true);
      expect(quietNode?.name).toBe('The Quiet');
    });

    it('strictly anonymizes unrevealed neighbor nodes with "?" and zero name leaks', () => {
      let resultHook: ReturnType<typeof useConspiracyMap>;
      function TestHookWrapper() {
        resultHook = useConspiracyMap({ solvedCaseIdsOverride: [] });
        return null;
      }

      renderer.create(<TestHookWrapper />);

      const { graph } = resultHook!;
      const unknownNodes = graph.nodes.filter((n) => !n.isRevealed);
      expect(unknownNodes.length).toBeGreaterThan(0);

      for (const unknown of unknownNodes) {
        expect(unknown.name).toBe('?');
        expect(unknown.isRevealed).toBe(false);
        expect(unknown.kind).toBe('unknown');
        expect(unknown.publicSummary).toContain('Classified syndicate lead');

        // Security check: ensure real character names are not leaked in unrevealed nodes
        expect(unknown.name).not.toBe('Julian Croft');
        expect(unknown.name).not.toBe('Central Rail Vault');
        expect(unknown.name).not.toBe('Lydia Cross');
      }

      // DeepScan entire graph
      expect(() => deepScan(graph)).not.toThrow();
    });

    it('reveals additional corridors when player solves canonical chapter case_c101', () => {
      let hookEmpty: ReturnType<typeof useConspiracyMap>;
      let hookSolved: ReturnType<typeof useConspiracyMap>;

      function TestCompare() {
        hookEmpty = useConspiracyMap({ solvedCaseIdsOverride: [] });
        hookSolved = useConspiracyMap({ solvedCaseIdsOverride: ['case_c101'] });
        return null;
      }

      renderer.create(<TestCompare />);

      expect(hookSolved!.graph.revealedEdgeCount).toBeGreaterThan(
        hookEmpty!.graph.revealedEdgeCount,
      );
      expect(hookSolved!.graph.revealedNodeCount).toBeGreaterThan(
        hookEmpty!.graph.revealedNodeCount,
      );

      // Central station is revealed by case_c101
      const station = hookSolved!.graph.nodes.find(
        (n) => n.id === 'cnode_central_station',
      );
      expect(station?.isRevealed).toBe(true);
      expect(station?.name).toBe('Vesper Central Station');
    });
  });

  describe('ConspiracyMapFeature Component', () => {
    it('renders header, stats, and canvas view by default', () => {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(<ConspiracyMapFeature />);
      });

      const jsonStr = JSON.stringify(tree!.toJSON());
      expect(jsonStr).toContain('THE QUIET // SYNDICATE MAP');
      expect(jsonStr).toContain('REVEALED INTEL');
      expect(jsonStr).toContain('UNKNOWN LEADS (?)');
      expect(jsonStr).toContain('CONFIRMED LINKS');
      expect(jsonStr).toContain('LIST VIEW');

      // Zoom controls present
      const zoomInBtn = tree!.root.findByProps({ testID: 'conspiracy.zoom.in' });
      expect(zoomInBtn).toBeDefined();
    });

    it('toggles view mode to accessible list view', () => {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(<ConspiracyMapFeature />);
      });

      const toggleBtn = tree!.root.findByProps({ testID: 'conspiracy.toggle.view' });

      // Switch to list view
      act(() => {
        toggleBtn.props.onPress();
      });

      const listContainer = tree!.root.findByProps({
        testID: 'conspiracy.list.container',
      });
      expect(listContainer).toBeDefined();

      const jsonStr = JSON.stringify(tree!.toJSON());
      expect(jsonStr).toContain('ORGANIZATIONS & SHELL ENTITIES');
      expect(jsonStr).toContain('UNKNOWN NETWORK LEADS');
    });

    it('zoom controls adjust scale and resetView resets to 100%', () => {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(<ConspiracyMapFeature />);
      });

      const zoomInBtn = tree!.root.findByProps({ testID: 'conspiracy.zoom.in' });
      const zoomResetBtn = tree!.root.findByProps({ testID: 'conspiracy.zoom.reset' });

      act(() => {
        zoomInBtn.props.onPress();
      });

      let jsonStr = JSON.stringify(tree!.toJSON());
      expect(jsonStr).toContain('125%');

      act(() => {
        zoomResetBtn.props.onPress();
      });

      jsonStr = JSON.stringify(tree!.toJSON());
      expect(jsonStr).toContain('100%');
    });

    it('opens dossier sheet when a revealed node is tapped, and closes on exit', () => {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(<ConspiracyMapFeature />);
      });

      // Find revealed node Victor Kessler
      const kesslerNode = tree!.root.findByProps({
        testID: 'conspiracy.node.cnode_victor_kessler',
      });

      act(() => {
        kesslerNode.props.onPress();
      });

      const sheet = tree!.root.findByProps({ testID: 'conspiracy.dossier.sheet' });
      expect(sheet).toBeDefined();

      const title = tree!.root.findByProps({ testID: 'conspiracy.dossier.name' });
      expect(title.props.children).toBe('Victor Kessler');

      // Close dossier
      const closeBtn = tree!.root.findByProps({ testID: 'conspiracy.dossier.close' });
      act(() => {
        closeBtn.props.onPress();
      });

      const remainingSheets = tree!.root.findAllByProps({ testID: 'conspiracy.dossier.sheet' });
      expect(remainingSheets).toHaveLength(0);
    });

    it('displays encrypted warning when an unrevealed lead node is inspected', () => {
      const mockLeadNode: MapNode = {
        id: 'cnode_secret_vault',
        kind: 'unknown',
        name: '?',
        publicSummary: 'Classified syndicate lead.',
        isRevealed: false,
        x: 100,
        y: 100,
        connectedEdgeIds: ['lead_edge_1'],
        directLeadsCount: 0,
      };

      const onClose = vi.fn();
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <NodeDossierSheet
            node={mockLeadNode}
            allEdges={[]}
            allNodes={[mockLeadNode]}
            onClose={onClose}
          />,
        );
      });

      const classifiedTag = tree!.root.findByProps({
        testID: 'conspiracy.dossier.classified',
      });
      expect(classifiedTag).toBeDefined();

      const name = tree!.root.findByProps({ testID: 'conspiracy.dossier.name' });
      expect(name.props.children).toBe('UNIDENTIFIED NETWORK LEAD');
    });

    it('passes deepScan security check on full rendered feature', () => {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(<ConspiracyMapFeature />);
      });

      expect(() => deepScan(tree!.toJSON())).not.toThrow();
    });
  });

  describe('ConspiracyListView Component', () => {
    it('renders all node categories and fires onSelectNode', () => {
      const mockNodes: MapNode[] = [
        {
          id: 'org_1',
          kind: 'organization',
          name: 'Shadow Transit',
          publicSummary: 'Rail front.',
          isRevealed: true,
          x: 0,
          y: 0,
          connectedEdgeIds: [],
          directLeadsCount: 2,
        },
        {
          id: 'char_1',
          kind: 'character',
          name: 'The Courier',
          publicSummary: 'Dispatch runner.',
          isRevealed: true,
          x: 0,
          y: 0,
          connectedEdgeIds: [],
          directLeadsCount: 0,
        },
        {
          id: 'lead_1',
          kind: 'unknown',
          name: '?',
          publicSummary: 'Encrypted lead.',
          isRevealed: false,
          x: 0,
          y: 0,
          connectedEdgeIds: [],
          directLeadsCount: 0,
        },
      ];

      const onSelect = vi.fn();
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <ConspiracyListView nodes={mockNodes} onSelectNode={onSelect} />,
        );
      });

      const nodeButton = tree!.root.findByProps({
        testID: 'conspiracy.list.node.org_1',
      });
      act(() => {
        nodeButton.props.onPress();
      });

      expect(onSelect).toHaveBeenCalledWith(mockNodes[0]);
    });
  });
});
