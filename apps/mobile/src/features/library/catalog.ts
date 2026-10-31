import * as contentModule from '@lastlie/content';
import type { CaseDefinition } from '@lastlie/case-engine';

export type CaseOrigin = 'authored' | 'generated' | 'canonical' | 'procedural';

export interface CaseCatalogItem {
  id: string;
  code: string;
  title: string;
  briefing: string;
  summary: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  mysteryType: 'forged_message' | 'missing_item' | 'false_alibi' | string;
  estimatedMinutes: number;
  hypothesesCount: number;
  cluesCount: number;
  kind?: CaseOrigin;
}

export const AUTHORED_CASE_CATALOG: CaseCatalogItem[] = [
  {
    id: 'case_0001',
    code: 'CASE-0001',
    title: 'The Missing Message',
    briefing: 'Who sent the forged message from Maya phone?',
    summary:
      'A classified flash drive disappeared during an 8-minute window. Discover who lied about their movements.',
    difficulty: 1,
    mysteryType: 'forged_message',
    estimatedMinutes: 6,
    hypothesesCount: 3,
    cluesCount: 7,
    kind: 'authored',
  },
  {
    id: 'case_0002',
    code: 'CASE-0002',
    title: 'The Missing Astrum',
    briefing:
      'The Astrum Seal, a priceless clockwork artifact, vanished from Helios Gallery before scheduled transit.',
    summary:
      'Helios Fine Arts Gallery rear loading dock on a fog-drenched autumn evening. Identify the culprit who broke the seal.',
    difficulty: 1,
    mysteryType: 'missing_item',
    estimatedMinutes: 4,
    hypothesesCount: 3,
    cluesCount: 8,
    kind: 'authored',
  },
  {
    id: 'case_0003',
    code: 'CASE-0003',
    title: 'The Alibi Cipher',
    briefing:
      'Three researchers claim simultaneous presence in the cleanroom. One timeline contains an impossible contradiction.',
    summary:
      'Vesper Biotech lab breach. Reconstruct the physical and badge access trail to shatter the forged alibi.',
    difficulty: 2,
    mysteryType: 'false_alibi',
    estimatedMinutes: 10,
    hypothesesCount: 3,
    cluesCount: 9,
    kind: 'authored',
  },
  {
    id: 'case_0004',
    code: 'CASE-0004',
    title: 'Sector 7 Protocol',
    briefing:
      'A rogue signal routed through relay station 9 injected spoofed clearance codes into the central mainframe.',
    summary:
      'Deep network compromise in the transit grid. Cross-examine terminal timestamps against power fluctuation logs.',
    difficulty: 3,
    mysteryType: 'forged_message',
    estimatedMinutes: 15,
    hypothesesCount: 4,
    cluesCount: 11,
    kind: 'authored',
  },
  {
    id: 'case_0005',
    code: 'CASE-0005',
    title: 'Blackout at Helios',
    briefing:
      'During a 90-second grid outage, the master vault keycard was cloned and returned without alarm triggers.',
    summary:
      'Inside job with high-level clearance. Disentangle conflicting guard testimonies and physical door records.',
    difficulty: 4,
    mysteryType: 'missing_item',
    estimatedMinutes: 20,
    hypothesesCount: 4,
    cluesCount: 14,
    kind: 'authored',
  },
];

/**
 * Converts a raw CaseDefinition into a CaseCatalogItem representation.
 */
export function caseDefinitionToCatalogItem(def: CaseDefinition): CaseCatalogItem {
  const isAuthored = def.kind === 'authored';
  const tplId = def.meta?.templateId ?? '';
  const cleanType = tplId
    ? tplId.replace(/^tpl_/, '').replace(/_v\d+$/, '')
    : (def.mysteryType ?? 'procedural');

  return {
    id: def.id,
    code: def.id.toUpperCase().replace('_', '-'),
    title: def.title,
    briefing: def.briefing,
    summary: def.setting?.summary ?? def.briefing,
    difficulty: (def.difficulty ?? 1) as 1 | 2 | 3 | 4 | 5,
    mysteryType: cleanType,
    estimatedMinutes: def.estimatedMinutes ?? (def.difficulty ? def.difficulty * 4 + 2 : 10),
    hypothesesCount: def.hypotheses?.length ?? 3,
    cluesCount: def.clues?.length ?? 8,
    kind: isAuthored ? 'authored' : 'generated',
  };
}

/**
 * Returns the combined catalog of authored cases and any available generated cases.
 */
export function getCaseCatalog(customGenerated?: CaseDefinition[]): CaseCatalogItem[] {
  const content = contentModule as Record<string, unknown>;
  const contentGenerated: CaseDefinition[] = Array.isArray(content.GENERATED_CASES)
    ? (content.GENERATED_CASES as CaseDefinition[])
    : [];

  const allGenerated = [...contentGenerated, ...(customGenerated ?? [])];
  const generatedItems = allGenerated.map(caseDefinitionToCatalogItem);

  return [...AUTHORED_CASE_CATALOG, ...generatedItems];
}

export const CASE_CATALOG: CaseCatalogItem[] = getCaseCatalog();
