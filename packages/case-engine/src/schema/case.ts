import { z } from 'zod';
import { FactSchema, IdSchema } from './fact.js';
import { ClueSchema, PublicClueSchema } from './clue.js';
import { TimeSchema } from './time.js';

export const CharacterSchema = z.object({
  id: IdSchema,
  name: z.string().min(1, 'Name cannot be empty'),
  role: z.string().min(1, 'Role cannot be empty'),
  publicDescription: z.string().min(1, 'Public description cannot be empty'),
  portrait: z.string().optional(),
});
export type Character = z.infer<typeof CharacterSchema>;

export const AdjacencyConnectionSchema = z.object({
  to: IdSchema,
  travelMinutes: z.number().int().min(0, 'Travel minutes cannot be negative'),
});
export type AdjacencyConnection = z.infer<typeof AdjacencyConnectionSchema>;

export const LocationSchema = z.object({
  id: IdSchema,
  name: z.string().min(1, 'Location name cannot be empty'),
  description: z.string().optional(),
  doorIds: z.array(IdSchema).default([]),
  adjacency: z.array(AdjacencyConnectionSchema).default([]),
});
export type Location = z.infer<typeof LocationSchema>;

export const GAME_OBJECT_TYPES = ['device', 'item', 'key', 'document', 'weapon', 'other'] as const;

export const GameObjectSchema = z.object({
  id: IdSchema,
  name: z.string().min(1, 'Object name cannot be empty'),
  description: z.string().optional(),
  type: z.enum(GAME_OBJECT_TYPES).or(z.string().min(1)),
  ownerId: IdSchema.optional(), // for devices / owned items
});
export type GameObject = z.infer<typeof GameObjectSchema>;

export const HypothesisSchema = z.object({
  id: IdSchema,
  label: z.string().min(1, 'Hypothesis label cannot be empty'),
  claims: z.array(FactSchema).default([]),
  culpritIds: z.array(IdSchema).default([]),
});
export type Hypothesis = z.infer<typeof HypothesisSchema>;

export const PublicHypothesisSchema = z.object({
  id: IdSchema,
  label: z.string().min(1, 'Hypothesis label cannot be empty'),
});
export type PublicHypothesis = z.infer<typeof PublicHypothesisSchema>;

export const RevealBeatSchema = z.object({
  time: TimeSchema.optional(),
  text: z.string().min(1, 'Reveal beat text cannot be empty'),
  clueIds: z.array(IdSchema).default([]),
  facts: z.array(FactSchema).optional(),
});
export type RevealBeat = z.infer<typeof RevealBeatSchema>;

export const LiarDeclarationSchema = z.object({
  who: IdSchema,
  statementClueIds: z.array(IdSchema).min(1, 'Must list at least one statement clue id'),
});
export type LiarDeclaration = z.infer<typeof LiarDeclarationSchema>;

export const GroundTruthSchema = z.object({
  timeline: z.array(FactSchema).min(1, 'GroundTruth timeline cannot be empty'),
  culpritIds: z.array(IdSchema).default([]),
  liars: z.array(LiarDeclarationSchema).default([]),
  solutionHypothesisId: IdSchema,
  keyEvidence: z.array(z.array(IdSchema).min(1)).min(1, 'Must have at least one keyEvidence set'),
  explanation: z.array(RevealBeatSchema).min(1, 'Must have at least one reveal beat'),
});
export type GroundTruth = z.infer<typeof GroundTruthSchema>;

