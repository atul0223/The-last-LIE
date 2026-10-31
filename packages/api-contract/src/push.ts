import { z } from 'zod';

export const PUSH_PLATFORMS = ['ios', 'android', 'web'] as const;
export const PushPlatformSchema = z.enum(PUSH_PLATFORMS);
export type PushPlatform = z.infer<typeof PushPlatformSchema>;

// POST /push/token
export const RegisterPushTokenRequestSchema = z
  .object({
    token: z.string().min(1, 'Push token cannot be empty'),
    platform: PushPlatformSchema.optional(),
  })
  .strict();
export type RegisterPushTokenRequest = z.infer<typeof RegisterPushTokenRequestSchema>;

export const RegisterPushTokenResponseSchema = z
  .object({
    success: z.boolean(),
  })
  .strict();
export type RegisterPushTokenResponse = z.infer<typeof RegisterPushTokenResponseSchema>;

// DELETE /push/token
export const UnregisterPushTokenRequestSchema = z
  .object({
    token: z.string().optional(),
  })
  .strict();
export type UnregisterPushTokenRequest = z.infer<typeof UnregisterPushTokenRequestSchema>;

export const UnregisterPushTokenResponseSchema = z
  .object({
    success: z.boolean(),
  })
  .strict();
export type UnregisterPushTokenResponse = z.infer<typeof UnregisterPushTokenResponseSchema>;
