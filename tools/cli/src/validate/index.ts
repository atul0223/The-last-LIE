import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import {
  validateCase,
  formatReport,
  type ValidationReport,
  type CaseDefinition,
} from '@lastlie/case-engine';
import { assertSafePath, getRepoRoot } from '../utils/security.js';
import { matchGlobFiles } from '../utils/glob.js';

export interface ValidateResult {
  file: string;
  report: ValidationReport;
  error?: string;
}

export interface RunValidateOutput {
  success: boolean;
  totalFiles: number;
  results: ValidateResult[];
}

export function runValidate(
  patterns: string[],
  options: { cwd?: string; repoRoot?: string } = {},
): RunValidateOutput {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const repoRoot = options.repoRoot ?? getRepoRoot(cwd);

  const matchedFiles = new Set<string>();

  for (const pattern of patterns) {
    const resolvedPath = path.resolve(cwd, pattern);
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      matchedFiles.add(resolvedPath);
      continue;
    }

    const files = matchGlobFiles(pattern, cwd);
    for (const file of files) {
      matchedFiles.add(file);
    }
  }

  const results: ValidateResult[] = [];
  let allOk = true;

  for (const filePath of matchedFiles) {
    try {
      assertSafePath(filePath, repoRoot);
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(rawContent) as CaseDefinition;

      const report = validateCase(parsed);
      results.push({ file: filePath, report });

      if (!report.ok) {
        allOk = false;
      }
    } catch (err: unknown) {
      allOk = false;
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        file: filePath,
        report: {
          ok: false,
          errors: [{ checkId: 'V0_PARSE', message: errorMsg, severity: 'error' }],
          warnings: [],
          metrics: {
            difficultyScore: 0,
            measuredDifficulty: 1,
            totalCluesCount: 0,
            obtainableCluesCount: 0,
            smallestKeyEvidenceSize: 0,
            nonDefaultKeyCluesCount: 0,
            hypothesesCount: 0,
            redHerringsCount: 0,
            needsTravelTime: false,
          },
        },
        error: errorMsg,
      });
    }
  }

  return {
    success: allOk && matchedFiles.size > 0,
    totalFiles: matchedFiles.size,
    results,
  };
}

export function registerValidateCommand(program: Command): void {
  program
    .command('validate <glob...>')
    .description('Validate one or more case files against engine validator rules')
    .action((patterns: string[]) => {
      const output = runValidate(patterns);

      if (output.totalFiles === 0) {
        console.warn(`[validate] No case files found matching patterns: ${patterns.join(', ')}`);
        process.exitCode = 1;
        return;
      }

      console.log(`\nValidating ${output.totalFiles} case file(s)...`);

      for (const res of output.results) {
        console.log(`\n------------------------------------------------------------`);
        console.log(`File: ${res.file}`);
        console.log(formatReport(res.report));
      }

      console.log(`\n------------------------------------------------------------`);
      if (output.success) {
        console.log(`✓ All ${output.totalFiles} case(s) passed validation.`);
      } else {
        console.error(`✗ Validation failed for one or more cases.`);
        process.exitCode = 1;
      }
    });
}
