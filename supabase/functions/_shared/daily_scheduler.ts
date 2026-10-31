import type { Clock, Repository } from './types.js';

export async function fillDailyCasesAhead(
  repo: Repository,
  clock: Clock,
  daysAhead = 14,
): Promise<number> {
  const published = await repo.listPublishedCases();
  if (published.length === 0) return 0;

  const now = clock.now();
  let filledCount = 0;

  for (let i = 0; i <= daysAhead; i++) {
    const targetDate = new Date(now.getTime() + i * 24 * 3600 * 1000)
      .toISOString()
      .split('T')[0]!;

    const existingCaseId = await repo.getDailyCase(targetDate);
    if (existingCaseId) continue;

    // Fetch existing daily cases in 90-day window to avoid reuse
    const recentDailies = await repo.listDailyCases(90);
    const recentCaseIds = new Set(recentDailies.map((d) => d.caseId));

    // Find candidate not used in last 90 days
    const eligible = published.filter((c) => !recentCaseIds.has(c.id));
    const candidate = eligible.length > 0 ? eligible[0]! : published[0]!;

    await repo.setDailyCase(targetDate, candidate.id);
    filledCount++;
  }

  return filledCount;
}
