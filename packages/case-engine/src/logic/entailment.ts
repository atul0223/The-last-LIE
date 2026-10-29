import type { Fact } from '../schema/index.js';
import type { LogicContext } from './context.js';

/**
 * Returns true if two facts are deeply equal in their properties.
 */
function factsEqual(a: Fact, b: Fact): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Explicit Implication Rules:
 *
 * Rule 1: Exact Identity
 * Any fact that directly exists in the timeline is entailed.
 *
 * Rule 2: Presence Sub-interval
 * `at(who, where, from, to)` is entailed if a timeline fact establishes `who` was at `where`
 * over an enclosing interval `[fromT, toT)` such that `fromT <= from` and `to <= toT`.
 *
 * Rule 3: Possession Sub-interval
 * `possess(who, what, from, to)` is entailed if a timeline fact establishes `who` had `what`
 * over an enclosing interval `[fromT, toT)` such that `fromT <= from` and `to <= toT`.
 *
 * Rule 4: Instantaneous Presence via Action
 * An instantaneous presence fact `at(who, where, t, t)` is entailed if the timeline records
 * an `action` by `who` at `where` at time `t`.
 *
 * Rule 5: Instantaneous Presence via Door Access
 * An instantaneous presence fact `at(who, where, t, t)` is entailed if the timeline records
 * `access` by `who` at door `D` at time `t`, where door `D` connects to `where`.
 *
 * Rule 6: Device Use via Sent Message
 * A `device_use(device, by, at)` fact is entailed if the timeline records a `message` sent
 * by `by` using `device` at `at`.
 *
 * Rule 7: Symmetric Relationship
 * `relation(a, b, rel)` is entailed if timeline records `relation(a, b, rel)` or `relation(b, a, rel)`.
 */
export function factEntailed(fact: Fact, timeline: Fact[], ctx: LogicContext): boolean {
  for (const t of timeline) {
    // Rule 1: Exact match
    if (factsEqual(fact, t)) {
      return true;
    }

    // Rule 2: Sub-interval of `at`
    if (fact.kind === 'at' && t.kind === 'at') {
      if (fact.who === t.who && fact.where === t.where) {
        if (t.from <= fact.from && fact.to <= t.to) {
          return true;
        }
      }
    }

    // Rule 3: Sub-interval of `possess`
    if (fact.kind === 'possess' && t.kind === 'possess') {
      if (fact.who === t.who && fact.what === t.what) {
        if (t.from <= fact.from && fact.to <= t.to) {
          return true;
        }
      }
    }

    // Rule 4: Instantaneous presence via action
    if (fact.kind === 'at' && fact.from === fact.to && t.kind === 'action') {
      if (fact.who === t.who && t.where && fact.where === t.where && t.at === fact.from) {
        return true;
      }
    }

    // Rule 5: Instantaneous presence via door access
    if (fact.kind === 'at' && fact.from === fact.to && t.kind === 'access') {
      const doorLoc = ctx.doorLocations[t.door];
      if (fact.who === t.who && doorLoc === fact.where && t.at === fact.from) {
        return true;
      }
    }

    // Rule 6: Device use via sent message
    if (fact.kind === 'device_use' && t.kind === 'message') {
      if (fact.device === t.device && t.sender && fact.by === t.sender && fact.at === t.sentAt) {
        return true;
      }
    }

    // Rule 7: Symmetric relationship
    if (fact.kind === 'relation' && t.kind === 'relation') {
      if (
        fact.rel === t.rel &&
        ((fact.a === t.a && fact.b === t.b) || (fact.a === t.b && fact.b === t.a))
      ) {
        return true;
      }
    }
  }

  return false;
}
