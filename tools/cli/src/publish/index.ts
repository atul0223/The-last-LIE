import type { Command } from 'commander';
import { publishCases } from './publisher.js';

export function registerPublishCommand(program: Command): void {
  program
    .command('publish <glob>')
    .description('Validate and publish case definitions to remote game backend')
    .requiredOption(
      '--env <environment>',
      'Target deployment environment: local, staging, or prod',
      'local',
    )
    .option('--dry-run', 'Validate and display publish plan without writing to database', false)
    .option('--yes', 'Skip confirmation prompt for prod deployments', false)
    .action(async (glob: string, options: { env: string; dryRun: boolean; yes: boolean }) => {
      const env = options.env.toLowerCase();
      if (!['local', 'staging', 'prod'].includes(env)) {
        console.error(`Invalid environment '${options.env}'. Must be local, staging, or prod.`);
        process.exitCode = 1;
        return;
      }

      console.log(`Publishing cases matching '${glob}' to ${env} (dryRun: ${options.dryRun})...`);

      const res = await publishCases({
        globPattern: glob,
        env: env as 'local' | 'staging' | 'prod',
        dryRun: options.dryRun,
        confirmProd: options.yes,
      });

      console.log(`\nPublish Summary:`);
      console.log(`  Published / Planned: ${res.publishedCount}`);
      console.log(`  Failed:              ${res.failedCount}`);

      for (const item of res.details) {
        if (item.status === 'published') {
          console.log(`  [OK] ${item.caseId} (v${item.version}) - ${item.title}`);
        } else if (item.status === 'dry_run') {
          console.log(`  [DRY-RUN] ${item.caseId} (v${item.version}) - ${item.title}`);
        } else {
          console.error(`  [FAIL] ${item.caseId}: ${item.errors?.join(', ')}`);
        }
      }

      if (!res.success) {
        process.exitCode = 1;
      }
    });
}
