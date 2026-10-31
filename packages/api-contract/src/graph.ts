import { z } from 'zod';

export const GRAPH_NODE_KINDS = [
  'character',
  'organization',
  'location',
  'symbol',
  'transaction',
  'case',
] as const;
export const GraphNodeKindSchema = z.enum(GRAPH_NODE_KINDS);
export type GraphNodeKind = z.infer<typeof GraphNodeKindSchema>;

export const GraphNodeSchema = z
  .object({
    id: z.string(),
    kind: GraphNodeKindSchema,
    name: z.string().nullable(),
    description: z.string().nullable().optional(),
    revealed: z.boolean(),
  })
  .strict();
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z
  .object({
    id: z.string(),
    from: z.string(),
    to: z.string(),
    rel: z.string(),
    revealedByCaseId: z.string().optional(),
  })
  .strict();
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

// GET /graph
export const GraphResponseSchema = z
  .object({
    nodes: z.array(GraphNodeSchema),
    edges: z.array(GraphEdgeSchema),
  })
  .strict();
export type GraphResponse = z.infer<typeof GraphResponseSchema>;
