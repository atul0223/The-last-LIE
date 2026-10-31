import { ConspiracyGraphSchema, type ConspiracyGraph } from './schema.js';
import defaultNodes from '../../conspiracy/nodes.json';
import defaultEdges from '../../conspiracy/edges.json';

/**
 * Loads and validates a ConspiracyGraph from raw nodes and edges data.
 * If arguments are omitted, loads the default packaged conspiracy graph from packages/content/conspiracy.
 */
export function loadConspiracyGraph(
  nodesData?: unknown,
  edgesData?: unknown,
): ConspiracyGraph {
  const rawNodes = nodesData ?? defaultNodes;
  const rawEdges = edgesData ?? defaultEdges;

  return ConspiracyGraphSchema.parse({
    nodes: rawNodes,
    edges: rawEdges,
  });
}