export const InterviewQuestionSchema = z.object({
  id: IdSchema,
  prompt: z.string().min(1, 'Interview question prompt cannot be empty'),
  answer: z.string().min(1, 'Interview question answer cannot be empty'),
  unlockedClueId: IdSchema.optional(),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

export const InterviewSchema = z.object({
  characterId: IdSchema,
  questions: z.array(InterviewQuestionSchema).default([]),
});
export type Interview = z.infer<typeof InterviewSchema>;

export const ConspiracyHookSchema = z.object({
  nodeId: IdSchema,
  clueId: IdSchema.optional(),
  leadText: z.string().optional(),
  description: z.string().optional(),
});
export type ConspiracyHook = z.infer<typeof ConspiracyHookSchema>;

export const CASE_STATUSES = ['draft', 'validated', 'reviewed', 'published', 'retired'] as const;

export const CaseStatusSchema = z.enum(CASE_STATUSES);
export type CaseStatus = z.infer<typeof CaseStatusSchema>;

export const CaseMetaSchema = z.object({
  templateId: IdSchema.optional(),
  seed: z.number().int().optional(),
  author: z.string().optional(),
  status: CaseStatusSchema,
  allowAmbiguity: z.boolean().optional(),
});
export type CaseMeta = z.infer<typeof CaseMetaSchema>;

export const CasePublicMetaSchema = z.object({
  templateId: IdSchema.optional(),
  author: z.string().optional(),
  status: CaseStatusSchema,
  allowAmbiguity: z.boolean().optional(),
});
export type CasePublicMeta = z.infer<typeof CasePublicMetaSchema>;

export const SettingSchema = z.object({
  locationIds: z.array(IdSchema).min(1, 'Setting must include at least one location'),
  date: z.string().min(1, 'Setting date cannot be empty'),
  summary: z.string().min(1, 'Setting summary cannot be empty'),
});
export type Setting = z.infer<typeof SettingSchema>;

export const CASE_KINDS = ['authored', 'procedural', 'canonical'] as const;
export const CaseKindSchema = z.enum(CASE_KINDS);
export type CaseKind = z.infer<typeof CaseKindSchema>;

export const DIFFICULTIES = [1, 2, 3, 4, 5] as const;
export const DifficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export type Difficulty = z.infer<typeof DifficultySchema>;

function checkUniqueEntityIds<T extends { id: string }>(
  items: T[],
  ctx: z.RefinementCtx,
  field: string,
) {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate id '${item.id}' in ${field} at index ${index}`,
        path: [field, index, 'id'],
      });
    }
    seen.add(item.id);
  });
}

export const CaseDefinitionBaseSchema = z.object({
  id: IdSchema,
  version: z.number().int().min(1, 'Version must be at least 1'),
  kind: CaseKindSchema,
  title: z.string().min(1, 'Title cannot be empty'),
  difficulty: DifficultySchema,
  estimatedMinutes: z.number().int().min(1, 'Estimated minutes must be positive'),
  mysteryType: z.string().min(1, 'Mystery type cannot be empty'),
  setting: SettingSchema,
  briefing: z.string().min(1, 'Briefing cannot be empty'),
  characters: z.array(CharacterSchema),
  locations: z.array(LocationSchema),
  objects: z.array(GameObjectSchema),
  clues: z.array(ClueSchema),
  hypotheses: z
    .array(HypothesisSchema)
    .min(2, 'Must have at least 2 hypotheses')
    .max(5, 'Cannot exceed 5 hypotheses'),
  interviews: z.array(InterviewSchema).optional(),
  truth: GroundTruthSchema,
  conspiracyHooks: z.array(ConspiracyHookSchema).optional(),
  meta: CaseMetaSchema,
});

export const CaseDefinitionSchema = CaseDefinitionBaseSchema.superRefine((data, ctx) => {
  checkUniqueEntityIds(data.characters, ctx, 'characters');
  checkUniqueEntityIds(data.locations, ctx, 'locations');
  checkUniqueEntityIds(data.objects, ctx, 'objects');
  checkUniqueEntityIds(data.clues, ctx, 'clues');
  checkUniqueEntityIds(data.hypotheses, ctx, 'hypotheses');
});

export type CaseDefinition = z.infer<typeof CaseDefinitionBaseSchema>;

export const CasePublicSchema = z.object({
  id: IdSchema,
  version: z.number().int().min(1),
  kind: CaseKindSchema,
  title: z.string().min(1),
  difficulty: DifficultySchema,
  estimatedMinutes: z.number().int().min(1),
  mysteryType: z.string().min(1),
  setting: SettingSchema,
  briefing: z.string().min(1),
  characters: z.array(CharacterSchema),
  locations: z.array(LocationSchema),
  objects: z.array(GameObjectSchema),
  clues: z.array(PublicClueSchema),
  lockedClueIds: z.array(IdSchema).default([]),
  hypotheses: z.array(PublicHypothesisSchema),
  interviews: z.array(InterviewSchema).optional(),
  conspiracyHooks: z.array(ConspiracyHookSchema).optional(),
  meta: CasePublicMetaSchema,
});

export type CasePublic = z.infer<typeof CasePublicSchema>;
