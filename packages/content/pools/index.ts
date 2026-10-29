import namesRaw from './names.json';
import locationsRaw from './locations.json';
import objectsRaw from './objects.json';
import motivesRaw from './motives.json';
import relationsRaw from './relations.json';

import {
  NamesPoolSchema,
  LocationsPoolSchema,
  ObjectsPoolSchema,
  MotivesPoolSchema,
  RelationsPoolSchema,
  type NamesPool,
  type LocationsPool,
  type ObjectsPool,
  type MotivesPool,
  type RelationsPool,
} from './schemas.js';

export * from './schemas.js';

export const NAMES_POOL: NamesPool = NamesPoolSchema.parse(namesRaw);
export const LOCATIONS_POOL: LocationsPool = LocationsPoolSchema.parse(locationsRaw);
export const OBJECTS_POOL: ObjectsPool = ObjectsPoolSchema.parse(objectsRaw);
export const MOTIVES_POOL: MotivesPool = MotivesPoolSchema.parse(motivesRaw);
export const RELATIONS_POOL: RelationsPool = RelationsPoolSchema.parse(relationsRaw);
