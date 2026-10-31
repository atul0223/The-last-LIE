import { useMemo, useState, useCallback } from 'react';
import { loadConspiracyGraph } from '@lastlie/content';
import { useSessionStore } from '../../../store';
import { computeForceLayout } from './layout';
import type { MapNode, MapEdge, MapGraph, ConspiracyNodeKind } from './types';

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 800;

export interface UseConspiracyMapOptions {
  solvedCaseIdsOverride?: string[];
  revealedEdgeIdsOverride?: string[];
}

export interface UseConspiracyMapReturn {
  graph: MapGraph;
  selectedNode: MapNode | null;
  selectNode: (node: MapNode) => void;
  clearSelectedNode: () => void;
  viewMode: 'canvas' | 'list';
  toggleViewMode: () => void;
  zoom: number;
  pan: { x: number; y: number };
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

export function useConspiracyMap(options?: UseConspiracyMapOptions): UseConspiracyMapReturn {
  const sessions = useSessionStore((state) => state.sessions);
  const results = useSessionStore((state) => state.results);

  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. Determine active solved case IDs
  const activeSolvedCaseIds = useMemo(() => {
    if (options?.solvedCaseIdsOverride) {
      return new Set(options.solvedCaseIdsOverride);
    }
    const set = new Set<string>();
    for (const session of Object.values(sessions)) {
      if (session.status === 'submitted' || results[session.id]) {
        set.add(session.caseId);
      }
    }
    return set;
  }, [sessions, results, options?.solvedCaseIdsOverride]);

  // 2. Load canonical conspiracy graph
  const canonicalGraph = useMemo(() => {
    try {
      return loadConspiracyGraph();
    } catch {
      return { nodes: [], edges: [] };
    }
  }, []);

  // 3. Compute revealed edges, revealed nodes, and unrevealed 1-hop neighbours
  const graph = useMemo<MapGraph>(() => {
    const rawNodes = canonicalGraph.nodes;
    const rawEdges = canonicalGraph.edges;
    const rawNodeMap = new Map(rawNodes.map((n) => [n.id, n]));

    // Explicitly revealed edge IDs
    const overrideEdgeIds = options?.revealedEdgeIdsOverride
      ? new Set(options.revealedEdgeIdsOverride)
      : null;

    // A canonical edge is revealed if:
    // - it is in overrideEdgeIds, OR
    // - its revealedBy.caseId is in activeSolvedCaseIds, OR
    // - baseline starter lead: if the player solved case_0001 (introductory case) or no cases yet,
    //   reveal introductory edge 'cedge_kessler_quiet' so the map is never completely blank.
    const hasAnyCanonicalSolved = Array.from(activeSolvedCaseIds).some((id) =>
      rawEdges.some((e) => e.revealedBy.caseId === id),
    );

    const isEdgeRevealed = (edgeId: string, caseId: string) => {
      if (overrideEdgeIds) {
        return overrideEdgeIds.has(edgeId);
      }
      if (activeSolvedCaseIds.has(caseId)) {
        return true;
      }
      // Baseline: show intro lead if no canonical cases solved yet
      if (!hasAnyCanonicalSolved && edgeId === 'cedge_kessler_quiet') {
        return true;
      }
      return false;
    };

    const revealedEdgesMap = new Map<string, typeof rawEdges[number]>();
    const revealedNodeIds = new Set<string>();

    for (const edge of rawEdges) {
      if (isEdgeRevealed(edge.id, edge.revealedBy.caseId)) {
        revealedEdgesMap.set(edge.id, edge);
        revealedNodeIds.add(edge.from);
        revealedNodeIds.add(edge.to);
      }
    }

    // Identify unrevealed neighbor nodes (1-hop away from revealed nodes)
    const unknownNeighborIds = new Set<string>();
    const unknownLeadEdges: typeof rawEdges[number][] = [];

    for (const edge of rawEdges) {
      if (!revealedEdgesMap.has(edge.id)) {
        const fromRevealed = revealedNodeIds.has(edge.from);
        const toRevealed = revealedNodeIds.has(edge.to);

        // If exactly one end is revealed, the other end is an unrevealed lead neighbour
        if (fromRevealed && !toRevealed) {
          unknownNeighborIds.add(edge.to);
          unknownLeadEdges.push(edge);
        } else if (!fromRevealed && toRevealed) {
          unknownNeighborIds.add(edge.from);
          unknownLeadEdges.push(edge);
        }
      }
    }

    // Build visible graph edges
    const visibleEdges: MapEdge[] = [];
    for (const edge of revealedEdgesMap.values()) {
      visibleEdges.push({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        rel: edge.rel,
        teaser: edge.teaser,
        isRevealed: true,
      });
    }

    // Attach unrevealed lead edges
    for (const edge of unknownLeadEdges) {
      visibleEdges.push({
        id: `lead_${edge.id}`,
        from: edge.from,
        to: edge.to,
        rel: 'unidentified_link',
        teaser: 'Unconfirmed syndicate corridor.',
        isRevealed: false,
      });
    }

    // Layout nodes
    const layoutNodes = [
      ...Array.from(revealedNodeIds).map((id) => ({ id })),
      ...Array.from(unknownNeighborIds).map((id) => ({ id })),
    ];
    const layoutEdges = visibleEdges.map((e) => ({ from: e.from, to: e.to }));

    const positions = computeForceLayout(layoutNodes, layoutEdges, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      iterations: 60,
      padding: 80,
    });

    // Construct final MapNode objects
    const finalNodes: MapNode[] = [];

    // 1. Revealed nodes with full dossier intelligence
    for (const id of revealedNodeIds) {
      const raw = rawNodeMap.get(id);
      const pos = positions[id] || { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };

      const connectedEdges = visibleEdges.filter((e) => e.from === id || e.to === id);
      const leadEdges = connectedEdges.filter((e) => !e.isRevealed);

      finalNodes.push({
        id,
        kind: (raw?.kind as ConspiracyNodeKind) || 'organization',
        name: raw?.name || 'Unknown Node',
        publicSummary: raw?.publicSummary || 'Classified syndicate intelligence.',
        isRevealed: true,
        x: pos.x,
        y: pos.y,
        connectedEdgeIds: connectedEdges.map((e) => e.id),
        directLeadsCount: leadEdges.length,
      });
    }

    // 2. Unrevealed neighbor nodes: STRICT ANONYMIZATION (NO LEAKS)
    for (const id of unknownNeighborIds) {
      const pos = positions[id] || { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
      const connectedEdges = visibleEdges.filter((e) => e.from === id || e.to === id);

      finalNodes.push({
        id,
        kind: 'unknown',
        name: '?', // Strictly '?' with no real name leaked
        publicSummary:
          'Classified syndicate lead. Investigate connected dispatches to decrypt this intelligence.',
        isRevealed: false,
        x: pos.x,
        y: pos.y,
        connectedEdgeIds: connectedEdges.map((e) => e.id),
        directLeadsCount: 0,
      });
    }

    return {
      nodes: finalNodes,
      edges: visibleEdges,
      revealedNodeCount: revealedNodeIds.size,
      unknownLeadCount: unknownNeighborIds.size,
      revealedEdgeCount: revealedEdgesMap.size,
    };
  }, [canonicalGraph, activeSolvedCaseIds, options?.revealedEdgeIdsOverride]);

  const selectNode = useCallback((node: MapNode) => {
    setSelectedNode(node);
  }, []);

  const clearSelectedNode = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'canvas' ? 'list' : 'canvas'));
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return {
    graph,
    selectedNode,
    selectNode,
    clearSelectedNode,
    viewMode,
    toggleViewMode,
    zoom,
    pan,
    zoomIn,
    zoomOut,
    resetView,
  };
}
