import { describe, expect, it } from 'vitest';
import { POOL_MANIFEST, getPoolCase, getAllPoolCases } from '../src/server.js';
import { fingerprint, validateCase, type CaseDefinition } from '@lastlie/case-engine';

describe('Server Case Pool Verification (WP-Scale / Daily & Weekly Rotation)', () => {
  it('contains at least 120 cases in manifest with expected template & difficulty spread', () => {
    expect(POOL_MANIFEST.length).toBeGreaterThanOrEqual(120);
    expect(POOL_MANIFEST.length).toBe(128);

    const templateCounts: Record<string, number> = {};
    const difficultyCounts: Record<number, number> = {};

    for (const entry of POOL_MANIFEST) {
      templateCounts[entry.templateId] = (templateCounts[entry.templateId] ?? 0) + 1;
      difficultyCounts[entry.difficulty] = (difficultyCounts[entry.difficulty] ?? 0) + 1;
    }

    const expectedTemplates = [
      'tpl_false_alibi_v1',
      'tpl_missing_item_v1',
      'tpl_forged_message_v1',
      'tpl_hidden_identity_v1',
    ];

    for (const tplId of expectedTemplates) {
      expect(templateCounts[tplId]).toBeGreaterThanOrEqual(30);
      expect(templateCounts[tplId]).toBe(32);
    }

    for (const diff of [1, 2, 3, 4]) {
      expect(difficultyCounts[diff]).toBe(32);
    }
  });

  it('tags daily and weekly eligibility correctly based on difficulty', () => {
    for (const entry of POOL_MANIFEST) {
      expect(entry.daily_eligible).toBe(true);
      if (entry.difficulty >= 3) {
        expect(entry.weekly_eligible).toBe(true);
      } else {
        expect(entry.weekly_eligible).toBe(false);
      }
    }
  });

  it('contains zero duplicate fingerprints across the entire pool', () => {
    const fps = new Set<string>();
    for (const entry of POOL_MANIFEST) {
      expect(fps.has(entry.fingerprint)).toBe(false);
      fps.add(entry.fingerprint);
    }
    expect(fps.size).toBe(POOL_MANIFEST.length);
  });

  it('loads valid cases with 0 culprit leaks in title and briefing', () => {
    const cases = getAllPoolCases();
    expect(cases.length).toBe(128);

    for (const def of cases) {
      // Validate with engine
      const rep = validateCase(def);
      expect(rep.ok).toBe(true);
      expect(rep.errors).toHaveLength(0);

      // Verify fingerprint matches manifest
      const fp = fingerprint(def);
      const manifestEntry = POOL_MANIFEST.find((m) => m.id === def.id);
      expect(manifestEntry).toBeDefined();
      expect(manifestEntry?.fingerprint).toBe(fp);

      // Culprit leak scan
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

        // 2. Briefing must not name culprit unless every suspect is named
        let culpritNamed = false;
        for (const part of nameParts) {
          const reg = new RegExp(`\\b${part.toLowerCase()}\\b`, 'i');
          if (reg.test(briefingLower)) {
            culpritNamed = true;
            break;
          }
        }

        if (culpritNamed) {
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
