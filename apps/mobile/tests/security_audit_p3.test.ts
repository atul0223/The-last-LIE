import { describe, it, expect } from 'vitest';
import { GENERATED_CASES } from '@lastlie/content';
import { CaseDefinitionSchema, toPublicCase, fingerprint } from '@lastlie/case-engine';
import { deepScanForLeaks } from '../src/store/persist';

describe('R3 Security Audit: Phase 3 Procedural Security & Leak Defense', () => {
  it('A1. Generated cases strictly contain zero forbidden engine keys after redaction', () => {
    expect(GENERATED_CASES.length).toBe(24);

    for (const rawCase of GENERATED_CASES) {
      const def = CaseDefinitionSchema.parse(rawCase);
      const publicCase = toPublicCase(def, []);

      // Verify deepScanForLeaks detects zero forbidden keys
      expect(() => deepScanForLeaks(publicCase)).not.toThrow();

      // Check locked clues in publicCase have no text and no asserts
      for (const clue of publicCase.clues) {
        if ('locked' in clue && clue.locked === true) {
          expect('text' in clue).toBe(false);
          expect('asserts' in clue).toBe(false);
        }
      }

      // Check hypotheses only contain id and label
      for (const hyp of publicCase.hypotheses) {
        expect('claims' in hyp).toBe(false);
        expect('culpritIds' in hyp).toBe(false);
      }
    }
  });

  it('A2. Generated case titles contain zero character first or last names (V16 compliance)', () => {
    for (const rawCase of GENERATED_CASES) {
      const def = CaseDefinitionSchema.parse(rawCase);

      for (const char of def.characters) {
        const parts = char.name.split(/\s+/);
        for (const part of parts) {
          if (part.length <= 2) continue;
          const nameRegex = new RegExp(`\\b${part}\\b`, 'i');
          expect(
            nameRegex.test(def.title),
            `Case ${def.id} title "${def.title}" leaked character name part "${part}"`
          ).toBe(false);
        }
      }
    }
  });

  it('A3. Generated case briefings never single out culprits without naming all suspects', () => {
    for (const rawCase of GENERATED_CASES) {
      const def = CaseDefinitionSchema.parse(rawCase);
      const solutionHyp = def.hypotheses.find((h) => h.id === def.truth.solutionHypothesisId);
      expect(solutionHyp).toBeDefined();

      const culprits = def.characters.filter((c) => solutionHyp!.culpritIds.includes(c.id));
      const suspects = def.characters.filter((c) =>
        c.role.toLowerCase().includes('suspect') ||
        c.role.toLowerCase().includes('staff') ||
        c.role.toLowerCase().includes('clerk') ||
        c.role.toLowerCase().includes('editor')
      );

      for (const culprit of culprits) {
        const parts = culprit.name.split(/\s+/);
        const culpritMentioned = parts.some(
          (p) => p.length > 2 && new RegExp(`\\b${p}\\b`, 'i').test(def.briefing)
        );

        if (culpritMentioned) {
          // If culprit is named in briefing, every suspect must also be named
          for (const suspect of suspects) {
            const sParts = suspect.name.split(/\s+/);
            const suspectMentioned = sParts.some(
              (p) => p.length > 2 && new RegExp(`\\b${p}\\b`, 'i').test(def.briefing)
            );
            expect(
              suspectMentioned,
              `Case ${def.id} briefing singled out culprit "${culprit.name}" while omitting suspect "${suspect.name}"`
            ).toBe(true);
          }
        }
      }
    }
  });

  it('B. Fingerprint hash is pure, deterministic, and resistant to superficial name changes', () => {
    const sample = CaseDefinitionSchema.parse(GENERATED_CASES[0]);
    const baseFp = fingerprint(sample);

    expect(baseFp).toMatch(/^fp_[0-9a-f]{32}$/);

    // Permuting character names should NOT alter the fingerprint
    const permuted = JSON.parse(JSON.stringify(sample));
    permuted.characters[0].name = 'Alice Anonymous';
    permuted.characters[1].name = 'Bob Bystander';
    const permutedFp = fingerprint(permuted);

    expect(permutedFp).toBe(baseFp);
  });
});
