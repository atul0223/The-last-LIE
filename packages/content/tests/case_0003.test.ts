import { describe, expect, it } from 'vitest';
import {
  buildContext,
  CaseDefinitionSchema,
  contradicts,
  evaluateHypothesis,
  factEntailed,
  survivingHypotheses,
  toPublicCase,
  validateCase,
  type CaseDefinition,
} from '@lastlie/case-engine';
import case_0003_raw from '../cases/authored/case_0003.json';

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

const INTERNAL_TAGS = ['red_herring', 'conspiracy_hook', 'tampered'];

function deepScan(
  target: unknown,
  forbiddenKeys: Set<string>,
  forbiddenTexts: string[],
  forbiddenIds: string[] = [],
  path = '',
): string[] {
  const leaks: string[] = [];

  if (target === null || target === undefined) {
    return leaks;
  }

  if (typeof target === 'string') {
    for (const text of forbiddenTexts) {
      if (text.length > 5 && target.includes(text)) {
        leaks.push(`Forbidden text leak at ${path}: "${text}"`);
      }
    }
    for (const tag of INTERNAL_TAGS) {
      if (target === tag || target.includes(tag)) {
        leaks.push(`Internal tag leak at ${path}: "${tag}"`);
      }
    }
    return leaks;
  }

  if (typeof target === 'object') {
    if (Array.isArray(target)) {
      target.forEach((item, idx) => {
        leaks.push(
          ...deepScan(item, forbiddenKeys, forbiddenTexts, forbiddenIds, `${path}[${idx}]`),
        );
      });
    } else {
      const obj = target as Record<string, unknown>;

      // Check if locked clue leaks real id
      if (obj['locked'] === true && typeof obj['id'] === 'string') {
        if (!/^locked_\d+$/.test(obj['id'])) {
          leaks.push(`Locked clue has non-opaque id: "${obj['id']}" at path "${path}.id"`);
        }
        if (forbiddenIds.includes(obj['id'])) {
          leaks.push(`Locked clue leaks real id "${obj['id']}" at path "${path}.id"`);
        }
      }

      for (const [key, value] of Object.entries(target)) {
        if (forbiddenKeys.has(key)) {
          leaks.push(`Forbidden key leak: "${key}" at path "${path}.${key}"`);
        }
        leaks.push(
          ...deepScan(value, forbiddenKeys, forbiddenTexts, forbiddenIds, `${path}.${key}`),
        );
      }
    }
  }

  return leaks;
}

