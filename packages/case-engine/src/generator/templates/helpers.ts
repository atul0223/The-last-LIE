/**
 * Shared formatting and text helpers for procedural case templates.
 */

import type { GameObject, Location } from '../../schema/index.js';
import type { Rng } from '../../rng.js';

/**
 * Formats an array of names into a natural English list:
 * e.g. ["Adrian", "Bram", "Clara"] -> "Adrian, Bram, and Clara"
 */
export function formatNameList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/**
 * Generates rich, character-neutral titles for false_alibi cases.
 */
export function generateFalseAlibiTitle(
  rng: Rng,
  item: GameObject,
  locCrime: Location,
  locAlibi: Location,
  locTransit: Location,
): string {
  const descriptors = [
    'Midnight',
    'Silent',
    'Phantom',
    'Broken',
    'Fabricated',
    'Unrecorded',
    'Cold',
    'Shadowed',
    'Contradictory',
    'Disputed',
    'Hidden',
    'Compromised',
    'Vanished',
    'Whispering',
    'Sovereign',
    'Twilight',
    'Altered',
  ];
  const incidentNouns = [
    'Contradiction',
    'Incident',
    'Conspiracy',
    'Breach',
    'Timeline',
    'Affair',
    'Inquiry',
    'Discrepancy',
    'Intrigue',
    'Puzzle',
    'Occurrence',
    'Deception',
    'Silence',
  ];
  const atmospheric = [
    'at Midnight',
    'in the Rain',
    'After Hours',
    'Before Dawn',
    'Under Curfew',
    'at the Deadline',
    'in the Fog',
    'Behind Closed Doors',
  ];

  const patterns = [
    () => `The ${rng.pick(descriptors)} Alibi at ${locAlibi.name}`,
    () => `The ${locCrime.name} ${rng.pick(incidentNouns)} ${rng.pick(atmospheric)}`,
    () => `The ${item.name} ${rng.pick(incidentNouns)}`,
    () => `Shadows Over ${locCrime.name} ${rng.pick(atmospheric)}`,
    () => `The ${rng.pick(descriptors)} Hours at ${locAlibi.name}`,
    () => `The Compromise of the ${item.name} ${rng.pick(atmospheric)}`,
    () => `The Broken Timeline at ${locTransit.name} ${rng.pick(atmospheric)}`,
    () => `${rng.pick(incidentNouns)} at ${locCrime.name}`,
    () => `The ${rng.pick(descriptors)} Breach at ${locCrime.name}`,
    () => `Deception at ${locAlibi.name} ${rng.pick(atmospheric)}`,
    () => `The Case of the ${rng.pick(descriptors)} ${item.name}`,
    () => `The ${rng.pick(descriptors)} Inquiry at ${locCrime.name}`,
  ];

  return rng.pick(patterns)();
}

/**
 * Generates rich, character-neutral titles for missing_item cases.
 */
