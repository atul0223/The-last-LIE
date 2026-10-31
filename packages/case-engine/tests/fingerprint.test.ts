import { describe, it, expect } from 'vitest';
import {
  fingerprint,
  getFingerprintComponents,
  getDecisiveRuleId,
  generateCase,
  type CaseDefinition,
} from '../src/index.js';
import case0001 from '../../content/cases/authored/case_0001.json';
import case0002 from '../../content/cases/authored/case_0002.json';
import case0003 from '../../content/cases/authored/case_0003.json';
import case0004 from '../../content/cases/authored/case_0004.json';

describe('WP-36: Case Fingerprint & Deduplication', () => {
  it('is completely deterministic for identical cases', () => {
    const res1 = generateCase({ templateId: 'tpl_false_alibi_v1', seed: 42, difficulty: 1 });
    const res2 = generateCase({ templateId: 'tpl_false_alibi_v1', seed: 42, difficulty: 1 });

    const fp1 = fingerprint(res1.case);
    const fp2 = fingerprint(res2.case);

    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^fp_[0-9a-f]{32}$/);
  });

  it('is immune to permutations of locations, characters, and keyEvidence ordering', () => {
    const res = generateCase({ templateId: 'tpl_false_alibi_v1', seed: 101, difficulty: 2 });
    const originalFp = fingerprint(res.case);

    const permutedCase: CaseDefinition = {
      ...res.case,
      locations: [...res.case.locations].reverse(),
      characters: [...res.case.characters].reverse(),
      truth: {
        ...res.case.truth,
        keyEvidence: [...res.case.truth.keyEvidence].reverse(),
      },
    };

    const permutedFp = fingerprint(permutedCase);
    expect(permutedFp).toBe(originalFp);
  });

  it('is based on culprit role, not character name or id', () => {
    const res = generateCase({ templateId: 'tpl_missing_item_v1', seed: 202, difficulty: 1 });
    const baseFp = fingerprint(res.case);

    const culpritId = res.case.truth.culpritIds[0]!;
    const renamedCase: CaseDefinition = {
      ...res.case,
      characters: res.case.characters.map((c) =>
        c.id === culpritId ? { ...c, name: 'Completely Different Name' } : c,
      ),
    };

    expect(fingerprint(renamedCase)).toBe(baseFp);

    // If role changes, fingerprint changes
    const roleChangedCase: CaseDefinition = {
      ...res.case,
      characters: res.case.characters.map((c) =>
        c.id === culpritId ? { ...c, role: 'Chief Security Officer' } : c,
      ),
    };

    expect(fingerprint(roleChangedCase)).not.toBe(baseFp);
  });

  it('detects decisive rule accurately across procedural templates', () => {
    const faCase = generateCase({ templateId: 'tpl_false_alibi_v1', seed: 303, difficulty: 1 }).case;
    expect(getDecisiveRuleId(faCase)).toBe('access.presence');

    const miCase = generateCase({ templateId: 'tpl_missing_item_v1', seed: 303, difficulty: 1 }).case;
    expect(getDecisiveRuleId(miCase)).toBe('possess.exclusive');

    const fmCase = generateCase({ templateId: 'tpl_forged_message_v1', seed: 303, difficulty: 1 }).case;
    expect(getDecisiveRuleId(fmCase)).toBe('message.sender_device');
  });

  it('computes correct fingerprints and decisive rules for authored cases', () => {
    const fp1 = fingerprint(case0001 as unknown as CaseDefinition);
    const fp2 = fingerprint(case0002 as unknown as CaseDefinition);
    const fp3 = fingerprint(case0003 as unknown as CaseDefinition);
    const fp4 = fingerprint(case0004 as unknown as CaseDefinition);

    expect(fp1).toMatch(/^fp_[0-9a-f]{32}$/);
    expect(fp2).toMatch(/^fp_[0-9a-f]{32}$/);
    expect(fp3).toMatch(/^fp_[0-9a-f]{32}$/);
    expect(fp4).toMatch(/^fp_[0-9a-f]{32}$/);

    // All authored cases have distinct fingerprints
    const unique = new Set([fp1, fp2, fp3, fp4]);
    expect(unique.size).toBe(4);

    expect(getDecisiveRuleId(case0001 as unknown as CaseDefinition)).toBe('access.presence');
    expect(getDecisiveRuleId(case0002 as unknown as CaseDefinition)).toBe('access.presence');
    expect(getDecisiveRuleId(case0003 as unknown as CaseDefinition)).toBe('presence.travel');
    expect(getDecisiveRuleId(case0004 as unknown as CaseDefinition)).toBe('state.value');
  });

  it('exposes components matching SYSTEM_DESIGN §5.2 specifications', () => {
    const res = generateCase({ templateId: 'tpl_forged_message_v1', seed: 505, difficulty: 3 });
    const components = getFingerprintComponents(res.case);

    expect(components.templateId).toBe('tpl_forged_message_v1');
    expect(components.culpritRoles).toEqual(['Wire Editor']);
    expect(components.decisiveRuleId).toBe('message.sender_device');
    expect(components.locationIds.length).toBeGreaterThan(0);
    expect(components.liarCount).toBe(1);
    expect(components.keyEvidenceClueTypes.length).toBeGreaterThan(0);
  });
});
