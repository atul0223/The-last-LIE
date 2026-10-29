import { z } from 'zod';

export const LocationPoolItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  doorIds: z.array(z.string().min(1)).min(1),
  adjacency: z.array(
    z.object({
      to: z.string().min(1),
      travelMinutes: z.number().int().positive(),
    }),
  ),
});

export type LocationPoolItem = z.infer<typeof LocationPoolItemSchema>;

export const ObjectPoolItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['item', 'device']),
});

export type ObjectPoolItem = z.infer<typeof ObjectPoolItemSchema>;

export const NamesPoolSchema = z.object({
  firstNames: z.array(z.string().min(1)).min(60),
  surnames: z.array(z.string().min(1)).min(60),
});

export type NamesPool = z.infer<typeof NamesPoolSchema>;

export const LocationsPoolSchema = z.array(LocationPoolItemSchema).min(15);
export type LocationsPool = z.infer<typeof LocationsPoolSchema>;

export const ObjectsPoolSchema = z.array(ObjectPoolItemSchema).min(10);
export type ObjectsPool = z.infer<typeof ObjectsPoolSchema>;

export const MotivesPoolSchema = z.array(z.string().min(1)).min(5);
export type MotivesPool = z.infer<typeof MotivesPoolSchema>;

export const RelationsPoolSchema = z.array(z.string().min(1)).min(5);
export type RelationsPool = z.infer<typeof RelationsPoolSchema>;
