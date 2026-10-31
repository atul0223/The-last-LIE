import { describe, expect, it } from 'vitest';
import {
  buildContext,
  CaseDefinitionSchema,
  evaluateHypothesis,
  survivingHypotheses,
  toPublicCase,
  validateCase,
  type CaseDefinition,
} from '@lastlie/case-engine';
import { CANONICAL_CASES, case_c101, case_c102, case_c103 } from '../src/index.js';

const FORBIDDEN_KEYS = new Set([
  'truth',
  'claims',
  'culpritIds',
  'seed',
  'asserts',
  'keyEvidence',
  'liars',
  'conspiracyHooks',
]);

function deepScan(
  target: unknown,
  forbiddenKeys: Set<string>,
  path = '',
): string[] {
  const leaks: string[] = [];
  if (target === null || target === undefined) return leaks;

  if (Array.isArray(target)) {
    target.forEach((item, index) => {
      leaks.push(...deepScan(item, forbiddenKeys, `${path}[${index}]`));
    });
  } else if (typeof target === 'object') {
    for (const [key, value] of Object.entries(target as Record<string, unknown>)) {
      if (forbiddenKeys.has(key)) {
        leaks.push(`${path}.${key}`);
      } else {
        leaks.push(...deepScan(value, forbiddenKeys, `${path}.${key}`));
      }
    }
  }

  return leaks;
}

describe('Canonical Cases Suite (Chapter 1)', () => {
  it('exports exactly 3 canonical cases', () => {
    expect(CANONICAL_CASES).toHaveLength(3);
    expect(case_c101.id).toBe('case_c101');
    expect(case_c102.id).toBe('case_c102');
    expect(case_c103.id).toBe('case_c103');
  });

  describe.each([
    { id: 'case_c101', caseDef: case_c101 as unknown as CaseDefinition, diff: 3 },
    { id: 'case_c102', caseDef: case_c102 as unknown as CaseDefinition, diff: 3 },
    { id: 'case_c103', caseDef: case_c103 as unknown as CaseDefinition, diff: 3 },
  ])('$id Validation & Logic', ({ id, caseDef, diff }) => {
    it(`validates ${id} with zero errors and matches difficulty`, () => {
      const parsed = CaseDefinitionSchema.parse(caseDef) as CaseDefinition;
      expect(parsed.kind).toBe('canonical');
      const report = validateCase(parsed);
      expect(report.ok).toBe(true);
      expect(report.errors).toEqual([]);
      expect(report.metrics?.measuredDifficulty).toBe(diff);
    });

    it(`ensures toPublicCase redacts all secret fields in ${id}`, () => {
      const parsed = CaseDefinitionSchema.parse(caseDef) as CaseDefinition;
      const defaultClueIds = parsed.clues
        .filter((c) => c.unlock.kind === 'default')
        .map((c) => c.id);
      const publicCase = toPublicCase(parsed, defaultClueIds);

      const leaks = deepScan(publicCase, FORBIDDEN_KEYS);
      expect(leaks).toEqual([]);
    });

    it(`proves solution uniqueness and solvability in ${id}`, () => {
      const parsed = CaseDefinitionSchema.parse(caseDef) as CaseDefinition;
      const ctx = buildContext(parsed);
      const obtainableClueIds = parsed.clues.map((c) => c.id);

      const surviving = survivingHypotheses(parsed, obtainableClueIds, ctx);
      expect(surviving.map((h) => h.id)).toEqual([parsed.truth.solutionHypothesisId]);

      const solution = parsed.hypotheses.find((h) => h.id === parsed.truth.solutionHypothesisId)!;
      const evalRes = evaluateHypothesis(solution, parsed.clues, ctx);
      expect(evalRes.eliminated).toBe(false);
      expect(evalRes.by).toEqual([]);
    });
  });
});
