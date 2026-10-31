import { z } from 'zod';
import { CasePublicSchema } from '@lastlie/case-engine';

// GET /daily
export const DailyCaseResponseSchema = z
  .object({
    date: z.string(), // YYYY-MM-DD
    caseId: z.string(),
    case: CasePublicSchema.optional(),
  })
  .strict();
export type DailyCaseResponse = z.infer<typeof DailyCaseResponseSchema>;
