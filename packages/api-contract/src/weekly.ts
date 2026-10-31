import { z } from 'zod';
import { CasePublicSchema } from '@lastlie/case-engine';

// GET /weekly
export const WeeklyCaseResponseSchema = z
  .object({
    id: z.string(),
    caseId: z.string(),
    weekNumber: z.number().int(),
    year: z.number().int(),
    opensAt: z.string(),
    closesAt: z.string(),
    isOpen: z.boolean(),
    case: CasePublicSchema.optional(),
  })
  .strict();
export type WeeklyCaseResponse = z.infer<typeof WeeklyCaseResponseSchema>;

// GET /weekly/:id/aggregate
export const WeeklyLeaderboardEntrySchema = z
  .object({
    userId: z.string(),
    displayName: z.string(),
    score: z.number().int(),
    submittedAt: z.string(),
    rank: z.number().int(),
  })
  .strict();
export type WeeklyLeaderboardEntry = z.infer<typeof WeeklyLeaderboardEntrySchema>;

export const WeeklyAggregateResponseSchema = z
  .object({
    weeklyId: z.string(),
    totalParticipants: z.number().int(),
    hypothesisDistribution: z.record(z.string(), z.number().int()),
    clueUsage: z.record(z.string(), z.number().int()),
    averageScore: z.number(),
    leaderboard: z.array(WeeklyLeaderboardEntrySchema),
  })
  .strict();
export type WeeklyAggregateResponse = z.infer<typeof WeeklyAggregateResponseSchema>;
