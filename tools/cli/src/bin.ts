#!/usr/bin/env node
import { Command } from 'commander';
import { registerCommands } from './commands.js';
import { CLI_VERSION } from './index.js';

const program = new Command();

program
  .name('lastlie')
  .description('THE LAST LIE — Authoring, Validation, and Playtesting CLI')
  .version(CLI_VERSION);

registerCommands(program);

program.parse(process.argv);
