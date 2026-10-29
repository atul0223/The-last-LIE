import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import * as engine from '@lastlie/case-engine';
import type { CaseDefinition, CaseTemplate, Difficulty } from '@lastlie/case-engine';
import { assertSafePath, getRepoRoot, SecurityError } from '../utils/security.js';

export interface GenerateOptions {
  template: string;
  count: number;
  difficulty: Difficulty;
  seed?: number | undefined;
  out: string;
  cwd?: string | undefined;
  repoRoot?: string | undefined;
}

export interface GeneratedCaseEntry {
  id: string;
  file: string;
  seed: number;
  attempts: number;
  measuredDifficulty: number;
  fingerprint?: string | undefined;
}

export interface GenerateResult {
  template: string;
  difficulty: number;
  count: number;
  seed: number;
  attempts: number;
  measuredDifficulty: number;
  fingerprint?: string | undefined;
  cases: GeneratedCaseEntry[];
  outDir: string;
}

/**
 * Dynamically resolves all templates from @lastlie/case-engine.
 * Maps exact template IDs and friendly aliases (e.g. 'false_alibi' -> 'tpl_false_alibi_v1').
 */
export function getTemplateRegistry(): Map<string, CaseTemplate> {
  const registry = new Map<string, CaseTemplate>();
  const candidates: CaseTemplate[] = [];

  const builtin = (engine as Record<string, unknown>).BUILTIN_TEMPLATES as
    | Record<string, CaseTemplate>
    | undefined;

  if (builtin) {
    for (const t of Object.values(builtin)) {
      if (t && typeof t === 'object' && 'id' in t && typeof (t as CaseTemplate).build === 'function') {
        candidates.push(t as CaseTemplate);
      }
    }
  }

  for (const exp of Object.values(engine)) {
    if (
      exp &&
      typeof exp === 'object' &&
      'id' in exp &&
      typeof (exp as CaseTemplate).id === 'string' &&
      typeof (exp as CaseTemplate).build === 'function' &&
      'slots' in exp
    ) {
      if (!candidates.some((c) => c.id === (exp as CaseTemplate).id)) {
        candidates.push(exp as CaseTemplate);
      }
    }
  }

  for (const tpl of candidates) {
    registry.set(tpl.id, tpl);
    registry.set(tpl.id.toLowerCase(), tpl);

    // Strip 'tpl_' prefix
    const withoutPrefix = tpl.id.replace(/^tpl_/, '');
    registry.set(withoutPrefix, tpl);
    registry.set(withoutPrefix.toLowerCase(), tpl);

    // Strip '_v<number>' suffix
    const withoutVersion = tpl.id.replace(/_v\d+$/, '');
    registry.set(withoutVersion, tpl);
    registry.set(withoutVersion.toLowerCase(), tpl);

    // Strip both
    const baseName = withoutPrefix.replace(/_v\d+$/, '');
    registry.set(baseName, tpl);
    registry.set(baseName.toLowerCase(), tpl);
  }

  const toy = candidates.find((c) => c.id.includes('toy'));
  if (toy) {
    registry.set('toy', toy);
  }

  return registry;
}

/**
 * Generates cases according to options and writes CaseDefinition JSON + summary.json
 */
