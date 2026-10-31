import type { CaseDefinition } from '../../schema/index.js';
import { buildContext, contradicts } from '../../logic/index.js';

export interface FingerprintComponents {
  templateId: string;
  culpritRoles: string[];
  decisiveRuleId: string;
  locationIds: string[];
  liarCount: number;
  keyEvidenceClueTypes: string[];
}

/**
 * cyrb128 string hash function producing 4 32-bit unsigned integers.
 * Pure deterministic hash function matching the PRNG implementation.
 */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2081696019);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2081696019);
  return [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0,
  ];
}

/**
 * Identifies the decisive contradiction rule that refutes the culprit's lie
 * or eliminates the primary decoys.
 */
export function getDecisiveRuleId(def: CaseDefinition): string {
  const logicCtx = buildContext(def);
  const clueMap = new Map((def.clues ?? []).map((c) => [c.id, c]));
  const lieClueIds = new Set((def.truth.liars ?? []).flatMap((l) => l.statementClueIds));

  // Strategy 1: Look at reveal explanation beats citing a declared lie clue together with physical evidence
  for (const beat of def.truth.explanation ?? []) {
    if (!beat.clueIds || beat.clueIds.length < 2) continue;
    const lieIds = beat.clueIds.filter((id) => lieClueIds.has(id));
    const otherIds = beat.clueIds.filter((id) => !lieClueIds.has(id));

    for (const lid of lieIds) {
      const lieClue = clueMap.get(lid);
      if (!lieClue) continue;
      for (const oid of otherIds) {
        const otherClue = clueMap.get(oid);
        if (!otherClue) continue;
        for (const fact1 of lieClue.asserts) {
          for (const fact2 of otherClue.asserts) {
            const contra = contradicts(fact1, fact2, logicCtx);
            if (contra) {
              return contra.ruleId;
            }
          }
        }
      }
    }
  }

  // Strategy 2: Look for contradictions between any lie clue and keyEvidence clues
  const keyClueIds = new Set((def.truth.keyEvidence ?? []).flat());
  for (const lid of lieClueIds) {
    const lieClue = clueMap.get(lid);
    if (!lieClue) continue;
    for (const kid of keyClueIds) {
      const keyClue = clueMap.get(kid);
      if (!keyClue) continue;
      for (const fact1 of lieClue.asserts) {
        for (const fact2 of keyClue.asserts) {
          const contra = contradicts(fact1, fact2, logicCtx);
          if (contra) {
            return contra.ruleId;
          }
        }
      }
    }
  }

  // Strategy 3: Look for contradictions between any lie clue and any physical clue in the case
  for (const lid of lieClueIds) {
    const lieClue = clueMap.get(lid);
    if (!lieClue) continue;
    for (const clue of def.clues ?? []) {
      if (clue.reliability !== 'physical' || clue.id === lid) continue;
      for (const fact1 of lieClue.asserts) {
        for (const fact2 of clue.asserts) {
          const contra = contradicts(fact1, fact2, logicCtx);
          if (contra) {
            return contra.ruleId;
          }
        }
      }
    }
  }

  // Strategy 4: Fallback to any contradiction in explanation beats
  for (const beat of def.truth.explanation ?? []) {
    if (!beat.clueIds || beat.clueIds.length < 2) continue;
    for (let i = 0; i < beat.clueIds.length; i++) {
      for (let j = i + 1; j < beat.clueIds.length; j++) {
        const c1 = clueMap.get(beat.clueIds[i]!);
        const c2 = clueMap.get(beat.clueIds[j]!);
        if (!c1 || !c2) continue;
        for (const f1 of c1.asserts) {
          for (const f2 of c2.asserts) {
            const contra = contradicts(f1, f2, logicCtx);
            if (contra) {
              return contra.ruleId;
            }
          }
        }
      }
    }
  }

  return 'none';
}

/**
 * Extracts normalized, deterministic components for fingerprinting a case definition.
 */
export function getFingerprintComponents(def: CaseDefinition): FingerprintComponents {
  const templateId = def.meta?.templateId ?? '';

  // Extract culprit roles (sorted to ensure order independence)
  const culpritRoles = (def.truth.culpritIds ?? [])
    .map((id) => {
      const char = (def.characters ?? []).find((c) => c.id === id);
      return char?.role ?? id;
    })
    .sort();

  const decisiveRuleId = getDecisiveRuleId(def);

  // Sorted location IDs
  const locationIds = (def.locations ?? []).map((l) => l.id).sort();

  // Number of declared liars
  const liarCount = def.truth.liars?.length ?? 0;

  // Clue types of keyEvidence sets (normalized and sorted)
  const clueMap = new Map((def.clues ?? []).map((c) => [c.id, c]));
  const keyEvidenceClueTypes = (def.truth.keyEvidence ?? [])
    .map((set) =>
      set
        .map((clueId) => clueMap.get(clueId)?.type ?? 'unknown')
        .sort()
        .join('+'),
    )
    .sort();

  return {
    templateId,
    culpritRoles,
    decisiveRuleId,
    locationIds,
    liarCount,
    keyEvidenceClueTypes,
  };
}

/**
 * Hashes normalized fingerprint components into a deterministic, stable string.
 */
export function hashFingerprint(components: FingerprintComponents): string {
  const canonical = JSON.stringify({
    templateId: components.templateId,
    culpritRoles: components.culpritRoles,
    decisiveRuleId: components.decisiveRuleId,
    locationIds: components.locationIds,
    liarCount: components.liarCount,
    keyEvidenceClueTypes: components.keyEvidenceClueTypes,
  });

  const [h1, h2, h3, h4] = cyrb128(canonical);
  const hex = [h1, h2, h3, h4].map((n) => n.toString(16).padStart(8, '0')).join('');
  return `fp_${hex}`;
}

/**
 * Generates a stable, deterministic fingerprint hash for a CaseDefinition.
 * SYSTEM_DESIGN §5.2 / WP-36:
 * A stable hash of (templateId, culprit role, decisive ruleId, sorted location ids, liar count, keyEvidence clue types).
 */
export function fingerprint(def: CaseDefinition): string {
  return hashFingerprint(getFingerprintComponents(def));
}
