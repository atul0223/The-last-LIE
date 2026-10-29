import type { Fact } from '../schema/index.js';
import type { LogicContext } from './context.js';
import { intervalContains, intervalsOverlap } from './intervals.js';

export interface Contradiction {
  ruleId: string;
  explanation: string;
}

/**
 * Returns a stable ordering of two facts so that `contradicts(a, b)` and
 * `contradicts(b, a)` are evaluated in identical order, ensuring strict symmetry.
 */
function canonicalOrder(a: Fact, b: Fact): [Fact, Fact] {
  if (a.kind !== b.kind) {
    return a.kind < b.kind ? [a, b] : [b, a];
  }
  const strA = JSON.stringify(a);
  const strB = JSON.stringify(b);
  return strA <= strB ? [a, b] : [b, a];
}

/**
 * Evaluates whether two facts contradict each other under the static world context.
 *
 * Implements all rules in SYSTEM_DESIGN §4.1:
 * - presence.two_places
 * - presence.absent_action
 * - message.sender_device
 * - message.time
 * - access.presence
 * - possess.exclusive
 * - state.value
 * - presence.travel
 */
function evaluateContradiction(first: Fact, second: Fact, ctx: LogicContext): Contradiction | null {
  // 1. presence.two_places: at vs at (same who, different locations, overlapping intervals)
  if (first.kind === 'at' && second.kind === 'at') {
    if (
      first.who === second.who &&
      first.where !== second.where &&
      intervalsOverlap(first.from, first.to, second.from, second.to)
    ) {
      return {
        ruleId: 'presence.two_places',
        explanation: `${first.who} cannot be at ${first.where} [${first.from}, ${first.to}) and ${second.where} [${second.from}, ${second.to}) simultaneously.`,
      };
    }
  }

  // 2. presence.absent_action: action vs at (same who, action at location L, but at L2 covering t)
  const actionFact = first.kind === 'action' ? first : second.kind === 'action' ? second : null;
  const atFact = first.kind === 'at' ? first : second.kind === 'at' ? second : null;

  if (actionFact && atFact) {
    if (
      actionFact.who === atFact.who &&
      actionFact.where &&
      actionFact.where !== atFact.where &&
      intervalContains(atFact.from, atFact.to, actionFact.at)
    ) {
      return {
        ruleId: 'presence.absent_action',
        explanation: `${actionFact.who} cannot perform action at ${actionFact.where} at ${actionFact.at} while present at ${atFact.where} [${atFact.from}, ${atFact.to}).`,
      };
    }
  }

  // 3. message.sender_device: message vs device_use (device used by y at time t while message sent by x)
  const messageFact = first.kind === 'message' ? first : second.kind === 'message' ? second : null;
  const deviceUseFact =
    first.kind === 'device_use' ? first : second.kind === 'device_use' ? second : null;

  if (messageFact && deviceUseFact) {
    if (
      messageFact.device === deviceUseFact.device &&
      messageFact.sender !== deviceUseFact.by &&
      messageFact.sentAt === deviceUseFact.at
    ) {
      return {
        ruleId: 'message.sender_device',
        explanation: `Message ${messageFact.msg} claims sender ${messageFact.sender} used device ${messageFact.device} at ${messageFact.sentAt}, but device was used by ${deviceUseFact.by} at that time.`,
      };
    }
  }

  // 4. message.time: message vs message (same msg, different sentAt)
  if (first.kind === 'message' && second.kind === 'message') {
    if (first.msg === second.msg && first.sentAt !== second.sentAt) {
      return {
        ruleId: 'message.time',
        explanation: `Message ${first.msg} has conflicting sent times: ${first.sentAt} vs ${second.sentAt}.`,
      };
    }
  }

  // 5. access.presence: access vs at (access door of location L while at location L2 covering t)
  const accessFact = first.kind === 'access' ? first : second.kind === 'access' ? second : null;
  if (accessFact && atFact) {
    const doorLocation = ctx.doorLocations[accessFact.door];
    if (
      doorLocation &&
      accessFact.who === atFact.who &&
      doorLocation !== atFact.where &&
      intervalContains(atFact.from, atFact.to, accessFact.at)
    ) {
      return {
        ruleId: 'access.presence',
        explanation: `${accessFact.who} accessed door ${accessFact.door} (${doorLocation}) at ${accessFact.at} while present at ${atFact.where} [${atFact.from}, ${atFact.to}).`,
      };
    }
  }

  // 6. possess.exclusive: possess vs possess (same what, different who, overlapping intervals)
  if (first.kind === 'possess' && second.kind === 'possess') {
    if (
      first.what === second.what &&
      first.who !== second.who &&
      intervalsOverlap(first.from, first.to, second.from, second.to)
    ) {
      return {
        ruleId: 'possess.exclusive',
        explanation: `Object ${first.what} cannot be possessed by ${first.who} [${first.from}, ${first.to}) and ${second.who} [${second.from}, ${second.to}) simultaneously.`,
      };
    }
  }

  // 7. state.value: state vs state (same what, same property, same at, different value)
  if (first.kind === 'state' && second.kind === 'state') {
    if (
      first.what === second.what &&
      first.property === second.property &&
      first.at === second.at &&
      first.value !== second.value
    ) {
      return {
        ruleId: 'state.value',
        explanation: `${first.what}.${first.property} cannot have both '${first.value}' and '${second.value}' at ${first.at}.`,
      };
    }
  }

  // 8. presence.travel: insufficient travel time between different locations for the same person
  const travelContradiction = checkTravelContradiction(first, second, ctx);
  if (travelContradiction) {
    return travelContradiction;
  }

  return null;
}

