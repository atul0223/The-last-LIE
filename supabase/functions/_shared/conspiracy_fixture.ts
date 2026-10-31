import type { GraphEdge, GraphNodeKind } from '@lastlie/api-contract';
import type { InMemoryRepository } from './in_memory_repo.js';

export interface RawConspiracyNode {
  id: string;
  kind: GraphNodeKind;
  name: string;
  description?: string | null;
}

export interface RawConspiracyEdge {
  id: string;
  from: string;
  to: string;
  rel: string;
  revealedByCaseId: string;
  clueId?: string;
}

export const FIXTURE_CONSPIRACY_NODES: RawConspiracyNode[] = [
  {
    id: 'cnode_the_quiet',
    kind: 'organization',
    name: 'The Quiet',
    description: 'A clandestine syndicate operating throughout Vesper City institutions.',
  },
  {
    id: 'cnode_dr_arjun',
    kind: 'character',
    name: 'Dr. Arjun Mehta',
    description: 'Lead researcher linked to high-security archives and historical acquisitions.',
  },
  {
    id: 'cnode_central_vault',
    kind: 'location',
    name: 'Central Vault',
    description: 'Subterranean repository storing encrypted artifacts and transit records.',
  },
  {
    id: 'cnode_shadow_broker',
    kind: 'character',
    name: 'The Shadow Broker',
    description: 'Intermediary laundering stolen transaction ledgers and contraband.',
  },
  {
    id: 'cnode_ouroboros_seal',
    kind: 'symbol',
    name: 'Ouroboros Seal',
    description: 'Wax mark found on confidential dispatches from Quiet command.',
  },
];

export const FIXTURE_CONSPIRACY_EDGES: RawConspiracyEdge[] = [
  {
    id: 'cedge_quiet_vault',
    from: 'cnode_the_quiet',
    to: 'cnode_central_vault',
    rel: 'controls',
    revealedByCaseId: 'case_0001',
  },
  {
    id: 'cedge_arjun_vault',
    from: 'cnode_dr_arjun',
    to: 'cnode_central_vault',
    rel: 'accesses',
    revealedByCaseId: 'case_0001',
  },
  {
    id: 'cedge_vault_broker',
    from: 'cnode_central_vault',
    to: 'cnode_shadow_broker',
    rel: 'funnels_to',
    revealedByCaseId: 'case_0002',
  },
  {
    id: 'cedge_broker_seal',
    from: 'cnode_shadow_broker',
    to: 'cnode_ouroboros_seal',
    rel: 'marks_with',
    revealedByCaseId: 'case_0003',
  },
];

export function seedConspiracyFixture(repo: InMemoryRepository): void {
  repo.setGraphData(FIXTURE_CONSPIRACY_NODES, FIXTURE_CONSPIRACY_EDGES as GraphEdge[]);
}
