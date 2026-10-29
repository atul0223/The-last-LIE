import type { CaseDefinition } from '../schema/index.js';

export interface LogicContext {
  doorLocations: Record<string, string>; // doorId -> locationId
  deviceOwners: Record<string, string>; // deviceId -> characterId
  travelTimes: Record<string, Record<string, number>>; // [fromLoc][toLoc] -> minutes
  getTravelTime(fromLoc: string, toLoc: string): number | null;
}

/**
 * Builds static world lookup tables from a CaseDefinition:
 * - door -> location mapping
 * - device -> owner mapping
 * - symmetric travel times between locations
 */
export function buildContext(def: CaseDefinition): LogicContext {
  const doorLocations: Record<string, string> = {};
  const travelTimes: Record<string, Record<string, number>> = {};

  for (const location of def.locations) {
    for (const doorId of location.doorIds) {
      doorLocations[doorId] = location.id;
    }

    if (!travelTimes[location.id]) {
      travelTimes[location.id] = {};
    }
    const locMap = travelTimes[location.id]!;
    locMap[location.id] = 0;

    for (const adj of location.adjacency) {
      locMap[adj.to] = adj.travelMinutes;

      // Ensure symmetry across adjacencies
      if (!travelTimes[adj.to]) {
        travelTimes[adj.to] = {};
      }
      travelTimes[adj.to]![location.id] = adj.travelMinutes;
    }
  }

  const deviceOwners: Record<string, string> = {};
  for (const obj of def.objects) {
    if (obj.ownerId) {
      deviceOwners[obj.id] = obj.ownerId;
    }
  }

  function getTravelTime(fromLoc: string, toLoc: string): number | null {
    if (fromLoc === toLoc) {
      return 0;
    }
    const direct = travelTimes[fromLoc]?.[toLoc];
    if (direct !== undefined) {
      return direct;
    }
    const reverse = travelTimes[toLoc]?.[fromLoc];
    if (reverse !== undefined) {
      return reverse;
    }
    return null;
  }

  return {
    doorLocations,
    deviceOwners,
    travelTimes,
    getTravelTime,
  };
}