export function runGenerate(options: GenerateOptions): GenerateResult {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const repoRoot = options.repoRoot ?? getRepoRoot(cwd);

  const registry = getTemplateRegistry();
  const template = registry.get(options.template) ?? registry.get(options.template.toLowerCase());

  if (!template) {
    const available = Array.from(new Set(Array.from(registry.values()).map((t) => t.id)));
    throw new Error(
      `Unknown template '${options.template}'. Available templates: ${available.join(', ')}`,
    );
  }

  if (options.count < 1) {
    throw new Error(`Count must be at least 1, received: ${options.count}`);
  }

  if (![1, 2, 3, 4].includes(options.difficulty)) {
    throw new Error(`Difficulty must be 1, 2, 3, or 4, received: ${options.difficulty}`);
  }

  const rawOutDir = path.resolve(cwd, options.out);
  const resolvedOutDir = assertSafePath(rawOutDir, repoRoot);

  if (!fs.existsSync(resolvedOutDir)) {
    fs.mkdirSync(resolvedOutDir, { recursive: true });
  }

  const startSeed = options.seed ?? Math.floor(Math.random() * 1_000_000) + 1;

  // Check if fingerprint function is exported from engine (e.g. WP-36)
  const engineAny = engine as Record<string, unknown>;
  const getFingerprint =
    typeof engineAny.fingerprint === 'function'
      ? (engineAny.fingerprint as (def: CaseDefinition) => string)
      : undefined;

  const generatedCases: GeneratedCaseEntry[] = [];
  let totalAttempts = 0;

  for (let i = 0; i < options.count; i++) {
    const currentSeed = startSeed + i;
    const result = engine.generateCase({
      templateId: template.id,
      seed: currentSeed,
      difficulty: options.difficulty,
      templates: [template],
    });

    totalAttempts += result.attempts;
    const def = result.case;
    const fileName = `${def.id}.json`;
    const filePath = path.join(resolvedOutDir, fileName);

    // Verify path safety: must not escape outDir or repoRoot
    assertSafePath(filePath, repoRoot);
    const relToOut = path.relative(resolvedOutDir, path.resolve(filePath));
    if (relToOut.startsWith('..') || path.isAbsolute(relToOut)) {
      throw new SecurityError(`Path traversal attempt: ${filePath} escapes output directory`);
    }

    fs.writeFileSync(filePath, JSON.stringify(def, null, 2), 'utf-8');

    const fp = getFingerprint ? getFingerprint(def) : undefined;

    generatedCases.push({
      id: def.id,
      file: fileName,
      seed: currentSeed,
      attempts: result.attempts,
      measuredDifficulty: result.report.metrics.measuredDifficulty,
      ...(fp !== undefined ? { fingerprint: fp } : {}),
    });
  }

  const firstCase = generatedCases[0];
  const summary = {
    template: template.id,
    difficulty: options.difficulty,
    count: options.count,
    seed: startSeed,
    attempts: options.count === 1 ? firstCase?.attempts ?? 0 : totalAttempts,
    measuredDifficulty:
      options.count === 1
        ? firstCase?.measuredDifficulty ?? 0
        : Math.round(
            (generatedCases.reduce((acc, c) => acc + c.measuredDifficulty, 0) / options.count) * 10,
          ) / 10,
    ...(firstCase?.fingerprint ? { fingerprint: firstCase.fingerprint } : {}),
    cases: generatedCases,
  };

  const summaryPath = path.join(resolvedOutDir, 'summary.json');
  assertSafePath(summaryPath, repoRoot);
  const relSummary = path.relative(resolvedOutDir, path.resolve(summaryPath));
  if (relSummary.startsWith('..') || path.isAbsolute(relSummary)) {
    throw new SecurityError(`Path traversal attempt: ${summaryPath} escapes output directory`);
  }

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

  return {
    ...summary,
    outDir: resolvedOutDir,
  };
}

export function registerGenerateCommand(program: Command): void {
  program
    .command('generate')
    .description('Generate procedural cases using templates')
    .requiredOption('-t, --template <id>', 'Template identifier')
    .option('-c, --count <n>', 'Number of cases to generate', '1')
    .requiredOption('-d, --difficulty <d>', 'Difficulty level (1-4)')
    .option('-s, --seed <s>', 'Starting seed (deterministic generation)')
    .requiredOption('-o, --out <dir>', 'Output directory')
    .action((options: { template: string; count: string; difficulty: string; seed?: string; out: string }) => {
      try {
        const count = parseInt(options.count, 10);
        if (Number.isNaN(count) || count < 1) {
          console.error(`Error: --count must be a positive integer, received: '${options.count}'`);
          process.exitCode = 1;
          return;
        }

        const difficulty = parseInt(options.difficulty, 10) as Difficulty;
        if (![1, 2, 3, 4].includes(difficulty)) {
          console.error(
            `Error: --difficulty must be 1, 2, 3, or 4, received: '${options.difficulty}'`,
          );
          process.exitCode = 1;
          return;
        }

        const seed = options.seed !== undefined ? parseInt(options.seed, 10) : undefined;
        if (seed !== undefined && Number.isNaN(seed)) {
          console.error(`Error: --seed must be a valid integer, received: '${options.seed}'`);
          process.exitCode = 1;
          return;
        }

        const result = runGenerate({
          template: options.template,
          count,
          difficulty,
          seed,
          out: options.out,
        });

        console.log(`\n✓ Successfully generated ${result.count} case(s) with template '${result.template}'`);
        console.log(`  Difficulty: ${result.difficulty}`);
        console.log(`  Output dir: ${result.outDir}`);
        console.log(`  Summary: ${path.join(result.outDir, 'summary.json')}`);
        for (const c of result.cases) {
          console.log(
            `  - ${c.id} (${c.file}): seed=${c.seed}, attempts=${c.attempts}, measuredDiff=${c.measuredDifficulty}${c.fingerprint ? `, fingerprint=${c.fingerprint}` : ''}`,
          );
        }
      } catch (err: unknown) {
        console.error(`\n✗ Generation failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exitCode = 1;
      }
    });
}
