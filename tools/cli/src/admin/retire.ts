import { type AdminOpsClient, validateProdConfirmation } from './types.js';

export interface RetireCaseOptions {
  caseId: string;
  env: 'local' | 'staging' | 'prod';
  dryRun?: boolean;
  confirmProd?: boolean;
  client?: AdminOpsClient;
}

export interface RetireCaseResult {
  success: boolean;
  applied: boolean;
  caseId: string;
  message: string;
}

export async function handleAdminRetireCase(options: RetireCaseOptions): Promise<RetireCaseResult> {
  const { caseId, env, dryRun = true, confirmProd = false, client } = options;

  validateProdConfirmation(env, dryRun, confirmProd);

  if (client?.getCase) {
    const caseRow = await client.getCase(caseId);
    if (!caseRow) {
      throw new Error(`Case '${caseId}' does not exist.`);
    }
    if (caseRow.status === 'retired') {
      return {
        success: true,
        applied: false,
        caseId,
        message: `Case '${caseId}' is already retired.`,
      };
    }
  }

  if (!dryRun && client?.retireCase) {
    await client.retireCase(caseId);
  }

  return {
    success: true,
    applied: !dryRun,
    caseId,
    message: dryRun
      ? `Dry run: case '${caseId}' would be retired and excluded from future daily/weekly scheduling.`
      : `Case '${caseId}' has been retired.`,
  };
}
