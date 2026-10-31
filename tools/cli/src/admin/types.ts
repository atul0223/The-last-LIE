export interface AdminOpsClient {
  listEligibleDailyCases?(): Promise<Array<{ id: string; title: string; status: string }>>;
  getDailyCasesRange?(from: string, to: string): Promise<Array<{ date: string; caseId: string }>>;
  setDailyCase?(date: string, caseId: string): Promise<void>;
  getCase?(caseId: string): Promise<{ id: string; title: string; status: string } | null>;
  setWeeklyCase?(weekly: { id: string; caseId: string; startsAt: string; endsAt: string }): Promise<void>;
  retireCase?(caseId: string): Promise<boolean>;
  purgeExpiredRecords?(olderThanDays: number): Promise<{ purgedCount: number }>;
}

export function validateProdConfirmation(env: 'local' | 'staging' | 'prod', dryRun: boolean, confirmProd?: boolean): void {
  if (env === 'prod' && !dryRun && !confirmProd) {
    throw new Error('Production operations without dry-run require explicit confirmation (--yes).');
  }
}
