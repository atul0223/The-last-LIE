import { z } from 'zod';

export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'TOO_MANY_REQUESTS',
  'PAYLOAD_TOO_LARGE',
  'UNPROCESSABLE_ENTITY',
  'INTERNAL_SERVER_ERROR',
  // Domain specific error codes
  'SESSION_ALREADY_SUBMITTED',
  'SESSION_NOT_FOUND',
  'CLUE_ALREADY_UNLOCKED',
  'UNLOCK_CONDITION_NOT_MET',
  'CHALLENGE_NOT_FOUND',
  'CHALLENGE_EXPIRED',
  'GUEST_TOKEN_INVALID',
  'GUEST_TOKEN_EXPIRED',
  'ALREADY_ATTACHED',
  'WEEKLY_WINDOW_CLOSED',
  'WEEKLY_NOT_CLOSED',
  'SUBMISSION_REQUIRED',
  'INVALID_CREDENTIALS',
] as const;

export const ApiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorSchema = z
  .object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    requestId: z.string().optional(),
  })
  .strict();
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiErrorEnvelopeSchema = z
  .object({
    error: ApiErrorSchema,
  })
  .strict();
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;