describe('Case 0003: Schema & Validation Suite', () => {
  const parsedCase = CaseDefinitionSchema.parse(case_0003_raw) as CaseDefinition;

  it('parses with CaseDefinitionSchema without throwing', () => {
    expect(parsedCase).toBeDefined();
    expect(parsedCase.id).toBe('case_0003');
    expect(parsedCase.mysteryType).toBe('hidden_identity');
    expect(parsedCase.difficulty).toBe(2);
    expect(parsedCase.kind).toBe('authored');
    expect(parsedCase.estimatedMinutes).toBeGreaterThanOrEqual(3);
    expect(parsedCase.estimatedMinutes).toBeLessThanOrEqual(6);
  });

  it('validates case with validateCase yielding zero errors', () => {
    const report = validateCase(parsedCase);
    if (report.warnings.length > 0) {
      console.warn('validateCase warnings for case_0003:', report.warnings);
    }
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('verifies measured difficulty is within ±1 of target difficulty 2', () => {
    const report = validateCase(parsedCase);
    expect(report.metrics).toBeDefined();
    const diff = Math.abs(report.metrics.measuredDifficulty - parsedCase.difficulty);
    expect(diff).toBeLessThanOrEqual(1);
  });

  it('ensures toPublicCase drops all forbidden keys, internal tags, and locked clue text', () => {
    const defaultClueIds = parsedCase.clues
      .filter((c) => c.unlock.kind === 'default')
      .map((c) => c.id);
    const lockedClues = parsedCase.clues.filter((c) => c.unlock.kind !== 'default');
    const lockedTexts = lockedClues.map((c) => c.text).filter((t): t is string => Boolean(t));
    const lockedRealIds = lockedClues.map((c) => c.id);

    const publicCase = toPublicCase(parsedCase, defaultClueIds);

    const leaks = deepScan(publicCase, FORBIDDEN_KEYS, lockedTexts, lockedRealIds);
    expect(leaks).toEqual([]);

    for (const clue of publicCase.clues) {
      if ('locked' in clue && clue.locked) {
        expect((clue as Record<string, unknown>)['text']).toBeUndefined();
      }
    }
  });

  it('survivingHypotheses with all obtainable clues === [solution]', () => {
    const ctx = buildContext(parsedCase);
    const allClueIds = parsedCase.clues.map((c) => c.id);
    const surviving = survivingHypotheses(parsedCase, allClueIds, ctx);

    expect(surviving).toHaveLength(1);
    expect(surviving[0]?.id).toBe(parsedCase.truth.solutionHypothesisId);
    expect(surviving[0]?.id).toBe('hyp_lucas_operative');
  });
});

describe('Case 0003: Solvability & Decisive Contradiction Verification', () => {
  const parsedCase = CaseDefinitionSchema.parse(case_0003_raw) as CaseDefinition;
  const ctx = buildContext(parsedCase);

  it('verifies all physical clue facts are entailed by truth.timeline', () => {
    const physicalClues = parsedCase.clues.filter((c) => c.reliability === 'physical');
    for (const clue of physicalClues) {
      for (const fact of clue.asserts) {
        expect(factEntailed(fact, parsedCase.truth.timeline, ctx)).toBe(true);
      }
    }
  });

  it('the presence.travel contradiction actually fires for the key link', () => {
    const lucasTestimony = parsedCase.clues.find((c) => c.id === 'clue_lucas_testimony')!;
    const stationCctv = parsedCase.clues.find((c) => c.id === 'clue_station_cctv')!;

    expect(lucasTestimony).toBeDefined();
    expect(stationCctv).toBeDefined();

    const lucasFact = lucasTestimony.asserts[0]!;
    const cctvFact = stationCctv.asserts[0]!;

    const result = contradicts(lucasFact, cctvFact, ctx);
    expect(result).not.toBeNull();
    expect(result?.ruleId).toBe('presence.travel');
    expect(result?.explanation).toContain('cannot travel between loc_hotel and loc_station');
  });

  it('eliminates decoy 1 (Irene at station) via access.presence with clue_hotel_keycard_log', () => {
    const hypIrene = parsedCase.hypotheses.find((h) => h.id === 'hyp_irene_operative')!;
    const keycardClue = parsedCase.clues.find((c) => c.id === 'clue_hotel_keycard_log')!;

    const result = evaluateHypothesis(hypIrene, [keycardClue], ctx);
    expect(result.eliminated).toBe(true);
    expect(result.by[0]?.ruleId).toBe('access.presence');
  });

  it('eliminates decoy 2 (Julian theft) via possess.exclusive with clue_hotel_custody_receipt', () => {
    const hypJulian = parsedCase.hypotheses.find((h) => h.id === 'hyp_julian_operative')!;
    const receiptClue = parsedCase.clues.find((c) => c.id === 'clue_hotel_custody_receipt')!;

    const result = evaluateHypothesis(hypJulian, [receiptClue], ctx);
    expect(result.eliminated).toBe(true);
    expect(result.by[0]?.ruleId).toBe('possess.exclusive');
  });

  it('verifies the solution hypothesis survives all physical clues', () => {
    const hypSolution = parsedCase.hypotheses.find((h) => h.id === 'hyp_lucas_operative')!;
    const physicalClues = parsedCase.clues.filter((c) => c.reliability === 'physical');

    const result = evaluateHypothesis(hypSolution, physicalClues, ctx);
    expect(result.eliminated).toBe(false);
  });

  it('verifies keyEvidence eliminates all decoys and isolates the solution', () => {
    const keySets = parsedCase.truth.keyEvidence;
    expect(keySets.length).toBeGreaterThanOrEqual(1);
    expect(keySets.length).toBeLessThanOrEqual(2);

    for (const set of keySets) {
      expect(set).toHaveLength(3);
      const surviving = survivingHypotheses(parsedCase, set, ctx);
      expect(surviving).toHaveLength(1);
      expect(surviving[0]?.id).toBe(parsedCase.truth.solutionHypothesisId);
    }
  });

  it('verifies Lucas Mercer is the sole declared liar and his lie contradicts timeline', () => {
    expect(parsedCase.truth.liars).toHaveLength(1);
    const liar = parsedCase.truth.liars[0]!;
    expect(liar.who).toBe('char_lucas');
    expect(liar.statementClueIds).toEqual(['clue_lucas_testimony']);

    const lucasTestimony = parsedCase.clues.find((c) => c.id === 'clue_lucas_testimony')!;
    const contradictsTimeline = lucasTestimony.asserts.some((fact) =>
      parsedCase.truth.timeline.some((t) => Boolean(contradicts(fact, t, ctx))),
    );
    expect(contradictsTimeline).toBe(true);
  });

  it('verifies Lucas Mercer lie is provably contradicted by obtainable physical clue (V14 fair play)', () => {
    const lucasTestimony = parsedCase.clues.find((c) => c.id === 'clue_lucas_testimony')!;
    const stationCctv = parsedCase.clues.find((c) => c.id === 'clue_station_cctv')!;

    expect(stationCctv.reliability).toBe('physical');

    let contradictionFound = false;
    for (const lieFact of lucasTestimony.asserts) {
      for (const physFact of stationCctv.asserts) {
        const contra = contradicts(lieFact, physFact, ctx);
        if (contra) {
          contradictionFound = true;
          expect(contra.ruleId).toBe('presence.travel');
        }
      }
    }
    expect(contradictionFound).toBe(true);
  });

  it('verifies keyEvidence contains physical clue with culprit ID (V15 positive evidence)', () => {
    const culpritIds = new Set(parsedCase.truth.culpritIds);
    const keySets = parsedCase.truth.keyEvidence;

    const hasCulpritPhysicalClue = keySets.some((set) =>
      set.some((clueId) => {
        const clue = parsedCase.clues.find((c) => c.id === clueId);
        if (!clue || clue.reliability !== 'physical') return false;
        return clue.asserts.some((f) => {
          if ('who' in f && typeof f.who === 'string' && culpritIds.has(f.who)) return true;
          if ('by' in f && typeof f.by === 'string' && culpritIds.has(f.by)) return true;
          if ('sender' in f && typeof f.sender === 'string' && culpritIds.has(f.sender)) return true;
          if ('recipient' in f && typeof f.recipient === 'string' && culpritIds.has(f.recipient)) return true;
          return false;
        });
      }),
    );

    expect(hasCulpritPhysicalClue).toBe(true);
  });
});
