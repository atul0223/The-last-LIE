import { describe, expect, it } from 'vitest';
import {
  NAMES_POOL,
  LOCATIONS_POOL,
  OBJECTS_POOL,
  MOTIVES_POOL,
  RELATIONS_POOL,
} from '../pools/index.js';

describe('Content Pools Validation', () => {
  it('validates names pool has at least 60 first names and 60 surnames', () => {
    expect(NAMES_POOL.firstNames.length).toBeGreaterThanOrEqual(60);
    expect(NAMES_POOL.surnames.length).toBeGreaterThanOrEqual(60);
  });

  it('validates locations pool has at least 15 locations with doors and travel adjacency', () => {
    expect(LOCATIONS_POOL.length).toBeGreaterThanOrEqual(15);
    for (const loc of LOCATIONS_POOL) {
      expect(loc.id).toBeDefined();
      expect(loc.name).toBeDefined();
      expect(loc.doorIds.length).toBeGreaterThanOrEqual(1);
      expect(loc.adjacency.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('validates objects, motives, and relations pools', () => {
    expect(OBJECTS_POOL.length).toBeGreaterThanOrEqual(10);
    expect(MOTIVES_POOL.length).toBeGreaterThanOrEqual(5);
    expect(RELATIONS_POOL.length).toBeGreaterThanOrEqual(5);
  });
});
