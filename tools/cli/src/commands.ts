import type { Command } from 'commander';
import { registerValidateCommand } from './validate/index.js';
import { registerRenderCommand } from './render/index.js';
import { registerPlaytestCommand } from './playtest/index.js';
import { registerGenerateCommand } from './generate/index.js';
import { registerPublishCommand } from './publish/index.js';
import { registerReportCommand } from './report/index.js';
import { registerAdminCommands } from './admin/index.js';

/**
 * Main command registry for the lastlie CLI.
 * Each command lives in its own folder under tools/cli/src/<command>/
 * and registers its options and action handler here.
 */
export function registerCommands(program: Command): void {
  registerValidateCommand(program);
  registerRenderCommand(program);
  registerPlaytestCommand(program);
  registerGenerateCommand(program);
  registerPublishCommand(program);
  registerReportCommand(program);
  registerAdminCommands(program);
}
