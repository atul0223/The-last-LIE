import type { Command } from 'commander';
import { runRepetitionAnalysis, formatRepetitionReport } from './repetition.js';
import { runDifficultyCalibration, formatCalibrationReport } from './calibration.js';
import type { Difficulty } from '@lastlie/case-engine';

export * from './repetition.js';
export * from './calibration.js';

export function registerReportCommand(program: Command): void {
  program
    .command('report')
    .description('Generate repetition, diversity, and calibration reports for templates and cases')
    .option('--repetition', 'Analyze fingerprint repetition, collision rate, and title duplication')
    .option('-t, --template <id>', 'Template id to analyze (e.g. tpl_false_alibi_v1, false_alibi)')
    .option('-c, --count <number>', 'Number of cases to generate (default: 50)', '50')
    .option('-s, --seed <number>', 'Initial RNG seed for sample batch (default: 1000)', '1000')
    .option('-d, --difficulty <number>', 'Difficulty level to generate (1-4, default: 2)', '2')
    .option('--calibrate', 'Calibrate DIFFICULTY_WEIGHTS against playtest results')
    .option('--fixture <path>', 'Path to playtest fixture for calibration testing')
    .option('--json', 'Output report formatted as JSON')
    .action((options) => {
      try {
        if (options.calibrate) {
          const calibResult = runDifficultyCalibration({
            fixturePath: options.fixture,
          });

          if (options.json) {
            console.log(JSON.stringify(calibResult, null, 2));
          } else {
            console.log(formatCalibrationReport(calibResult));
          }
          return;
        }

        if (options.repetition) {
          if (!options.template) {
            console.error('Error: --template <id> is required when running --repetition.');
            process.exit(1);
          }

          const count = Number.parseInt(options.count, 10);
          const seed = Number.parseInt(options.seed, 10);
          const difficulty = Number.parseInt(options.difficulty, 10) as Difficulty;

          const repResult = runRepetitionAnalysis({
            template: options.template,
            count,
            seed,
            difficulty,
          });

          if (options.json) {
            console.log(JSON.stringify(repResult, null, 2));
          } else {
            console.log(formatRepetitionReport(repResult));
          }
          return;
        }

        console.log('Please specify either --repetition or --calibrate. Run `lastlie report --help` for details.');
      } catch (err) {
        console.error(`Report execution error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
