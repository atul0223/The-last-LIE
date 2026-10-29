import type { Clue, Fact } from '../../schema/index.js';
import type { Rng } from '../../rng.js';

export interface PerturbOptions {
  strategy?: 'place_swap' | 'time_shift' | 'auto';
  alternateLocations?: string[];
  timeShiftMinutes?: number;
  alternateValues?: string[];
  alternateDoors?: string[];
}

/**
 * Perturbs a fact (time shift, place swap, or value change) to construct plausible
 * decoy claims or declared lies that contradict timeline facts.
 * Pure function: never mutates the input fact.
 */
export function perturbClaim(fact: Fact, options: PerturbOptions, rng: Rng): Fact {
  const strategy =
    options.strategy ?? (options.alternateLocations && options.alternateLocations.length > 0 ? 'auto' : 'time_shift');

  const timeShift = options.timeShiftMinutes ?? (rng.next() < 0.5 ? -15 : 15);

  if (fact.kind === 'at') {
    const shouldSwapPlace =
      (strategy === 'place_swap' || (strategy === 'auto' && rng.next() < 0.5)) &&
      options.alternateLocations &&
      options.alternateLocations.length > 0;

    if (shouldSwapPlace) {
      const candidates = options.alternateLocations!.filter((loc) => loc !== fact.where);
      const newWhere = candidates.length > 0 ? rng.pick(candidates) : fact.where;
      return {
        ...fact,
        where: newWhere,
      };
    }

    // Otherwise time shift
    const newFrom = Math.max(0, fact.from + timeShift);
    const newTo = Math.max(newFrom, fact.to + timeShift);
    return {
      ...fact,
      from: newFrom,
      to: newTo,
    };
  }

  if (fact.kind === 'action') {
    const shouldSwapPlace =
      (strategy === 'place_swap' || (strategy === 'auto' && rng.next() < 0.5)) &&
      options.alternateLocations &&
      options.alternateLocations.length > 0 &&
      fact.where;

    if (shouldSwapPlace) {
      const candidates = options.alternateLocations!.filter((loc) => loc !== fact.where);
      const newWhere = candidates.length > 0 ? rng.pick(candidates) : fact.where;
      return {
        ...fact,
        where: newWhere,
      };
    }

    const newAt = Math.max(0, fact.at + timeShift);
    return {
      ...fact,
      at: newAt,
    };
  }

  if (fact.kind === 'possess') {
    const newFrom = Math.max(0, fact.from + timeShift);
    const newTo = Math.max(newFrom, fact.to + timeShift);
    return {
      ...fact,
      from: newFrom,
      to: newTo,
    };
  }

  if (fact.kind === 'access') {
    const shouldSwapDoor =
      options.alternateDoors && options.alternateDoors.length > 0 && rng.next() < 0.5;
    if (shouldSwapDoor) {
      const candidates = options.alternateDoors!.filter((d) => d !== fact.door);
      const newDoor = candidates.length > 0 ? rng.pick(candidates) : fact.door;
      return {
        ...fact,
        door: newDoor,
      };
    }
    const newAt = Math.max(0, fact.at + timeShift);
    return {
      ...fact,
      at: newAt,
    };
  }

  if (fact.kind === 'state') {
    if (options.alternateValues && options.alternateValues.length > 0) {
      const candidates = options.alternateValues.filter((v) => v !== fact.value);
      const newValue = candidates.length > 0 ? rng.pick(candidates) : `alt_${fact.value}`;
      return {
        ...fact,
        value: newValue,
      };
    }
    return {
      ...fact,
      value: `altered_${fact.value}`,
    };
  }

  // Fallback: return copy
  return { ...fact };
}

export interface DeriveClueOptions {
  id: string;
  type: Clue['type'];
  reliability: Clue['reliability'];
  source?: string;
  unlock?: Clue['unlock'];
  tags?: string[];
  text?: string;
}

/**
 * Derives a structured Clue from an asserted fact or list of facts.
 */
export function deriveClueFromFact(
  factOrFacts: Fact | Fact[],
  options: DeriveClueOptions,
): Clue {
  const asserts = Array.isArray(factOrFacts) ? factOrFacts : [factOrFacts];

  const clue: Clue = {
    id: options.id,
    type: options.type,
    reliability: options.reliability,
    asserts,
    unlock: options.unlock ?? { kind: 'default' },
  };

  if (options.source) {
    clue.source = options.source;
  }
  if (options.tags && options.tags.length > 0) {
    clue.tags = [...options.tags];
  }
  if (options.text) {
    clue.text = options.text;
  }

  return clue;
}

/**
 * Injects true background physical facts entailed by the timeline that serve as
 * plausible red herrings (distracting facts that do not eliminate any hypotheses).
 */
export function injectRedHerrings(
  existingClues: Clue[],
  timeline: Fact[],
  count: number,
  rng: Rng,
  options?: { idPrefix?: string },
): Clue[] {
  if (count <= 0) {
    return [...existingClues];
  }

  const prefix = options?.idPrefix ?? 'clue_redherring_';
  const existingAsserts = new Set(
    existingClues.flatMap((c) => c.asserts.map((f) => JSON.stringify(f))),
  );

  // Find candidate timeline facts suitable for red herrings (access, at, or device_use)
  const candidateFacts = timeline.filter(
    (f) =>
      (f.kind === 'access' || f.kind === 'at' || f.kind === 'device_use') &&
      !existingAsserts.has(JSON.stringify(f)),
  );

  const chosenFacts = rng.shuffle(candidateFacts).slice(0, count);
  const newClues: Clue[] = [...existingClues];

  chosenFacts.forEach((fact, idx) => {
    let clueType: Clue['type'] = 'access_log';
    if (fact.kind === 'device_use') {
      clueType = 'device_log';
    } else if (fact.kind === 'at') {
      clueType = 'cctv';
    }

    newClues.push({
      id: `${prefix}${idx + 1}`,
      type: clueType,
      reliability: 'physical',
      asserts: [fact],
      unlock: { kind: 'default' },
      tags: ['red_herring'],
    });
  });

  return newClues;
}
