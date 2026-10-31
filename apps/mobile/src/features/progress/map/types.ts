export type ConspiracyNodeKind =
  | 'character'
  | 'organization'
  | 'location'
  | 'symbol'
  | 'transaction'
  | 'case'
  | 'unknown';

export interface MapNode {
  id: string;
  kind: ConspiracyNodeKind;
  name: string;
  publicSummary: string;
  isRevealed: boolean;
  x: number;
  y: number;
  connectedEdgeIds: string[];
  directLeadsCount: number;
}

export interface MapEdge {
  id: string;
  from: string;
  to: string;
  rel: string;
  teaser?: string;
  isRevealed: boolean;
}

export interface MapGraph {
  nodes: MapNode[];
  edges: MapEdge[];
  revealedNodeCount: number;
  unknownLeadCount: number;
  revealedEdgeCount: number;
}

export interface LayoutOptions {
  width: number;
  height: number;
  iterations?: number;
  padding?: number;
}
