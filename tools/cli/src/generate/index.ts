import type { Command } from 'commander';

export function registerGenerateCommand(program: Command): void {
  program
    .command('generate')
    .description('Generate procedural cases using templates (available in WP-35b)')
    .option('--template <id>', 'Template identifier')
    .option('--count <n>', 'Number of cases to generate')
    .option('--difficulty <d>', 'Difficulty level')
    .option('--seed <s>', 'Starting seed')
    .option('--out <dir>', 'Output directory')
    .action(() => {
      console.log('generate: available after WP-31');
    });
}
