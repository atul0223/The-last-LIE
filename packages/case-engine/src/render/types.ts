import type { Character, GameObject, Location } from '../schema/case.js';

export interface RenderWorld {
  /**
   * Resolves any entity id (character, location, door, object, etc.) to a human-readable display name.
   * Guarantees that raw IDs, "undefined", or "NaN" are never returned.
   */
  getName(id: string): string;

  /**
   * Map of entity IDs to known display names.
   */
  names: ReadonlyMap<string, string>;

  /**
   * Indexed lookup of case characters.
   */
  characters: ReadonlyMap<string, Character>;

  /**
   * Indexed lookup of case locations.
   */
  locations: ReadonlyMap<string, Location>;

  /**
   * Indexed lookup of case game objects.
   */
  objects: ReadonlyMap<string, GameObject>;
}
