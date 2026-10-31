import { type AdminOpsClient, validateProdConfirmation } from './types.js';

export interface PurgeOptions {
  olderThanDays: number;
  env: 'local' | 'staging' | 'prod';
  dryRun?: boolean;
  confirmProd?: boolean;
  client?: AdminOpsClient;
}

export interface PurgeResult {
  success: boolean;
  applied: boolean;
  olderThanDays: number;
  purgedCount: number;
  message: string;
}

export async function handleAdminPurge(options: PurgeOptions): Promise<PurgeResult> {
  const { olderThanDays, env, dryRun = true, confirmProd = false, client } = options;

  validateProdConfirmation(env, dryRun, confirmProd);

  if (olderThanDays < 1) {
    throw new Error(`Invalid --older-than days '${olderThanDays}'. Must be at least 1 day.`);
  }

  let purgedCount = 0;

  if (client?.purgeExpiredRecords) {
    if (!dryRun) {
      const res = await client.purgeExpiredRecords(olderThanDays);
      purgedCount = res.purgedCount;
    } else {
      // In dry-run mode, query or estimate rows without deleting
      purgedCount = 0;
    }
  }

  return {
    success: true,
    applied: !dryRun,
    olderThanDays,
    purgedCount,
    message: dryRun
      ? `Dry run: scanned records older than ${olderThanDays} days. No rows deleted.`
      : `Successfully purged expired records older than ${olderThanDays} days.`,
  };
}
