import type { CaseDefinition } from '../schema/index.js';

/**
 * Computes all clues reachable through the unlock graph.
 *
 * Rules:
 * - 'default', 'interview', and 'request' clues are always reachable.
 * - 'after_clue' is reachable if its prerequisite clue is already reachable.
 */
export function getObtainableClueIds(def: CaseDefinition): Set<string> {
  const obtainable = new Set<string>();

  for (const clue of def.clues) {
    if (
      clue.unlock.kind === 'default' ||
      clue.unlock.kind === 'interview' ||
      clue.unlock.kind === 'request'
    ) {
      obtainable.add(clue.id);
    }
  }

  let added = true;
  while (added) {
    added = false;
    for (const clue of def.clues) {
      if (!obtainable.has(clue.id) && clue.unlock.kind === 'after_clue') {
        if (obtainable.has(clue.unlock.clueId)) {
          obtainable.add(clue.id);
          added = true;
        }
      }
    }
  }

  return obtainable;
}
