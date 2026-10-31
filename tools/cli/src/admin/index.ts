import type { Command } from 'commander';
import { handleAdminReports } from './reports.js';

export function registerAdminCommands(program: Command): void {
  const admin = program.command('admin').description('Administrative and moderation tooling');

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
}
