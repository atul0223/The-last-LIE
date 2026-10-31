import type { ConspiracyGraph } from './schema.js';

export interface CaseReference {
  id: string;
  clues: Array<{ id: string }>;
}

export interface ConspiracyValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates integrity of a ConspiracyGraph:
 * 1. Node IDs must be unique.
 * 2. Edge IDs must be unique.
 * 3. Every edge's `from` and `to` must reference existing node IDs in the graph.
 * 4. If `knownCases` are provided, each edge's `revealedBy.caseId` and `clueId` must exist.
 * Note: Cycles in the conspiracy network graph are explicitly allowed.
 */
export function validateConspiracyGraph(
  graph: ConspiracyGraph,
  knownCases?: CaseReference[],
): ConspiracyValidationResult {
  const errors: string[] = [];

  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: "${node.id}"`);
    } else {
      nodeIds.add(node.id);
    }
  }

  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      errors.push(`Duplicate edge id: "${edge.id}"`);
    } else {
      edgeIds.add(edge.id);
    }

    if (!nodeIds.has(edge.from)) {
      errors.push(`Edge "${edge.id}" references nonexistent from-node: "${edge.from}"`);
    }

    if (!nodeIds.has(edge.to)) {
      errors.push(`Edge "${edge.id}" references nonexistent to-node: "${edge.to}"`);
    }

    if (knownCases && knownCases.length > 0) {
      const targetCase = knownCases.find((c) => c.id === edge.revealedBy.caseId);
      if (!targetCase) {
        errors.push(
          `Edge "${edge.id}" revealedBy references nonexistent case: "${edge.revealedBy.caseId}"`,
        );
      } else {
        const hasClue = targetCase.clues.some((clue) => clue.id === edge.revealedBy.clueId);
        if (!hasClue) {
          errors.push(
            `Edge "${edge.id}" revealedBy references nonexistent clue "${edge.revealedBy.clueId}" in case "${edge.revealedBy.caseId}"`,
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
