import type { Clue } from '../schema/clue.js';
import { fromTime } from '../schema/time.js';
import type { AccessFact, DeviceUseFact, MessageFact } from '../schema/fact.js';
import type { Rng } from '../rng.js';
import type { RenderWorld } from './types.js';
import { renderFact } from './fact.js';

/**
 * Renders a Clue into its final display text.
 * If clue.text is already provided, returns it unchanged.
 * Otherwise, styles the output according to clue.type and its asserted facts.
 */
export function renderClue(clue: Clue, world: RenderWorld, rng: Rng): string {
  // 1. If clue.text exists, return it unchanged.
  if (typeof clue.text === 'string' && clue.text.trim().length > 0) {
    return clue.text;
  }

  const asserts = clue.asserts ?? [];
  const renderedFacts = asserts.map((f) => renderFact(f, world, rng)).join(' ');

  switch (clue.type) {
    case 'access_log': {
      // Find the first access fact if available
      const accessFact = asserts.find((f): f is AccessFact => f.kind === 'access');
      if (accessFact) {
        const time = fromTime(accessFact.at);
        const door = world.getName(accessFact.door).toUpperCase().replace(/\s+/g, '_');
        const who = world.getName(accessFact.who);

        const variants = [
          `[${time}] ${door} · badge: ${who}`,
          `[${time}] ACCESS_LOG · ${door} · badge: ${who}`,
          `[${time}] ENTRY_GATE · ${door} · authorized: ${who}`,
        ];
        return rng.pick(variants);
      }
      return `[LOG] Access log entry: ${renderedFacts || 'No gate scan recorded.'}`;
    }

    case 'device_log': {
      // Find the first device_use fact if available
      const deviceFact = asserts.find((f): f is DeviceUseFact => f.kind === 'device_use');
      if (deviceFact) {
        const time = fromTime(deviceFact.at);
        const device = world.getName(deviceFact.device).toUpperCase().replace(/\s+/g, '_');
        const who = world.getName(deviceFact.by);

        const variants = [
          `[${time}] ${device} · session: ${who}`,
          `[${time}] DEVICE_EVENT · ${device} · user: ${who}`,
          `[${time}] SYS_LOG · ${device} active · operator: ${who}`,
        ];
        return rng.pick(variants);
      }
      return `[LOG] Device log record: ${renderedFacts || 'No device event recorded.'}`;
    }

    case 'cctv': {
      // Look for any fact containing a timestamp
      const timeFact = asserts.find((f) => 'at' in f || 'from' in f);
      const timeStr = timeFact
        ? fromTime('at' in timeFact ? timeFact.at : timeFact.from)
        : '00:00';

      const who = asserts.find((f) => 'who' in f) as { who: string } | undefined;
      const whoName = who ? world.getName(who.who) : 'Unidentified Subject';

      const where = asserts.find((f) => 'where' in f) as { where: string } | undefined;
      const whereName = where ? world.getName(where.where).toUpperCase().replace(/\s+/g, '_') : 'SECURITY_ZONE';

      const variants = [
        `[${timeStr}] CCTV_FEED · ${whereName} · subject: ${whoName}`,
        `[${timeStr}] SECURITY_CAMERA · ${whereName} · visual: ${whoName}`,
      ];
      return rng.pick(variants);
    }

    case 'testimony': {
      const sourceName = clue.source ? world.getName(clue.source) : 'Witness';
      const speech = renderedFacts || 'No detailed statement provided.';

      const variants = [
        `${sourceName} stated: "${speech}"`,
        `${sourceName} testified: "${speech}"`,
        `${sourceName} reported: "${speech}"`,
      ];
      return rng.pick(variants);
    }

    case 'receipt': {
      const details = renderedFacts || 'Purchase transaction recorded.';
      const variants = [
        `RECEIPT RECORD: ${details}`,
        `TRANSACTION SLIP · ${details}`,
      ];
      return rng.pick(variants);
    }

    case 'document': {
      const details = renderedFacts || 'Official documentation on file.';
      const variants = [
        `OFFICIAL RECORD: ${details}`,
        `FILED DOCUMENT · ${details}`,
      ];
      return rng.pick(variants);
    }

    case 'message': {
      const msgFact = asserts.find((f): f is MessageFact => f.kind === 'message');
      if (msgFact) {
        const time = fromTime(msgFact.sentAt);
        const device = world.getName(msgFact.device);
        const recipient = world.getName(msgFact.recipient);
        const sender = msgFact.sender ? world.getName(msgFact.sender) : undefined;

        if (sender) {
          const variants = [
            `[${time}] SMS · ${device} → ${recipient} (sender: ${sender})`,
            `[${time}] MESSAGE RECORD · ${device} sent to ${recipient} by ${sender}`,
          ];
          return rng.pick(variants);
        }
        const variants = [
          `[${time}] SMS CARRIER LOG · Outgoing from ${device} to ${recipient}`,
          `[${time}] DISPATCH LOG · ${device} transmitted to ${recipient}`,
        ];
        return rng.pick(variants);
      }
      return `MESSAGE LOG: ${renderedFacts || 'Carrier dispatch recorded.'}`;
    }

    case 'photo': {
      const details = renderedFacts || 'Photographic capture preserved.';
      const variants = [
        `PHOTO RECORD: ${details}`,
        `SURVEILLANCE STILL · ${details}`,
      ];
      return rng.pick(variants);
    }

    case 'object': {
      const details = renderedFacts || 'Physical item catalogued into evidence.';
      const variants = [
        `EVIDENCE ITEM: ${details}`,
        `PHYSICAL OBJECT RECORD · ${details}`,
      ];
      return rng.pick(variants);
    }

    default: {
      return renderedFacts || `Evidence clue record.`;
    }
  }
}
