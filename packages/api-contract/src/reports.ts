import { z } from 'zod';

export const CASE_REPORT_REASONS = [
  'broken_logic',
  'unfair',
  'typo',
  'offensive',
  'other',
] as const;
export const CaseReportReasonSchema = z.enum(CASE_REPORT_REASONS);
export type CaseReportReason = z.infer<typeof CaseReportReasonSchema>;

// POST /cases/:id/report
export const CaseReportRequestSchema = z
  .object({
    reason: CaseReportReasonSchema,
    note: z.string().max(280, 'Note must not exceed 280 characters').optional(),
  })
  .strict();
export type CaseReportRequest = z.infer<typeof CaseReportRequestSchema>;

export const CaseReportResponseSchema = z
  .object({
    success: z.boolean(),
    reportId: z.string(),
    caseId: z.string(),
  })
  .strict();
export type CaseReportResponse = z.infer<typeof CaseReportResponseSchema>;
