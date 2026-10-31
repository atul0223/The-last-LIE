import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/generator/core/generate_case.js';
import { tpl_hidden_identity } from '../src/generator/templates/hidden_identity.js';

describe('Template: hidden_identity (tpl_hidden_identity_v1)', () => {
  it('generates a clean case for a basic seed and difficulty', () => {
    const result = generateCase({
      templateId: tpl_hidden_identity.id,
      templates: [tpl_hidden_identity],
      seed: 42,
      difficulty: 1,
    });

    expect(result.case).toBeDefined();
    expect(result.case.mysteryType).toBe('hidden_identity');
    expect(result.case.difficulty).toBe(1);
    expect(result.report.ok).toBe(true);
    expect(result.report.errors).toHaveLength(0);
    expect(Math.abs(result.report.metrics.measuredDifficulty - 1)).toBeLessThanOrEqual(1);
  });

  it('is strictly deterministic: same seed produces identical case', () => {
    const resultA = generateCase({
      templateId: tpl_hidden_identity.id,
      templates: [tpl_hidden_identity],
      seed: 12345,
      difficulty: 2,
    });

    const resultB = generateCase({
      templateId: tpl_hidden_identity.id,
      templates: [tpl_hidden_identity],
      seed: 12345,
      difficulty: 2,
    });

    expect(JSON.stringify(resultA.case)).toBe(JSON.stringify(resultB.case));
  });

  it('passes fast-check across 1,000 seeds and all difficulties 1-4 with 0 validator errors and measured difficulty in band', () => {
    const difficulties = [1, 2, 3, 4] as const;

    for (let i = 0; i < 1000; i++) {
      const seed = 80000 + i;
      const targetDiff = difficulties[i % 4]!;

      const result = generateCase({
        templateId: tpl_hidden_identity.id,
        templates: [tpl_hidden_identity],
        seed,
        difficulty: targetDiff,
      });

      expect(result.report.ok).toBe(true);
      expect(result.report.errors).toHaveLength(0);

      const delta = Math.abs(result.report.metrics.measuredDifficulty - targetDiff);
      expect(delta).toBeLessThanOrEqual(1);
    }
  });

  it('demonstrates variety across 50 seeds', () => {
    const culprits = new Set<string>();
    const roles = new Set<string>();
    const locations = new Set<string>();

    for (let seed = 1; seed <= 50; seed++) {
      const targetDiff = ((seed % 4) + 1) as 1 | 2 | 3 | 4;
      const res = generateCase({
        templateId: tpl_hidden_identity.id,
        templates: [tpl_hidden_identity],
        seed: 85000 + seed,
        difficulty: targetDiff,
      });

      const culprit = res.case.characters.find((c) => c.id === res.case.truth.culpritIds[0]);
      if (culprit) {
        culprits.add(culprit.name);
        roles.add(culprit.role);
      }

      for (const loc of res.case.locations) {
        locations.add(loc.name);
      }
    }

    expect(culprits.size).toBeGreaterThan(15);
    expect(locations.size).toBeGreaterThanOrEqual(3);
    expect(roles.size).toBeGreaterThanOrEqual(3);
  });
});
