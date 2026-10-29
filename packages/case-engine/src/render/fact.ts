import type { Fact } from '../schema/fact.js';
import { fromTime } from '../schema/time.js';
import type { Rng } from '../rng.js';
import type { RenderWorld } from './types.js';

/**
 * Renders a single structured Fact into a human-readable prose sentence.
 * Guarantees ≥2 phrasing variants per fact kind, selected deterministically by the provided rng.
 * Formats all timestamps in 24h HH:MM format using fromTime.
 * Never outputs raw IDs, "undefined", or "NaN".
 */
export function renderFact(fact: Fact, world: RenderWorld, rng: Rng): string {
  switch (fact.kind) {
    case 'at': {
      const who = world.getName(fact.who);
      const where = world.getName(fact.where);
      const from = fromTime(fact.from);
      const to = fromTime(fact.to);

      const variants = [
        `${who} was at ${where} from ${from} to ${to}.`,
        `Between ${from} and ${to}, ${who} was present at ${where}.`,
        `${who} remained in ${where} between ${from} and ${to}.`,
      ];
      return rng.pick(variants);
    }

    case 'action': {
      const who = world.getName(fact.who);
      const verb = fact.verb;
      const time = fromTime(fact.at);
      const target = fact.target ? world.getName(fact.target) : undefined;
      const where = fact.where ? world.getName(fact.where) : undefined;

      let variants: string[];
      if (target && where) {
        variants = [
          `${who} ${verb} ${target} at ${where} at ${time}.`,
          `At ${time}, ${who} ${verb} ${target} in ${where}.`,
          `${who} ${verb} ${target} at ${time} while in ${where}.`,
        ];
      } else if (target) {
        variants = [
          `${who} ${verb} ${target} at ${time}.`,
          `At ${time}, ${who} ${verb} ${target}.`,
        ];
      } else if (where) {
        variants = [
          `${who} ${verb} at ${where} at ${time}.`,
          `At ${time}, ${who} ${verb} at ${where}.`,
        ];
      } else {
        variants = [
          `${who} ${verb} at ${time}.`,
          `At ${time}, ${who} ${verb}.`,
        ];
      }
      return rng.pick(variants);
    }

    case 'possess': {
      const who = world.getName(fact.who);
      const what = world.getName(fact.what);
      const from = fromTime(fact.from);
      const to = fromTime(fact.to);

      const variants = [
        `${who} had possession of ${what} from ${from} to ${to}.`,
        `Between ${from} and ${to}, ${what} was in ${who}'s possession.`,
        `${who} held ${what} from ${from} until ${to}.`,
      ];
      return rng.pick(variants);
    }

    case 'message': {
      const device = world.getName(fact.device);
      const recipient = world.getName(fact.recipient);
      const time = fromTime(fact.sentAt);
      const sender = fact.sender ? world.getName(fact.sender) : undefined;

      let variants: string[];
      if (sender) {
        variants = [
          `${sender} sent a message to ${recipient} using ${device} at ${time}.`,
          `At ${time}, ${sender} transmitted a message from ${device} to ${recipient}.`,
          `A message was sent by ${sender} to ${recipient} via ${device} at ${time}.`,
        ];
      } else {
        // Pending contract change support: sender omitted/unspecified
        variants = [
          `A message was sent from ${device} to ${recipient} at ${time}.`,
          `At ${time}, an outgoing message was dispatched from ${device} to ${recipient}.`,
        ];
      }
      return rng.pick(variants);
    }

    case 'device_use': {
      const device = world.getName(fact.device);
      const by = world.getName(fact.by);
      const time = fromTime(fact.at);

      const variants = [
        `${by} accessed ${device} at ${time}.`,
        `At ${time}, ${by} logged activity on ${device}.`,
        `${device} was operated by ${by} at ${time}.`,
      ];
      return rng.pick(variants);
    }

    case 'access': {
      const who = world.getName(fact.who);
      const door = world.getName(fact.door);
      const time = fromTime(fact.at);

      const variants = [
        `${who} passed through ${door} at ${time}.`,
        `At ${time}, ${door} was accessed by ${who}.`,
        `${who} badge-scanned through ${door} at ${time}.`,
      ];
      return rng.pick(variants);
    }

    case 'relation': {
      const a = world.getName(fact.a);
      const b = world.getName(fact.b);
      const rel = fact.rel;

      const variants = [
        `${a} and ${b} have a relation of '${rel}'.`,
        `${a} is connected to ${b} as '${rel}'.`,
      ];
      return rng.pick(variants);
    }

    case 'motive': {
      const who = world.getName(fact.who);
      const motive = fact.motive;
      const regarding = fact.regarding ? world.getName(fact.regarding) : undefined;

      let variants: string[];
      if (regarding) {
        variants = [
          `${who} holds a motive of '${motive}' regarding ${regarding}.`,
          `Regarding ${regarding}, ${who} is motivated by '${motive}'.`,
        ];
      } else {
        variants = [
          `${who} is driven by a motive of '${motive}'.`,
          `${who} holds a motive of '${motive}'.`,
        ];
      }
      return rng.pick(variants);
    }

    case 'state': {
      const what = world.getName(fact.what);
      const property = fact.property;
      const value = fact.value;
      const time = fromTime(fact.at);

      const variants = [
        `At ${time}, the ${property} of ${what} was ${value}.`,
        `${what} had its ${property} recorded as ${value} at ${time}.`,
      ];
      return rng.pick(variants);
    }

    default: {
      const unknownFact = fact as { kind: string };
      return `Observed evidence concerning ${unknownFact.kind || 'unknown'}.`;
    }
  }
}
