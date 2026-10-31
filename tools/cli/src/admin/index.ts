import type { Command } from 'commander';
import { handleAdminReports } from './reports.js';
import { handleAdminScheduleDaily } from './schedule.js';
import { handleAdminSetWeekly } from './weekly.js';
import { handleAdminRetireCase } from './retire.js';
import { handleAdminPurge } from './purge.js';

export * from './types.js';
export * from './reports.js';
export * from './schedule.js';
export * from './weekly.js';
export * from './retire.js';
export * from './purge.js';

export function registerAdminCommands(program: Command): void {
  const admin = program.command('admin').description('Administrative and operations tooling');

  // 1. admin reports
  admin
    .command('reports')
    .description('List flagged cases and moderation reports (local/staging only)')
    .option('--env <environment>', 'Deployment environment: local, staging, or prod', 'local')
    .action(async (options: { env: string }) => {
      const res = await handleAdminReports({ env: options.env as 'local' | 'staging' | 'prod' });
      if (!res.success) {
        console.error(`[ADMIN ERROR] ${res.message}`);
        process.exitCode = 1;
        return;
      }

      console.log(`\n=== MODERATION: FLAGGED CASES (${options.env.toUpperCase()}) ===`);
      if (res.cases.length === 0) {
        console.log('No cases currently flagged or under review.');
        return;
      }

      for (const c of res.cases) {
        console.log(`\n[!] Case ID: ${c.caseId} (${c.title}) - Status: ${c.status}`);
        console.log(`    Recent Reports (7d): ${c.recentReportCount} from ${c.distinctReportingUsers} distinct users`);
        console.log(`    Reasons: ${JSON.stringify(c.reasons)}`);
        console.log(`    Latest Report: ${c.latestReportAt}`);
      }
    });

  // 2. admin schedule-daily --from <YYYY-MM-DD> --days <N>
  admin
    .command('schedule-daily')
    .description('Schedule daily eligible cases into daily_cases queue')
    .requiredOption('--from <date>', 'Starting date in YYYY-MM-DD format')
    .requiredOption('--days <count>', 'Number of consecutive days to schedule', (v) => parseInt(v, 10))
    .option('--env <environment>', 'Deployment environment: local, staging, or prod', 'local')
    .option('--no-dry-run', 'Apply schedule changes to database (default is dry-run preview)')
    .option('--yes', 'Confirm execution on production environment', false)
    .action(async (options: { from: string; days: number; env: string; dryRun: boolean; yes: boolean }) => {
      try {
        const res = await handleAdminScheduleDaily({
          from: options.from,
          days: options.days,
          env: options.env as 'local' | 'staging' | 'prod',
          dryRun: options.dryRun,
          confirmProd: options.yes,
        });

        console.log(`\n=== DAILY SCHEDULE PLAN (${options.env.toUpperCase()}) ===`);
        console.log(`Status: ${res.applied ? 'APPLIED TO DB' : 'DRY RUN PREVIEW'}`);
        for (const item of res.planned) {
          console.log(`  ${item.date}: ${item.caseId} (${item.title || 'Untitled'})`);
        }
      } catch (err: unknown) {
        console.error(`[ADMIN ERROR] ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });

  // 3. admin set-weekly --case <id> --open <ISO> --close <ISO>
  admin
    .command('set-weekly')
    .description('Configure a weekly community case window')
    .requiredOption('--case <caseId>', 'Case identifier to feature as weekly case')
    .requiredOption('--open <isoDate>', 'Window opening timestamp in ISO format')
    .requiredOption('--close <isoDate>', 'Window closing timestamp in ISO format')
    .option('--env <environment>', 'Deployment environment: local, staging, or prod', 'local')
    .option('--no-dry-run', 'Apply changes to database (default is dry-run preview)')
    .option('--yes', 'Confirm execution on production environment', false)
    .action(async (options: { case: string; open: string; close: string; env: string; dryRun: boolean; yes: boolean }) => {
      try {
        const res = await handleAdminSetWeekly({
          caseId: options.case,
          open: options.open,
          close: options.close,
          env: options.env as 'local' | 'staging' | 'prod',
          dryRun: options.dryRun,
          confirmProd: options.yes,
        });

        console.log(`\n=== WEEKLY CASE CONFIGURATION (${options.env.toUpperCase()}) ===`);
        console.log(`Status:  ${res.applied ? 'APPLIED TO DB' : 'DRY RUN PREVIEW'}`);
        console.log(`ID:      ${res.weeklyId}`);
        console.log(`Case:    ${res.caseId}`);
        console.log(`Window:  ${res.startsAt} -> ${res.endsAt}`);
      } catch (err: unknown) {
        console.error(`[ADMIN ERROR] ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });

  // 4. admin retire-case <caseId>
  admin
    .command('retire-case <caseId>')
    .description('Retire a case to prevent future daily/weekly scheduling')
    .option('--env <environment>', 'Deployment environment: local, staging, or prod', 'local')
    .option('--no-dry-run', 'Apply retirement to database (default is dry-run preview)')
    .option('--yes', 'Confirm execution on production environment', false)
    .action(async (caseId: string, options: { env: string; dryRun: boolean; yes: boolean }) => {
      try {
        const res = await handleAdminRetireCase({
          caseId,
          env: options.env as 'local' | 'staging' | 'prod',
          dryRun: options.dryRun,
          confirmProd: options.yes,
        });

        console.log(`\n=== RETIRE CASE (${options.env.toUpperCase()}) ===`);
        console.log(`Status:  ${res.applied ? 'RETIRED IN DB' : 'DRY RUN PREVIEW'}`);
        console.log(`Case ID: ${res.caseId}`);
        console.log(`Message: ${res.message}`);
      } catch (err: unknown) {
        console.error(`[ADMIN ERROR] ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });

  // 5. admin purge --older-than <days>
  admin
    .command('purge')
    .description('Purge expired guest challenge attempts and rate limit rows (data retention)')
    .requiredOption('--older-than <days>', 'Data retention window in days', (v) => parseInt(v, 10))
    .option('--env <environment>', 'Deployment environment: local, staging, or prod', 'local')
    .option('--no-dry-run', 'Apply purge to database (default is dry-run preview)')
    .option('--yes', 'Confirm execution on production environment', false)
    .action(async (options: { olderThan: number; env: string; dryRun: boolean; yes: boolean }) => {
      try {
        const res = await handleAdminPurge({
          olderThanDays: options.olderThan,
          env: options.env as 'local' | 'staging' | 'prod',
          dryRun: options.dryRun,
          confirmProd: options.yes,
        });

        console.log(`\n=== DATA RETENTION PURGE (${options.env.toUpperCase()}) ===`);
        console.log(`Status:  ${res.applied ? 'PURGED FROM DB' : 'DRY RUN PREVIEW'}`);
        console.log(`Window:  Older than ${res.olderThanDays} days`);
        console.log(`Purged:  ${res.purgedCount} rows`);
        console.log(`Message: ${res.message}`);
      } catch (err: unknown) {
        console.error(`[ADMIN ERROR] ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
}
