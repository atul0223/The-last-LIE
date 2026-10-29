/**
 * Seeded Pseudo-Random Number Generator (PRNG) implementation using sfc32.
 * Based on Chris Doty-Humphrey's Small Fast Chaotic PRNG with cyrb128 state initialization.
 * Pure and deterministic.
 */

export interface WeightedEntry<T> {
  item: T;
  weight: number;
}

export interface Rng {
  /**
   * Generates a floating point number in [0, 1).
   */
  next(): number;

  /**
   * Generates an integer in [min, max] inclusive.
   * Throws if min > max or if bounds are not integers.
   */
  int(min: number, max: number): number;

  /**
   * Returns a random element from the non-empty array.
   * Throws if the array is empty.
   */
  pick<T>(arr: readonly T[]): T;

  /**
   * Returns a newly shuffled array using the Fisher-Yates algorithm.
   * Never mutates the input array.
   */
  shuffle<T>(arr: readonly T[]): T[];

  /**
   * Selects an item from a list of weighted options.
   * Supports either `{ item: T, weight: number }` or `[T, number]` tuples.
   * Throws if items is empty, weights are negative, or total weight <= 0.
   */
  weighted<T>(items: readonly (WeightedEntry<T> | readonly [T, number])[]): T;

  /**
   * Spawns an independent, deterministic sub-stream derived from the parent state and label.
   */
  fork(label: string): Rng;
}

/**
 * cyrb128 string hash function producing 4 32-bit unsigned integers.
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
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

/**
 * Creates an sfc32 generator function from 4 32-bit seeds.
 */
function createSfc32(a: number, b: number, c: number, d: number): () => number {
  let sa = a >>> 0;
  let sb = b >>> 0;
  let sc = c >>> 0;
  let sd = d >>> 0;

  return function next(): number {
    const t = (((sa + sb) | 0) + sd) | 0;
    sd = (sd + 1) | 0;
    sa = sb ^ (sb >>> 9);
    sb = (sc + (sc << 3)) | 0;
    sc = (sc << 21) | (sc >>> 11);
    sc = (sc + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Creates a seeded deterministic PRNG.
 * @param seed - Number or string seed.
 */
export function createRng(seed: number | string = 0): Rng {
  const seedString = typeof seed === 'number' ? `num:${seed}` : `str:${seed}`;
  const [s0, s1, s2, s3] = cyrb128(seedString);
  const generator = createSfc32(s0, s1, s2, s3);

  // Warm-up rounds to disperse seed bits
  for (let i = 0; i < 15; i++) {
    generator();
  }

  const rng: Rng = {
    next(): number {
      return generator();
    },

    int(min: number, max: number): number {
      if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
        throw new Error(`Invalid range [${min}, ${max}]: min must be <= max and both must be integers`);
      }
      const range = max - min + 1;
      return Math.floor(generator() * range) + min;
    },

    pick<T>(arr: readonly T[]): T {
      if (arr.length === 0) {
        throw new Error('Cannot pick from empty array');
      }
      const index = Math.floor(generator() * arr.length);
      return arr[index]!;
    },

    shuffle<T>(arr: readonly T[]): T[] {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(generator() * (i + 1));
        const temp = copy[i]!;
        copy[i] = copy[j]!;
        copy[j] = temp;
      }
      return copy;
    },

    weighted<T>(items: readonly (WeightedEntry<T> | readonly [T, number])[]): T {
      if (items.length === 0) {
        throw new Error('Cannot pick from empty weighted list');
      }

      let totalWeight = 0;
      const parsed: { item: T; weight: number }[] = [];

      for (const entry of items) {
        let item: T;
        let weight: number;
        if (Array.isArray(entry)) {
          item = entry[0] as T;
          weight = entry[1] as number;
        } else {
          item = (entry as WeightedEntry<T>).item;
          weight = (entry as WeightedEntry<T>).weight;
        }

        if (typeof weight !== 'number' || Number.isNaN(weight) || weight < 0) {
          throw new Error(`Invalid weight ${weight}: weights must be non-negative numbers`);
        }

        parsed.push({ item, weight });
        totalWeight += weight;
      }

      if (totalWeight <= 0) {
        throw new Error(`Total weight must be positive, got ${totalWeight}`);
      }

      let roll = generator() * totalWeight;
      for (const entry of parsed) {
        if (roll < entry.weight) {
          return entry.item;
        }
        roll -= entry.weight;
      }

      return parsed[parsed.length - 1]!.item;
    },

    fork(label: string): Rng {
      // Draw deterministic state from the parent generator to combine with the label
      const sample = Math.floor(generator() * 4294967296);
      return createRng(`fork:${label}:${sample}`);
    },
  };

  return rng;
}
