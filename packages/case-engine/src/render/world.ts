import type { CaseDefinition, Character, GameObject, Location } from '../schema/case.js';
import type { RenderWorld } from './types.js';

/**
 * Formats an unknown or arbitrary entity ID into a human-readable title.
 * Strips common prefixes (door_, loc_, char_, obj_, msg_, prop_) and capitalizes words.
 * Guarantees no raw ID prefixes, "undefined", or "NaN" are returned.
 */
export function formatEntityId(id: string | null | undefined): string {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return 'Unknown Entity';
  }
  const cleaned = id.replace(/^(char|loc|obj|door|msg|prop|device|item)_/, '');
  const words = cleaned
    .split(/[_\-.:]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  if (words.length === 0) {
    return 'Unknown Entity';
  }
  return words.join(' ');
}

/**
 * Builds a RenderWorld lookup mapping entity IDs to display names from a CaseDefinition.
 */
export function buildRenderWorld(def: CaseDefinition): RenderWorld {
  const names = new Map<string, string>();
  const characters = new Map<string, Character>();
  const locations = new Map<string, Location>();
  const objects = new Map<string, GameObject>();

  // 1. Characters
  if (Array.isArray(def.characters)) {
    for (const c of def.characters) {
      if (c && c.id) {
        names.set(c.id, c.name);
        characters.set(c.id, c);
      }
    }
  }

  // 2. Locations & Doors
  if (Array.isArray(def.locations)) {
    for (const loc of def.locations) {
      if (loc && loc.id) {
        names.set(loc.id, loc.name);
        locations.set(loc.id, loc);

        if (Array.isArray(loc.doorIds)) {
          for (const doorId of loc.doorIds) {
            if (doorId && !names.has(doorId)) {
              names.set(doorId, formatEntityId(doorId));
            }
          }
        }
      }
    }
  }

  // 3. Objects
  if (Array.isArray(def.objects)) {
    for (const obj of def.objects) {
      if (obj && obj.id) {
        names.set(obj.id, obj.name);
        objects.set(obj.id, obj);
      }
    }
  }

  const world: RenderWorld = {
    names,
    characters,
    locations,
    objects,
    getName(id: string): string {
      if (!id || typeof id !== 'string') {
        return 'Unknown Entity';
      }
      const known = names.get(id);
      if (known) {
        return known;
      }
      return formatEntityId(id);
    },
  };

  return world;
}
