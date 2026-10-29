import type { Command } from 'commander';

export function registerPublishCommand(program: Command): void {
  program
    .command('publish')
    .description('Publish cases to remote game backend (WP-42)')
    .action(() => {
      console.log('not implemented until WP-42');
    });
}
