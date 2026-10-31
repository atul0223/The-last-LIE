import { describe, expect, it } from 'vitest';
import {
  BUILTIN_TEMPLATES,
  fingerprint,
  generateCase,
  type CaseDefinition,
} from '@lastlie/case-engine';
import { GENERATED_CASES } from '../src/index.js';

describe('Content Pack Repetition & Neutrality Verification', () => {
  const templates = [
    'tpl_false_alibi_v1',
    'tpl_missing_item_v1',
    'tpl_forged_message_v1',
    'tpl_hidden_identity_v1',
  ];

  for (const tplId of templates) {
    it(`template ${tplId} has 50-seed collision rate < 20% and title duplication < 15%`, () => {
      const tpl = BUILTIN_TEMPLATES[tplId];
      expect(tpl).toBeDefined();

      const sampleSize = 50;
      const startSeed = 1000;
      const fps = new Set<string>();
      const titles = new Set<string>();

      for (let i = 0; i < sampleSize; i++) {
        const res = generateCase({
          templateId: tplId,
          seed: startSeed + i,
          difficulty: 2,
          templates: [tpl!],
        });

        fps.add(fingerprint(res.case));
        titles.add(res.case.title);
      }

      const collisions = sampleSize - fps.size;
      const collisionRate = collisions / sampleSize;

      const dupTitles = sampleSize - titles.size;
      const titleDupRate = dupTitles / sampleSize;

      expect(collisionRate).toBeLessThan(0.20);
      expect(titleDupRate).toBeLessThan(0.15);
    });
  }

  it('all generated pack cases have zero culprit leaks in title and briefing', () => {
    expect(GENERATED_CASES.length).toBe(24);

    for (const def of GENERATED_CASES as unknown as CaseDefinition[]) {
      const culpritIds = def.truth.culpritIds ?? [];
      const culprits = def.characters.filter((c) => culpritIds.includes(c.id));
      expect(culprits.length).toBeGreaterThan(0);

      const titleLower = def.title.toLowerCase();
      const briefingLower = def.briefing.toLowerCase();

      for (const culprit of culprits) {
        const nameParts = culprit.name
          .split(/\s+/)
          .map((p) => p.replace(/[^a-zA-Z]/g, ''))
          .filter((p) => p.length >= 3);

        // 1. Title must not leak culprit first or last name
        for (const part of nameParts) {
          const reg = new RegExp(`\\b${part.toLowerCase()}\\b`, 'i');
          expect(reg.test(titleLower)).toBe(false);
        }

        // 2. Briefing must not name culprit unless it names every suspect
        let culpritNamedInBriefing = false;
        for (const part of nameParts) {
          const reg = new RegExp(`\\b${part.toLowerCase()}\\b`, 'i');
          if (reg.test(briefingLower)) {
            culpritNamedInBriefing = true;
            break;
          }
        }

        if (culpritNamedInBriefing) {
          for (const char of def.characters) {
            const charParts = char.name
              .split(/\s+/)
              .map((p) => p.replace(/[^a-zA-Z]/g, ''))
              .filter((p) => p.length >= 3);
            const isNamed = charParts.some((p) =>
              new RegExp(`\\b${p.toLowerCase()}\\b`, 'i').test(briefingLower),
            );
            expect(isNamed).toBe(true);
          }
        }
      }
    }
  });
});
