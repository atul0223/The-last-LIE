import { z } from 'zod';
import { IdSchema } from './fact.js';
import { ClueSchema } from './clue.js';
import { GroundTruthSchema, RevealBeatSchema } from './case.js';

export const ContradictionLinkSchema = z.object({
  a: IdSchema,
  b: IdSchema,
  ruleId: z.string().optional(),
  explanation: z.string().optional(),
});
export type ContradictionLink = z.infer<typeof ContradictionLinkSchema>;

export const SubmissionSchema = z.object({
  sessionId: IdSchema,
  hypothesisId: IdSchema,
  supportingClueIds: z.array(IdSchema).max(3, 'supportingClueIds cannot exceed 3 clues'),
  contradictions: z.array(ContradictionLinkSchema).max(20, 'contradictions cannot exceed 20 links'),
});
export type Submission = z.infer<typeof SubmissionSchema>;

export const ScoreBreakdownSchema = z.object({
  correctHypothesis: z.boolean(),
  hypothesisPoints: z.number(),
  evidencePoints: z.number(),
  contradictionPoints: z.number(),
  penaltyPoints: z.number(),
  multiplier: z.number(),
  validLinksCount: z.number().int().optional(),
  badLinksCount: z.number().int().optional(),
  requestCost: z.number().int().optional(),
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

export const ScoreResultSchema = z.object({
  score: z.number().int().min(0, 'Score cannot be negative'),
  breakdown: ScoreBreakdownSchema,
  xp: z.number().int().min(0, 'XP cannot be negative'),
});
export type ScoreResult = z.infer<typeof ScoreResultSchema>;

export const RevealSchema = z.object({
  caseId: IdSchema,
  solutionHypothesisId: IdSchema,
  explanation: z.array(RevealBeatSchema),
  truth: GroundTruthSchema.optional(),
  allClues: z.array(ClueSchema),
  culprits: z.array(IdSchema),
  validLinks: z.array(ContradictionLinkSchema).default([]),
  invalidLinks: z.array(ContradictionLinkSchema).default([]),
});
export type Reveal = z.infer<typeof RevealSchema>;
