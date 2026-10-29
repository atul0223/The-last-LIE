import type { Character, GameObject, Location } from '../../schema/index.js';
import type { Rng } from '../../rng.js';
import { DEFAULT_POOLS } from './default_pools.js';
import type { FilledSlots, PoolsData, SlotSpec } from './types.js';

/**
 * Fills declared template slots from pools, respecting uniqueness and constraints.
 */
export function fillSlots(
  slots: SlotSpec[],
  rng: Rng,
  pools?: Partial<PoolsData>,
): FilledSlots {
  const namesPool = pools?.names ?? DEFAULT_POOLS.names;
  const locationsPool = pools?.locations ?? DEFAULT_POOLS.locations;
  const objectsPool = pools?.objects ?? DEFAULT_POOLS.objects;
  const motivesPool = pools?.motives ?? DEFAULT_POOLS.motives;
  const relationsPool = pools?.relations ?? DEFAULT_POOLS.relations;

  const filled: FilledSlots = {};
  const usedCharacterIds = new Set<string>();
  const usedCharacterNames = new Set<string>();
  const usedLocationIds = new Set<string>();
  const usedObjectIds = new Set<string>();

  for (const slot of slots) {
    const exclude = new Set(slot.constraints?.exclude ?? []);

    switch (slot.type) {
      case 'character': {
        const availableFirstNames = rng.shuffle(
          namesPool.firstNames.filter((fn) => !exclude.has(fn)),
        );
        const availableSurnames = rng.shuffle(
          namesPool.surnames.filter((sn) => !exclude.has(sn)),
        );

        let chosenFirst = '';
        let chosenLast = '';
        let charId = '';

        for (const fn of availableFirstNames) {
          const id = `char_${fn.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          if (!usedCharacterIds.has(id)) {
            chosenFirst = fn;
            charId = id;
            break;
          }
        }

        for (const sn of availableSurnames) {
          const fullName = `${chosenFirst} ${sn}`;
          if (!usedCharacterNames.has(fullName)) {
            chosenLast = sn;
            break;
          }
        }

        if (!chosenFirst) chosenFirst = availableFirstNames[0] ?? 'Alex';
        if (!chosenLast) chosenLast = availableSurnames[0] ?? 'Vance';
        if (!charId) charId = `char_${chosenFirst.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

        usedCharacterIds.add(charId);
        usedCharacterNames.add(`${chosenFirst} ${chosenLast}`);

        const character: Character = {
          id: charId,
          name: `${chosenFirst} ${chosenLast}`,
          role: slot.role ?? 'Key Witness',
          publicDescription: `${slot.role ?? 'Citizen'} in Vesper City involved in the incident.`,
        };
        filled[slot.name] = character;
        break;
      }

      case 'location': {
        const available = locationsPool.filter(
          (loc) => !usedLocationIds.has(loc.id) && !exclude.has(loc.id),
        );
        const chosen = available.length > 0 ? rng.pick(available) : rng.pick(locationsPool);
        usedLocationIds.add(chosen.id);

        const location: Location = {
          id: chosen.id,
          name: chosen.name,
          description: chosen.description,
          doorIds: [...chosen.doorIds],
          adjacency: chosen.adjacency.map((a) => ({ ...a })),
        };
        filled[slot.name] = location;
        break;
      }

      case 'object': {
        const available = objectsPool.filter(
          (obj) => !usedObjectIds.has(obj.id) && !exclude.has(obj.id),
        );
        const chosen = available.length > 0 ? rng.pick(available) : rng.pick(objectsPool);
        usedObjectIds.add(chosen.id);

        const gameObject: GameObject = {
          id: chosen.id,
          name: chosen.name,
          description: chosen.description,
          type: chosen.type,
        };
        filled[slot.name] = gameObject;
        break;
      }

      case 'motive': {
        const available = motivesPool.filter((m) => !exclude.has(m));
        filled[slot.name] = available.length > 0 ? rng.pick(available) : rng.pick(motivesPool);
        break;
      }

      case 'relation': {
        const available = relationsPool.filter((r) => !exclude.has(r));
        filled[slot.name] = available.length > 0 ? rng.pick(available) : rng.pick(relationsPool);
        break;
      }

      default:
        break;
    }
  }

  return filled;
}
