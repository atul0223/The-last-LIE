import { z } from 'zod';
import { TimeSchema } from './time.js';

export const IdSchema = z
  .string()
  .min(1, 'Id cannot be empty')
  .regex(
    /^[A-Za-z0-9_.:-]+$/,
    'Id must contain alphanumeric characters, underscores, dots, colons, or dashes',
  );

export type Id = z.infer<typeof IdSchema>;

export const VERBS = [
  'took',
  'placed',
  'sent',
  'deleted',
  'edited',
  'opened',
  'met',
  'called',
  'paid',
] as const;

export const VerbSchema = z.enum(VERBS);
export type Verb = z.infer<typeof VerbSchema>;

export const RelationTypeSchema = z.string().min(1, 'RelationType cannot be empty');
export type RelationType = z.infer<typeof RelationTypeSchema>;

export const MotiveTypeSchema = z.string().min(1, 'MotiveType cannot be empty');
export type MotiveType = z.infer<typeof MotiveTypeSchema>;

// Individual Fact Object Schemas
export const AtFactBaseSchema = z.object({
  kind: z.literal('at'),
  who: IdSchema,
  where: IdSchema,
  from: TimeSchema,
  to: TimeSchema,
});
export const AtFactSchema = AtFactBaseSchema.refine((data) => data.from <= data.to, {
  message: "'from' must be less than or equal to 'to'",
  path: ['to'],
});
export type AtFact = z.infer<typeof AtFactBaseSchema>;

export const ActionFactSchema = z.object({
  kind: z.literal('action'),
  who: IdSchema,
  verb: VerbSchema,
  target: IdSchema.optional(),
  at: TimeSchema,
  where: IdSchema.optional(),
});
export type ActionFact = z.infer<typeof ActionFactSchema>;

export const PossessFactBaseSchema = z.object({
  kind: z.literal('possess'),
  who: IdSchema,
  what: IdSchema,
  from: TimeSchema,
  to: TimeSchema,
});
export const PossessFactSchema = PossessFactBaseSchema.refine((data) => data.from <= data.to, {
  message: "'from' must be less than or equal to 'to'",
  path: ['to'],
});
export type PossessFact = z.infer<typeof PossessFactBaseSchema>;

export const MessageFactSchema = z.object({
  kind: z.literal('message'),
  msg: IdSchema,
  sender: IdSchema.optional(),
  device: IdSchema,
  recipient: IdSchema,
  sentAt: TimeSchema,
});
export type MessageFact = z.infer<typeof MessageFactSchema>;

export const DeviceUseFactSchema = z.object({
  kind: z.literal('device_use'),
  device: IdSchema,
  by: IdSchema,
  at: TimeSchema,
});
export type DeviceUseFact = z.infer<typeof DeviceUseFactSchema>;

export const AccessFactSchema = z.object({
  kind: z.literal('access'),
  who: IdSchema,
  door: IdSchema,
  at: TimeSchema,
});
export type AccessFact = z.infer<typeof AccessFactSchema>;

export const RelationFactSchema = z.object({
  kind: z.literal('relation'),
  a: IdSchema,
  b: IdSchema,
  rel: RelationTypeSchema,
});
export type RelationFact = z.infer<typeof RelationFactSchema>;

export const MotiveFactSchema = z.object({
  kind: z.literal('motive'),
  who: IdSchema,
  motive: MotiveTypeSchema,
  regarding: IdSchema.optional(),
});
export type MotiveFact = z.infer<typeof MotiveFactSchema>;

export const StateFactSchema = z.object({
  kind: z.literal('state'),
  what: IdSchema,
  property: z.string().min(1, 'Property cannot be empty'),
  value: z.string().min(1, 'Value cannot be empty'),
  at: TimeSchema,
});
export type StateFact = z.infer<typeof StateFactSchema>;

/**
 * Union of all Fact variants, discriminated on `kind`.
 * Includes interval ordering refinement (`from <= to`).
 */
export const FactBaseSchema = z.discriminatedUnion('kind', [
  AtFactBaseSchema,
  ActionFactSchema,
  PossessFactBaseSchema,
  MessageFactSchema,
  DeviceUseFactSchema,
  AccessFactSchema,
  RelationFactSchema,
  MotiveFactSchema,
  StateFactSchema,
]);

export const FactSchema = FactBaseSchema.superRefine((fact, ctx) => {
  if (fact.kind === 'at' || fact.kind === 'possess') {
    if (fact.from > fact.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `'from' (${fact.from}) must be less than or equal to 'to' (${fact.to})`,
        path: ['to'],
      });
    }
  }
});

export type Fact = z.infer<typeof FactBaseSchema>;
