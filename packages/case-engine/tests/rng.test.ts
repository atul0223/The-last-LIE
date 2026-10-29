import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createRng } from '../src/rng.js';

describe('WP-30 PRNG (sfc32 + cyrb128)', () => {
  it('determinism: same seed gives identical sequences across 100 seeds', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const rng1 = createRng(seed);
      const rng2 = createRng(seed);

      const seq1 = Array.from({ length: 50 }, () => rng1.next());
      const seq2 = Array.from({ length: 50 }, () => rng2.next());

      expect(seq1).toEqual(seq2);

      const ints1 = Array.from({ length: 20 }, () => rng1.int(1, 100));
      const ints2 = Array.from({ length: 20 }, () => rng2.int(1, 100));
      expect(ints1).toEqual(ints2);
    }
  });

  it('handles string seeds with full reproducibility', () => {
    const rng1 = createRng('vesper-city-seed-alpha');
    const rng2 = createRng('vesper-city-seed-alpha');

    expect(Array.from({ length: 20 }, () => rng1.next())).toEqual(
      Array.from({ length: 20 }, () => rng2.next()),
    );
  });

  it('fork creates independent deterministic sub-streams (fork("a") !== fork("b")) and is reproducible', () => {
    const parent1 = createRng(42);
    const forkA1 = parent1.fork('substream-a');
    const forkB1 = parent1.fork('substream-b');

    const parent2 = createRng(42);
    const forkA2 = parent2.fork('substream-a');
    const forkB2 = parent2.fork('substream-b');

    // Reproducibility across identical parent seeds and fork sequences
    const seqA1 = Array.from({ length: 20 }, () => forkA1.next());
    const seqA2 = Array.from({ length: 20 }, () => forkA2.next());
    expect(seqA1).toEqual(seqA2);

    const seqB1 = Array.from({ length: 20 }, () => forkB1.next());
    const seqB2 = Array.from({ length: 20 }, () => forkB2.next());
    expect(seqB1).toEqual(seqB2);

    // Independence between fork("a") and fork("b")
    expect(seqA1).not.toEqual(seqB1);
  });

  it('shuffle does not mutate the input array and preserves elements', () => {
    const rng = createRng(12345);
    const original = Object.freeze([10, 20, 30, 40, 50, 60, 70, 80, 90]);
    const shuffled = rng.shuffle(original);

    // Input array is not mutated
    expect(original).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
    // Returned array is a new reference
    expect(shuffled).not.toBe(original);
    // Preserves all elements
    expect([...shuffled].sort((a, b) => a - b)).toEqual([...original].sort((a, b) => a - b));
  });

  it('pick selects valid elements and throws on empty arrays', () => {
    const rng = createRng(999);
    const items = ['apple', 'banana', 'cherry'];
    for (let i = 0; i < 30; i++) {
      expect(items).toContain(rng.pick(items));
    }

    expect(() => rng.pick([])).toThrowError(/Cannot pick from empty array/);
  });

  it('weighted selects items proportional to weight and validates inputs', () => {
    const rng = createRng(777);

    // Support both object { item, weight } and tuple [item, weight]
    const objectList = [
      { item: 'rare', weight: 1 },
      { item: 'common', weight: 99 },
    ];
    const tupleList: readonly [string, number][] = [
      ['rare', 1],
      ['common', 99],
    ];

    let commonCountObj = 0;
    let commonCountTuple = 0;
    for (let i = 0; i < 100; i++) {
      if (rng.weighted(objectList) === 'common') commonCountObj++;
      if (rng.weighted(tupleList) === 'common') commonCountTuple++;
    }

    expect(commonCountObj).toBeGreaterThan(80);
    expect(commonCountTuple).toBeGreaterThan(80);

    // Test edge fallback for weighted roll
    const single = [{ item: 'sole', weight: 1 }];
    expect(rng.weighted(single)).toBe('sole');

    // Test edge case where roll reaches total weight
    const mockRng = {
      ...createRng(1),
      next: () => 0.999999999999999,
    };
    expect(mockRng.weighted(objectList)).toBe('common');
    expect(() => rng.weighted([{ item: 'bad', weight: -5 }])).toThrowError(/Invalid weight/);
    expect(() => rng.weighted([{ item: 'zero', weight: 0 }])).toThrowError(/Total weight must be positive/);
  });

  it('int bounds validation throws on invalid ranges', () => {
    const rng = createRng(1);
    expect(() => rng.int(10, 5)).toThrowError(/Invalid range/);
    expect(() => rng.int(1.5, 5)).toThrowError(/Invalid range/);
    expect(() => rng.int(1, 5.5)).toThrowError(/Invalid range/);
  });

  describe('Property-Based Invariants (fast-check)', () => {
    it('int bounds are strictly respected for all integer ranges [min, max]', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10000, max: 10000 }),
          fc.integer({ min: -10000, max: 10000 }),
          fc.integer({ min: 0, max: 1000000 }),
          (a, b, seed) => {
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            const rng = createRng(seed);

            for (let i = 0; i < 10; i++) {
              const val = rng.int(min, max);
              expect(Number.isInteger(val)).toBe(true);
              expect(val).toBeGreaterThanOrEqual(min);
              expect(val).toBeLessThanOrEqual(max);
            }
          },
        ),
      );
    });

    it('next always produces numbers in [0, 1)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100000 }), (seed) => {
          const rng = createRng(seed);
          for (let i = 0; i < 20; i++) {
            const val = rng.next();
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThan(1);
          }
        }),
      );
    });
  });
});
