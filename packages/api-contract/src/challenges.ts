import { z } from 'zod';
import { CasePublicSchema } from '@lastlie/case-engine';

// POST /challenges
export const CreateChallengeRequestSchema = z
  .object({
    sessionId: z.string().min(1, 'sessionId cannot be empty'),
  })
  .strict();
export type CreateChallengeRequest = z.infer<typeof CreateChallengeRequestSchema>;

export const CreateChallengeResponseSchema = z
  .object({
    code: z.string(),
    url: z.string(),
    expiresAt: z.string(),
  })
  .strict();
export type CreateChallengeResponse = z.infer<typeof CreateChallengeResponseSchema>;

// GET /challenges/:code
export const GetChallengeResponseSchema = z
  .object({
    code: z.string(),
    caseId: z.string(),
    caseVersion: z.number().int().min(1),
    creatorDisplayName: z.string().optional(),
    expiresAt: z.string(),
    case: CasePublicSchema,
  })
  .strict();
export type GetChallengeResponse = z.infer<typeof GetChallengeResponseSchema>;

// POST /challenges/:code/guest
export const CreateGuestTokenRequestSchema = z
  .object({
    guestId: z.string().optional(),
  })
  .strict();
export type CreateGuestTokenRequest = z.infer<typeof CreateGuestTokenRequestSchema>;

export const CreateGuestTokenResponseSchema = z
  .object({
    guestToken: z.string(),
    expiresAt: z.string(),
  })
  .strict();
export type CreateGuestTokenResponse = z.infer<typeof CreateGuestTokenResponseSchema>;

// GET /challenges/:code/compare
export const ChallengeClueUsageSchema = z
  .object({
    clueId: z.string(),
    count: z.number().int().min(0),
  })
  .strict();
export type ChallengeClueUsage = z.infer<typeof ChallengeClueUsageSchema>;

export const ChallengeCompareResponseSchema = z
  .object({
    code: z.string(),
    totalParticipants: z.number().int().min(0),
    hypothesisDistribution: z.record(z.string(), z.number().int().min(0)),
    mostUsedClues: z.array(ChallengeClueUsageSchema),
  })
  .strict();
export type ChallengeCompareResponse = z.infer<typeof ChallengeCompareResponseSchema>;
