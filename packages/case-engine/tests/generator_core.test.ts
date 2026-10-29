import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  deriveClueFromFact,
  generateCase,
  injectRedHerrings,
  perturbClaim,
  tpl_toy_two_rooms,
  GenerationError,
  DEFAULT_POOLS,
  type CaseTemplate,
} from '../src/index.js';
import { createRng } from '../src/rng.js';

describe('Case Engine Default Pools Validation', () => {
  it('validates default pools data integrity', () => {
    expect(DEFAULT_POOLS.names.firstNames.length).toBeGreaterThanOrEqual(60);
    expect(DEFAULT_POOLS.names.surnames.length).toBeGreaterThanOrEqual(60);
    expect(DEFAULT_POOLS.locations.length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_POOLS.objects.length).toBeGreaterThanOrEqual(4);
    expect(DEFAULT_POOLS.motives.length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_POOLS.relations.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Generator Shared Helpers', () => {
  const rng = createRng(42);

  it('perturbClaim time shifts an at fact without mutating original', () => {
    const original = {
      kind: 'at' as const,
      who: 'char_alice',
      where: 'loc_office',
      from: 1200,
      to: 1230,
    };

    const perturbed = perturbClaim(
      original,
      { strategy: 'time_shift', timeShiftMinutes: 20 },
      rng,
    );

    expect(perturbed.kind).toBe('at');
    if (perturbed.kind === 'at') {
      expect(perturbed.from).toBe(1220);
      expect(perturbed.to).toBe(1250);
      expect(perturbed.where).toBe('loc_office');
    }
    // Immutability
    expect(original.from).toBe(1200);
    expect(original.to).toBe(1230);
  });

  it('perturbClaim place swaps an at fact when alternate locations are provided', () => {
    const original = {
      kind: 'at' as const,
      who: 'char_alice',
      where: 'loc_office',
      from: 1200,
      to: 1230,
    };

    const perturbed = perturbClaim(
      original,
      { strategy: 'place_swap', alternateLocations: ['loc_dock', 'loc_vault'] },
      rng,
    );

    expect(perturbed.kind).toBe('at');
    if (perturbed.kind === 'at') {
      expect(['loc_dock', 'loc_vault']).toContain(perturbed.where);
      expect(perturbed.from).toBe(1200);
    }
  });

  it('perturbClaim modifies state value', () => {
    const original = {
      kind: 'state' as const,
      what: 'obj_press',
      property: 'status',
      value: 'original',
      at: 1200,
    };

    const perturbed = perturbClaim(
      original,
      { alternateValues: ['altered', 'counterfeit'] },
      rng,
    );

    expect(perturbed.kind).toBe('state');
    if (perturbed.kind === 'state') {
      expect(['altered', 'counterfeit']).toContain(perturbed.value);
    }
  });

  it('deriveClueFromFact builds a valid Clue', () => {
    const fact = {
      kind: 'at' as const,
      who: 'char_bob',
      where: 'loc_station',
      from: 1300,
      to: 1315,
    };

    const clue = deriveClueFromFact(fact, {
      id: 'clue_test_bob',
      type: 'cctv',
      reliability: 'physical',
      source: 'loc_station',
      tags: ['security'],
    });

    expect(clue.id).toBe('clue_test_bob');
    expect(clue.type).toBe('cctv');
    expect(clue.reliability).toBe('physical');
    expect(clue.asserts).toEqual([fact]);
    expect(clue.tags).toEqual(['security']);
  });

  it('perturbClaim handles action, access, and copy fallback', () => {
    const actionFact = {
      kind: 'action' as const,
      who: 'char_agent',
      verb: 'took' as const,
      target: 'obj_item',
      at: 1200,
      where: 'loc_vault',
    };
    const perturbedAction = perturbClaim(
      actionFact,
      { strategy: 'place_swap', alternateLocations: ['loc_dock'] },
      rng,
    );
    expect(perturbedAction.kind).toBe('action');
    if (perturbedAction.kind === 'action') {
      expect(perturbedAction.where).toBe('loc_dock');
    }

    const accessFact = {
      kind: 'access' as const,
      who: 'char_agent',
      door: 'door_a',
      at: 1200,
    };
    const perturbedAccess = perturbClaim(
      accessFact,
      { alternateDoors: ['door_b'] },
      rng,
    );
    expect(perturbedAccess.kind).toBe('access');

    const relationFact = {
      kind: 'relation' as const,
      a: 'char_alice',
      b: 'char_bob',
      rel: 'colleague',
    };
    const copyRelation = perturbClaim(relationFact, {}, rng);
    expect(copyRelation).toEqual(relationFact);
  });

  it('deriveClueFromFact handles minimal and single fact options', () => {
    const fact = {
      kind: 'access' as const,
      who: 'char_carol',
      door: 'door_c',
      at: 1230,
    };
    const clue = deriveClueFromFact(fact, {
      id: 'clue_min',
      type: 'access_log',
      reliability: 'physical',
      text: 'Sample text',
    });
    expect(clue.id).toBe('clue_min');
    expect(clue.unlock).toEqual({ kind: 'default' });
    expect(clue.text).toBe('Sample text');
    expect(clue.source).toBeUndefined();
  });

  it('injectRedHerrings returns original when count is zero or negative', () => {
    const original = [
      {
        id: 'clue_1',
        type: 'testimony' as const,
        reliability: 'testimony' as const,
        asserts: [],
        unlock: { kind: 'default' as const },
      },
    ];
    expect(injectRedHerrings(original, [], 0, rng)).toEqual(original);
  });
});

describe('Pipeline & Toy Template Validation', () => {
  it('generates a valid case with attempts = 1 on clean seed', () => {
    const result = generateCase({
      templateId: 'tpl_toy_two_rooms',
      seed: 12345,
      difficulty: 1,
    });

    expect(result.attempts).toBe(1);
    expect(result.report.ok).toBe(true);
    expect(result.report.errors).toHaveLength(0);
    expect(result.case.truth.solutionHypothesisId).toBe('hyp_culprit_stole');
  });

  it('proves strict determinism: same seed produces identical case JSON', () => {
    const resA = generateCase({
      templateId: 'tpl_toy_two_rooms',
      seed: 8888,
      difficulty: 1,
    });

    const resB = generateCase({
      templateId: 'tpl_toy_two_rooms',
      seed: 8888,
      difficulty: 1,
    });

    expect(JSON.stringify(resA.case)).toBe(JSON.stringify(resB.case));
  });

  it('exercises retry loop when an attempt fails validation and succeeds on seed+1', () => {
    let callCount = 0;

    const mockTemplate: CaseTemplate = {
      id: 'tpl_mock_retry',
      mysteryType: 'missing_item',
      difficultyRange: [1, 2],
      slots: [...tpl_toy_two_rooms.slots],
      build(rng, slots, params) {
        callCount++;
        const baseCase = tpl_toy_two_rooms.build(rng, slots, params);
        if (callCount === 1) {
          // Break the case on attempt 1 by pointing to a non-existent hypothesis
          return {
            ...baseCase,
            truth: {
              ...baseCase.truth,
              solutionHypothesisId: 'hyp_nonexistent_id',
            },
          };
        }
        return baseCase;
      },
    };

    const result = generateCase({
      templateId: 'tpl_mock_retry',
      seed: 500,
      difficulty: 1,
      templates: [mockTemplate],
    });

    expect(result.attempts).toBe(2);
    expect(result.report.ok).toBe(true);
  });

  it('throws typed GenerationError when maxAttempts is exceeded', () => {
    const failingTemplate: CaseTemplate = {
      id: 'tpl_failing',
      mysteryType: 'missing_item',
      difficultyRange: [1, 2],
      slots: [...tpl_toy_two_rooms.slots],
      build(rng, slots, params) {
        const baseCase = tpl_toy_two_rooms.build(rng, slots, params);
        return {
          ...baseCase,
          truth: {
            ...baseCase.truth,
            solutionHypothesisId: 'hyp_invalid',
          },
        };
      },
    };

    expect(() =>
      generateCase({
        templateId: 'tpl_failing',
        seed: 100,
        difficulty: 1,
        maxAttempts: 3,
        templates: [failingTemplate],
      }),
    ).toThrow(GenerationError);
  });

  it('fast-check: passes validator across 1,000 seeds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000000 }), (seed) => {
        const result = generateCase({
          templateId: 'tpl_toy_two_rooms',
          seed,
          difficulty: 1,
        });

        expect(result.report.ok).toBe(true);
        expect(result.report.errors).toHaveLength(0);
      }),
      { numRuns: 1000 },
    );
  }, 60000); // 60s timeout for 1000 runs
});
