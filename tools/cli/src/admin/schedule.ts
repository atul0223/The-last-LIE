import { type AdminOpsClient, validateProdConfirmation } from './types.js';

export interface ScheduleDailyOptions {
  from: string; // YYYY-MM-DD
  days: number;
  env: 'local' | 'staging' | 'prod';
  dryRun?: boolean;
  confirmProd?: boolean;
  client?: AdminOpsClient;
}

export interface ScheduleDailyResult {
  success: boolean;
  applied: boolean;
  planned: Array<{ date: string; caseId: string; title?: string }>;
  message?: string;
}

export async function handleAdminScheduleDaily(options: ScheduleDailyOptions): Promise<ScheduleDailyResult> {
  const { from, days, env, dryRun = true, confirmProd = false, client } = options;

  validateProdConfirmation(env, dryRun, confirmProd);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    throw new Error(`Invalid --from date format '${from}'. Expected YYYY-MM-DD.`);
  }

  if (days <= 0 || days > 365) {
    throw new Error(`Invalid --days '${days}'. Must be between 1 and 365.`);
  }

  // Generate date list
  const planned: Array<{ date: string; caseId: string; title?: string }> = [];
  const fromDate = new Date(`${from}T00:00:00Z`);

  if (!client) {
    // Mock simulation for offline run
    for (let i = 0; i < days; i++) {
      const d = new Date(fromDate.getTime() + i * 86400 * 1000);
      const dateStr = d.toISOString().split('T')[0]!;
      planned.push({
        date: dateStr,
        caseId: `case_sim_${(i % 4) + 1}`,
        title: `Simulated Candidate ${(i % 4) + 1}`,
      });
    }

    return {
      success: true,
      applied: false,
      planned,
      message: dryRun
        ? 'Dry run: simulated schedule generated.'
        : 'Offline mode: specify an admin client to apply to a live database.',
    };
  }

  const eligible = (await client.listEligibleDailyCases?.()) || [];
  if (eligible.length === 0) {
    return {
      success: false,
      applied: false,
      planned: [],
      message: 'No published cases tagged daily_eligible found in the pool.',
    };
  }

  for (let i = 0; i < days; i++) {
    const d = new Date(fromDate.getTime() + i * 86400 * 1000);
    const dateStr = d.toISOString().split('T')[0]!;
    const candidate = eligible[i % eligible.length]!;

    planned.push({
      date: dateStr,
      caseId: candidate.id,
      title: candidate.title,
    });

    if (!dryRun && client.setDailyCase) {
      await client.setDailyCase(dateStr, candidate.id);
    }
  }

  return {
    success: true,
    applied: !dryRun,
    planned,
  };
}