export function generateMissingItemTitle(
  rng: Rng,
  item: GameObject,
  locVault: Location,
  locOffice: Location,
  _locTransit: Location,
): string {
  const descriptors = [
    'Missing',
    'Lost',
    'Vanished',
    'Stolen',
    'Secured',
    'Disputed',
    'Midnight',
    'Silent',
    'Unrecorded',
    'Cold',
    'Hidden',
    'Sealed',
    'Vault',
    'Empty',
    'Custodial',
    'Twilight',
    'Phantom',
  ];
  const incidentNouns = [
    'Theft',
    'Breach',
    'Disappearance',
    'Handover',
    'Inventory',
    'Custody Gap',
    'Incident',
    'Vanishing',
    'Heist',
    'Affair',
    'Discrepancy',
    'Inquiry',
    'Puzzle',
  ];
  const atmospheric = [
    'at Midnight',
    'After Hours',
    'in the Archives',
    'Before Dawn',
    'Under Curfew',
    'in the Fog',
    'During Handover',
    'at Shift Change',
  ];

  const patterns = [
    () => `The ${rng.pick(descriptors)} ${item.name} ${rng.pick(atmospheric)}`,
    () => `The Vault Breach at ${locVault.name} ${rng.pick(atmospheric)}`,
    () => `Disappearance of the ${item.name} ${rng.pick(atmospheric)}`,
    () => `The ${rng.pick(descriptors)} Handover at ${locOffice.name}`,
    () => `The Lost Inventory of ${locVault.name} ${rng.pick(atmospheric)}`,
    () => `The Custody Gap at ${locOffice.name}`,
    () => `The ${rng.pick(descriptors)} Shift at ${locVault.name}`,
    () => `The Vanishing of the ${rng.pick(descriptors)} ${item.name}`,
    () => `The ${locVault.name} ${rng.pick(incidentNouns)}`,
    () => `The Theft at ${locVault.name} ${rng.pick(atmospheric)}`,
    () => `The ${rng.pick(descriptors)} Pedestal at ${locVault.name}`,
    () => `The Case of the ${rng.pick(descriptors)} ${item.name}`,
    () => `The ${item.name} ${rng.pick(incidentNouns)} at ${locVault.name}`,
    () => `${rng.pick(incidentNouns)} of the ${rng.pick(descriptors)} ${item.name}`,
  ];

  return rng.pick(patterns)();
}

/**
 * Generates rich, character-neutral titles for forged_message cases.
 */
export function generateForgedMessageTitle(
  rng: Rng,
  device: GameObject,
  _doc: GameObject,
  locNewsroom: Location,
  locPrintshop: Location,
): string {
  const descriptors = [
    'Forged',
    'Phantom',
    'Midnight',
    'Counterfeit',
    'Intercepted',
    'Silent',
    'Static',
    'Ghost',
    'Unauthorized',
    'False',
    'Spurious',
    'Encrypted',
    'Altered',
    'Untraceable',
    'Clandestine',
  ];
  const incidentNouns = [
    'Wire',
    'Dispatch',
    'Message',
    'Transmission',
    'Signal',
    'Broadcast',
    'Deception',
    'Intrigue',
    'Deadline',
    'Breach',
    'Telegram',
    'Cable',
  ];
  const atmospheric = [
    'at Midnight',
    'Before the Morning Edition',
    'at the Deadline',
    'Over the Wire',
    'in the Pressroom',
    'Before Dawn',
    'Across the Network',
  ];

  const patterns = [
    () => `The ${rng.pick(descriptors)} ${rng.pick(incidentNouns)} at ${locNewsroom.name}`,
    () => `The ${rng.pick(descriptors)} Dispatch from ${device.name}`,
    () => `The Phantom Message from ${device.name} ${rng.pick(atmospheric)}`,
    () => `Deception on the Wire at ${locPrintshop.name} ${rng.pick(atmospheric)}`,
    () => `The ${rng.pick(descriptors)} Transmission at ${locNewsroom.name}`,
    () => `Static Over ${locNewsroom.name} ${rng.pick(atmospheric)}`,
    () => `The ${rng.pick(descriptors)} Breach at ${locPrintshop.name}`,
    () => `The ${rng.pick(descriptors)} Signal from ${device.name}`,
    () => `The Intercepted Wire at ${locNewsroom.name} ${rng.pick(atmospheric)}`,
    () => `False Dispatches from ${device.name} ${rng.pick(atmospheric)}`,
    () => `The ${locPrintshop.name} ${rng.pick(descriptors)} Intrigue`,
    () => `The Broken Transmission at ${locPrintshop.name} ${rng.pick(atmospheric)}`,
    () => `The ${device.name} ${rng.pick(incidentNouns)} ${rng.pick(atmospheric)}`,
    () => `The Case of the ${rng.pick(descriptors)} Dispatch`,
  ];

  return rng.pick(patterns)();
}
