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

export const PUBLIC_CLUE_TAGS = [
  'crucial',
  'alibi',
  'physical',
  'document',
  'testimony',
  'digital',
  'forensic',
  'witness',
  'timeline',
] as const;
export type PublicClueTag = (typeof PUBLIC_CLUE_TAGS)[number];

export const LockedClueHintSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('after_clue'),
    clueId: IdSchema,
  }),
  z.object({
    kind: z.literal('after_clue_hidden'),
  }),
  z.object({
    kind: z.literal('interview'),
  }),
  z.object({
    kind: z.literal('request'),
    cost: z.number().int().min(0),
  }),
]);
export type LockedClueHint = z.infer<typeof LockedClueHintSchema>;

export const PublicUnlockedClueSchema = z.object({
  id: IdSchema,
  type: ClueTypeSchema,
  reliability: ReliabilitySchema,
  source: IdSchema.optional(),
  asserts: z.array(FactSchema).default([]).optional(),
  text: z.string().min(1, 'Public clue text cannot be empty'),
  unlock: ClueUnlockSchema,
  tags: z.array(z.string()).optional(),
  locked: z.literal(false).optional(),
});
export type PublicUnlockedClue = z.infer<typeof PublicUnlockedClueSchema>;

export const PublicLockedClueSchema = z.object({
  id: IdSchema,
  type: ClueTypeSchema,
  locked: z.literal(true),
  hint: LockedClueHintSchema.optional(),
});
export type PublicLockedClue = z.infer<typeof PublicLockedClueSchema>;

export const PublicClueSchema = z.union([PublicUnlockedClueSchema, PublicLockedClueSchema]);
export type PublicClue = z.infer<typeof PublicClueSchema>;
