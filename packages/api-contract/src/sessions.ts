import { z } from 'zod';
import {
  BoardStateSchema,
  CasePublicSchema,
  ClueUnlockSchema,
  ContradictionLinkSchema,
  PlayerProgressSchema,
  PublicClueSchema,
  RevealSchema,
  ScoreResultSchema,
  SessionModeSchema,
  SessionStateSchema,
} from '@lastlie/case-engine';

// POST /sessions
export const CreateSessionRequestSchema = z
  .object({
    caseId: z.string().optional(),
    mode: SessionModeSchema.optional().default('normal'),
    challengeId: z.string().optional(),
  })
  .strict();
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const CreateSessionResponseSchema = z
  .object({
    session: SessionStateSchema,
    case: CasePublicSchema,
  })
  .strict();
export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;

// POST /sessions/:id/unlock
export const UnlockClueRequestSchema = z
  .object({
    clueId: z.string().min(1, 'clueId cannot be empty'),
    via: ClueUnlockSchema,
  })
  .strict();
export type UnlockClueRequest = z.infer<typeof UnlockClueRequestSchema>;

export const UnlockClueResponseSchema = z
  .object({
    clue: PublicClueSchema,
    unlockedClueIds: z.array(z.string()),
  })
  .strict();
export type UnlockClueResponse = z.infer<typeof UnlockClueResponseSchema>;

// PUT /sessions/:id/board
export const SaveBoardRequestSchema = z
  .object({
    board: BoardStateSchema,
  })
  .strict();
export type SaveBoardRequest = z.infer<typeof SaveBoardRequestSchema>;

export const SaveBoardResponseSchema = z
  .object({
    success: z.boolean(),
    updatedAt: z.string(),
  })
  .strict();
export type SaveBoardResponse = z.infer<typeof SaveBoardResponseSchema>;

// POST /sessions/:id/submit
export const SubmitSessionRequestSchema = z
  .object({
    hypothesisId: z.string().min(1, 'hypothesisId cannot be empty'),
    supportingClueIds: z.array(z.string()).max(3, 'Cannot cite more than 3 supporting clues'),
    contradictions: z.array(ContradictionLinkSchema).max(20, 'Cannot submit more than 20 contradictions'),
  })
  .strict();
export type SubmitSessionRequest = z.infer<typeof SubmitSessionRequestSchema>;

export const SubmitSessionResponseSchema = z
  .object({
    result: ScoreResultSchema,
    reveal: RevealSchema,
    progress: PlayerProgressSchema,
    tooFast: z.boolean().optional(),
  })
  .strict();
export type SubmitSessionResponse = z.infer<typeof SubmitSessionResponseSchema>;
