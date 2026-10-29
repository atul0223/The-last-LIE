import { z } from 'zod';
import { IdSchema } from './fact.js';

export const BoardCardSchema = z.object({
  id: IdSchema,
  x: z.number(),
  y: z.number(),
  pinned: z.boolean().optional(),
});
export type BoardCard = z.infer<typeof BoardCardSchema>;

export const BoardLinkSchema = z.object({
  a: IdSchema,
  b: IdSchema,
  explanation: z.string().optional(),
});
export type BoardLink = z.infer<typeof BoardLinkSchema>;

export const BoardStateSchema = z.object({
  cards: z.array(BoardCardSchema).default([]),
  links: z.array(BoardLinkSchema).default([]),
});
export type BoardState = z.infer<typeof BoardStateSchema>;

export const SESSION_MODES = ['normal', 'daily', 'challenge', 'replay'] as const;
export const SessionModeSchema = z.enum(SESSION_MODES);
export type SessionMode = z.infer<typeof SessionModeSchema>;

export const SESSION_STATUSES = ['in_progress', 'submitted', 'abandoned'] as const;
export const SessionStatusSchema = z.enum(SESSION_STATUSES);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionStateSchema = z.object({
  id: IdSchema,
  userId: IdSchema.optional(),
  caseId: IdSchema,
  caseVersion: z.number().int().min(1, 'Case version must be positive'),
  mode: SessionModeSchema,
  unlockedClueIds: z.array(IdSchema).default([]),
  board: BoardStateSchema.default({ cards: [], links: [] }),
  status: SessionStatusSchema.default('in_progress'),
  startedAt: z.string().min(1, 'startedAt cannot be empty'),
  submittedAt: z.string().optional(),
});
export type SessionState = z.infer<typeof SessionStateSchema>;
