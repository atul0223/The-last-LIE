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
    'Veiled',
    'Shrouded',
    'Unseen',
    'Spectral',
    'Gilded',
    'Obscured',
    'Hollow',
    'Fractured',
    'Inverted',
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
    'Enigma',
    'Conundrum',
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
    'in the Dead of Night',
    'Under Cover of Dark',
    'During the Blackout',
    'Past the Outer Gate',
    'at the Eleventh Hour',
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
    () => `The ${rng.pick(descriptors)} Alibi of ${locCrime.name} ${rng.pick(atmospheric)}`,
    () => `A Study in Discrepancy at ${locCrime.name} ${rng.pick(atmospheric)}`,
    () => `The Fabricated Window at ${locAlibi.name}`,
    () => `Incident of the ${rng.pick(descriptors)} ${item.name} at ${locCrime.name}`,
    () => `The Vanishing Presence at ${locTransit.name} ${rng.pick(atmospheric)}`,
    () => `Curfew at ${locCrime.name}: The ${rng.pick(descriptors)} ${rng.pick(incidentNouns)}`,
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
    'Clandestine',
    'Unclaimed',
    'Priceless',
    'Confidential',
    'Archival',
    'Classified',
    'Gilded',
    'Subterranean',
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
    'Enigma',
    'Extraction',
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
    'in the Sub-Vault',
    'at the Shift Bell',
    'Through the Security Gate',
    'Before the Morning Audit',
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
    () => `The Mystery of the ${rng.pick(descriptors)} ${item.name} ${rng.pick(atmospheric)}`,
    () => `The ${locVault.name} Disappearance ${rng.pick(atmospheric)}`,
    () => `The Break in Custody at ${locOffice.name} ${rng.pick(atmospheric)}`,
    () => `A Breach in ${locVault.name}: The ${item.name}`,
    () => `The Silent Removal of the ${item.name}`,
    () => `Curator's Dilemma at ${locOffice.name} ${rng.pick(atmospheric)}`,
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
    'Doctored',
    'Splice',
    'Sub Rosa',
    'Covert',
    'Cryptic',
    'Deceptive',
    'Mirrored',
    'Unverified',
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
    'Relay',
    'Discrepancy',
  ];
  const atmospheric = [
    'at Midnight',
    'Before the Morning Edition',
    'at the Deadline',
    'Over the Wire',
    'in the Pressroom',
    'Before Dawn',
    'Across the Network',
    'Across the Northern Line',
    'Through the Static',
    'at the Evening Edition',
    'on the Midnight Circuit',
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
    () => `The Case of the ${rng.pick(descriptors)} Transmission ${rng.pick(atmospheric)}`,
    () => `The ${rng.pick(descriptors)} Cable from ${locNewsroom.name}`,
    () => `Dispatches from Nowhere: The ${device.name} Affair`,
    () => `A Phantom on the Line at ${locPrintshop.name} ${rng.pick(atmospheric)}`,
    () => `The Tampered Wire of ${device.name} ${rng.pick(atmospheric)}`,
    () => `The Broadcast That Never Was: ${locNewsroom.name}`,
  ];

  return rng.pick(patterns)();
}

/**
 * Generates rich, character-neutral titles for hidden_identity cases.
 */
export function generateHiddenIdentityTitle(
  rng: Rng,
  item: GameObject,
  locStation: Location,
  locHotel: Location,
  locTransit: Location,
): string {
  const descriptors = [
    'Phantom',
    'Shadowed',
    'Veiled',
    'Substituted',
    'Disputed',
    'Cloaked',
    'Spurious',
    'Inverted',
    'Counterfeit',
    'Unmasked',
    'Duplicitous',
    'Spectral',
    'Obscured',
    'Secret',
    'Clandestine',
    'Silent',
    'Deceptive',
    'Furtive',
  ];
  const incidentNouns = [
    'Imposture',
    'Infiltration',
    'Intrigue',
    'Deception',
    'Cipher',
    'Conspiracy',
    'Breach',
    'Affair',
    'Occurrence',
    'Subterfuge',
    'Discrepancy',
  ];
  const atmospheric = [
    'at Midnight',
    'in the Fog',
    'After Hours',
    'Under Curfew',
    'at the Platform Gate',
    'Behind Closed Doors',
    'in the Cold Rain',
    'at the Concourse',
    'Before the Whistle',
    'Past the Gatehouse',
  ];

  const patterns = [
    () => `The ${rng.pick(descriptors)} Impostor at ${locStation.name}`,
    () => `The ${locHotel.name} ${rng.pick(incidentNouns)} ${rng.pick(atmospheric)}`,
    () => `The ${item.name} ${rng.pick(incidentNouns)}`,
    () => `Shadows Over ${locStation.name} ${rng.pick(atmospheric)}`,
    () => `The ${rng.pick(descriptors)} Attache at ${locHotel.name}`,
    () => `The Interception of the ${item.name} ${rng.pick(atmospheric)}`,
    () => `The Disputed Identity at ${locTransit.name} ${rng.pick(atmospheric)}`,
    () => `${rng.pick(incidentNouns)} at ${locStation.name}`,
    () => `The ${rng.pick(descriptors)} Infiltration at ${locStation.name}`,
    () => `Subterfuge at ${locHotel.name} ${rng.pick(atmospheric)}`,
    () => `The Case of the ${rng.pick(descriptors)} Envoy`,
    () => `The ${rng.pick(descriptors)} Cipher at ${locStation.name}`,
    () => `A Phantom at ${locTransit.name} ${rng.pick(atmospheric)}`,
    () => `The False Persona at ${locHotel.name}`,
    () => `The Vanished Operative of ${locStation.name}`,
    () => `The ${item.name} Intrigue at ${locTransit.name}`,
    () => `The Secret Credentials of ${locHotel.name} ${rng.pick(atmospheric)}`,
    () => `The Man from ${locStation.name} ${rng.pick(atmospheric)}`,
  ];

  return rng.pick(patterns)();
}

