import { type AdminOpsClient, validateProdConfirmation } from './types.js';

export interface SetWeeklyOptions {
  caseId: string;
  open: string; // ISO date
  close: string; // ISO date
  env: 'local' | 'staging' | 'prod';
  dryRun?: boolean;
  confirmProd?: boolean;
  client?: AdminOpsClient;
}

export interface SetWeeklyResult {
  success: boolean;
  applied: boolean;
  weeklyId: string;
  caseId: string;
  startsAt: string;
  endsAt: string;
  message?: string;
}

export async function handleAdminSetWeekly(options: SetWeeklyOptions): Promise<SetWeeklyResult> {
  const { caseId, open, close, env, dryRun = true, confirmProd = false, client } = options;

  validateProdConfirmation(env, dryRun, confirmProd);

  const openDate = new Date(open);
  const closeDate = new Date(close);

  if (isNaN(openDate.getTime())) {
    throw new Error(`Invalid --open ISO timestamp '${open}'.`);
  }
  if (isNaN(closeDate.getTime())) {
    throw new Error(`Invalid --close ISO timestamp '${close}'.`);
  }
  if (openDate >= closeDate) {
    throw new Error(`--open timestamp must be before --close timestamp.`);
  }

  const weeklyId = `weekly_${openDate.toISOString().split('T')[0]}_${caseId}`;

  if (client?.getCase) {
    const caseRow = await client.getCase(caseId);
    if (!caseRow) {
      throw new Error(`Case '${caseId}' does not exist.`);
    }
    if (caseRow.status !== 'published') {
      throw new Error(`Case '${caseId}' has status '${caseRow.status}' (must be 'published' to set as weekly).`);
    }
  }

  if (!dryRun && client?.setWeeklyCase) {
    await client.setWeeklyCase({
      id: weeklyId,
      caseId,
      startsAt: openDate.toISOString(),
      endsAt: closeDate.toISOString(),
    });
  }

  return {
    success: true,
    applied: !dryRun,
    weeklyId,
    caseId,
    startsAt: openDate.toISOString(),
    endsAt: closeDate.toISOString(),
    message: dryRun ? 'Dry run preview completed.' : 'Weekly case successfully configured.',
  };
}
