import { z } from 'zod';
import { DifficultySchema } from '../schema/case.js';
import type { Difficulty } from '../schema/case.js';
import { SessionModeSchema } from '../schema/session.js';
import type { SessionMode } from '../schema/session.js';

export const DETECTIVE_RANKS = [
  'Trainee',
  'Investigator',
  'Specialist',
  'Senior Detective',
  'Master Detective',
] as const;

export const DetectiveRankSchema = z.enum(DETECTIVE_RANKS);
export type DetectiveRank = z.infer<typeof DetectiveRankSchema>;

export const MasteryGateSchema = z.object({
  minDifficulty: DifficultySchema,
  qualifyingSolves: z.number().int().min(0),
  minEvidenceQuality: z.number().min(0).max(1).default(0.6),
});
export type MasteryGate = z.infer<typeof MasteryGateSchema>;

export const RankDefinitionSchema = z.object({
  id: DetectiveRankSchema,
  level: z.number().int().min(1),
  name: z.string().min(1),
  xpThreshold: z.number().int().min(0),
  masteryGate: MasteryGateSchema,
});
export type RankDefinition = z.infer<typeof RankDefinitionSchema>;

export const ProgressionConfigSchema = z.object({
  ranks: z.array(RankDefinitionSchema).min(1, 'Progression config must have at least one rank'),
  difficultyMultipliers: z.object({
    1: z.number().positive(),
    2: z.number().positive(),
    3: z.number().positive(),
    4: z.number().positive(),
    5: z.number().positive(),
  }),
  replayMultiplier: z.number().positive().default(0.25),
});
export type ProgressionConfig = z.infer<typeof ProgressionConfigSchema>;

export const MasteryCountsSchema = z.object({
  1: z.number().int().min(0).default(0),
  2: z.number().int().min(0).default(0),
  3: z.number().int().min(0).default(0),
  4: z.number().int().min(0).default(0),
  5: z.number().int().min(0).default(0),
});
export type MasteryCounts = z.infer<typeof MasteryCountsSchema>;

export const PlayerProgressSchema = z.object({
  userId: z.string().optional(),
  xp: z.number().int().min(0).default(0),
  rank: DetectiveRankSchema.default('Trainee'),
  solvedCount: z.number().int().min(0).default(0),
  correctCount: z.number().int().min(0).default(0),
  mastery: MasteryCountsSchema.default({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }),
  solvedCaseIds: z.array(z.string()).default([]),
  unlockedDossierIds: z.array(z.string()).default([]),
  updatedAt: z.string().optional(),
});
export type PlayerProgress = z.infer<typeof PlayerProgressSchema>;

export const CaseProgressionMetaSchema = z.object({
  id: z.string().min(1),
  difficulty: DifficultySchema,
  mode: SessionModeSchema.optional(),
  characters: z
    .array(
      z.union([
        z.string(),
        z.object({
          id: z.string(),
          name: z.string().optional(),
        }),
      ]),
    )
    .optional(),
});
export interface CaseProgressionMeta {
  id: string;
  difficulty: Difficulty;
  mode?: SessionMode;
  characters?: Array<string | { id: string; name?: string }>;
}

export const XpGainedEventSchema = z.object({
  type: z.literal('xp_gained'),
  amount: z.number().int().min(0),
  totalXp: z.number().int().min(0),
});
export type XpGainedEvent = z.infer<typeof XpGainedEventSchema>;

export const RankUpEventSchema = z.object({
  type: z.literal('rank_up'),
  previousRank: DetectiveRankSchema,
  newRank: DetectiveRankSchema,
});
export type RankUpEvent = z.infer<typeof RankUpEventSchema>;

export const MasteryProgressEventSchema = z.object({
  type: z.literal('mastery_progress'),
  difficulty: DifficultySchema,
  currentCount: z.number().int().min(0),
});
export type MasteryProgressEvent = z.infer<typeof MasteryProgressEventSchema>;

export const UnlockEventSchema = z.object({
  type: z.literal('unlock'),
  kind: z.string().min(1),
  id: z.string().min(1),
  description: z.string().optional(),
});
export type UnlockEvent = z.infer<typeof UnlockEventSchema>;

export const ProgressionEventSchema = z.discriminatedUnion('type', [
  XpGainedEventSchema,
  RankUpEventSchema,
  MasteryProgressEventSchema,
  UnlockEventSchema,
]);
export type ProgressionEvent = z.infer<typeof ProgressionEventSchema>;

export interface NextRankRequirements {
  currentRank: DetectiveRank;
  nextRank: DetectiveRank | null;
  currentXp: number;
  targetXp: number | null;
  xpMissing: number;
  masteryGate: {
    minDifficulty: Difficulty;
    qualifyingSolves: number;
    currentSolves: number;
    solvesMissing: number;
    minEvidenceQuality: number;
  } | null;
  isMaxRank: boolean;
  canRankUp: boolean;
}
