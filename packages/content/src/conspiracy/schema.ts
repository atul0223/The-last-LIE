import { z } from 'zod';

export const ConspiracyNodeKindSchema = z.enum([
  'character',
  'organization',
  'location',
  'symbol',
  'transaction',
  'case',
]);
export type ConspiracyNodeKind = z.infer<typeof ConspiracyNodeKindSchema>;

export const ConspiracyNodeSchema = z.object({
  id: z.string().min(1, 'Node id is required'),
  kind: ConspiracyNodeKindSchema,
  name: z.string().min(1, 'Node name is required'),
  publicSummary: z.string().min(1, 'Node publicSummary is required'),
});
export type ConspiracyNode = z.infer<typeof ConspiracyNodeSchema>;

export const ConspiracyEdgeSchema = z.object({
  id: z.string().min(1, 'Edge id is required'),
  from: z.string().min(1, 'Edge from node id is required'),
  to: z.string().min(1, 'Edge to node id is required'),
  rel: z.string().min(1, 'Edge relation description is required'),
  revealedBy: z.object({
    caseId: z.string().min(1, 'revealedBy.caseId is required'),
    clueId: z.string().min(1, 'revealedBy.clueId is required'),
  }),
  teaser: z.string().optional(),
});
export type ConspiracyEdge = z.infer<typeof ConspiracyEdgeSchema>;

export const ConspiracyGraphSchema = z.object({
  nodes: z.array(ConspiracyNodeSchema),
  edges: z.array(ConspiracyEdgeSchema),
});
export type ConspiracyGraph = z.infer<typeof ConspiracyGraphSchema>;
