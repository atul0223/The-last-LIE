import { z } from 'zod';

// POST /account/migrate-local
export const LocalResultMigrationSchema = z
  .object({
    caseId: z.string().min(1),
    completedAt: z.string(),
  })
  .strict();
export type LocalResultMigration = z.infer<typeof LocalResultMigrationSchema>;

export const MigrateLocalRequestSchema = z
  .object({
    solvedCaseIds: z.array(z.string()).default([]),
    localResults: z.array(LocalResultMigrationSchema).default([]),
  })
  .strict();
export type MigrateLocalRequest = z.infer<typeof MigrateLocalRequestSchema>;

export const MigrateLocalResponseSchema = z
  .object({
    success: z.boolean(),
    unlockedCaseIds: z.array(z.string()),
    message: z.string(),
  })
  .strict();
export type MigrateLocalResponse = z.infer<typeof MigrateLocalResponseSchema>;

// DELETE /account
export const DeleteAccountResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
  })
  .strict();
export type DeleteAccountResponse = z.infer<typeof DeleteAccountResponseSchema>;