interface LocationTimePoint {
  who: string;
  location: string;
  timeRange: [number, number]; // [start, end)
}

function extractLocationTimePoint(fact: Fact, ctx: LogicContext): LocationTimePoint | null {
  if (fact.kind === 'at') {
    return {
      who: fact.who,
      location: fact.where,
      timeRange: [fact.from, fact.to],
    };
  }
  if (fact.kind === 'action' && fact.where) {
    return {
      who: fact.who,
      location: fact.where,
      timeRange: [fact.at, fact.at],
    };
  }
  if (fact.kind === 'access') {
    const loc = ctx.doorLocations[fact.door];
    if (loc) {
      return {
        who: fact.who,
        location: loc,
        timeRange: [fact.at, fact.at],
      };
    }
  }
  return null;
}

function checkTravelContradiction(
  first: Fact,
  second: Fact,
  ctx: LogicContext,
): Contradiction | null {
  const p1 = extractLocationTimePoint(first, ctx);
  const p2 = extractLocationTimePoint(second, ctx);

  if (!p1 || !p2) {
    return null;
  }
  if (p1.who !== p2.who || p1.location === p2.location) {
    return null;
  }

  const travelTime = ctx.getTravelTime(p1.location, p2.location);
  if (travelTime === null || travelTime <= 0) {
    return null;
  }

  // Calculate the gap between the two presences
  // If p1 is before p2: p1 ends at p1.timeRange[1], p2 starts at p2.timeRange[0]
  // If p2 is before p1: p2 ends at p2.timeRange[1], p1 starts at p1.timeRange[0]
  let gap: number | null = null;
  if (p1.timeRange[1] <= p2.timeRange[0]) {
    gap = p2.timeRange[0] - p1.timeRange[1];
  } else if (p2.timeRange[1] <= p1.timeRange[0]) {
    gap = p1.timeRange[0] - p2.timeRange[1];
  } else {
    // Overlapping intervals - already handled by presence.two_places or absent_action
    return null;
  }

  if (gap < travelTime) {
    return {
      ruleId: 'presence.travel',
      explanation: `${p1.who} cannot travel between ${p1.location} and ${p2.location} (requires ${travelTime} min) in ${gap} min.`,
    };
  }

  return null;
}

/**
 * Pure and symmetric contradiction checker.
 * Returns { ruleId, explanation } if facts a and b conflict, or null otherwise.
 */
export function contradicts(a: Fact, b: Fact, ctx: LogicContext): Contradiction | null {
  const [first, second] = canonicalOrder(a, b);
  return evaluateContradiction(first, second, ctx);
}
