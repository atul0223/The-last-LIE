import { z } from 'zod';
import { FactSchema, IdSchema } from './fact.js';

export const CLUE_TYPES = [
  'message',
  'access_log',
  'device_log',
  'receipt',
  'testimony',
  'photo',
  'document',
  'object',
  'cctv',
] as const;

export const ClueTypeSchema = z.enum(CLUE_TYPES);
export type ClueType = z.infer<typeof ClueTypeSchema>;

export const RELIABILITIES = ['physical', 'testimony'] as const;
export const ReliabilitySchema = z.enum(RELIABILITIES);
export type Reliability = z.infer<typeof ReliabilitySchema>;

export const ClueUnlockSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('default'),
  }),
  z.object({
    kind: z.literal('after_clue'),
    clueId: IdSchema,
  }),
  z.object({
    kind: z.literal('interview'),
    characterId: IdSchema,
    questionId: IdSchema,
  }),
  z.object({
    kind: z.literal('request'),
    cost: z.number().int().min(0, 'Unlock cost cannot be negative'),
  }),
]);
export type ClueUnlock = z.infer<typeof ClueUnlockSchema>;

export const ClueSchema = z.object({
  id: IdSchema,
  type: ClueTypeSchema,
  reliability: ReliabilitySchema,
  source: IdSchema.optional(),
  asserts: z.array(FactSchema).default([]),
  text: z.string().optional(),
  unlock: ClueUnlockSchema,
  tags: z.array(z.string()).optional(),
});
export type Clue = z.infer<typeof ClueSchema>;

export const PublicClueSchema = z.object({
  id: IdSchema,
  type: ClueTypeSchema,
  reliability: ReliabilitySchema,
  source: IdSchema.optional(),
  asserts: z.array(FactSchema).default([]),
  text: z.string().optional(),
  unlock: ClueUnlockSchema,
  tags: z.array(z.string()).optional(),
});
export type PublicClue = z.infer<typeof PublicClueSchema>;
