/**
 * Generates supabase/seed.sql containing:
 * 1. Global game_config defaults (progression rules, rank thresholds, difficulty weights).
 * 2. Authored cases case_0001 through case_0004 published to cases & case_private.
 * 3. Default daily_cases mapping.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CaseDefinition } from '../../packages/case-engine/src/schema/index.js';
import { toPublicCase } from '../../packages/case-engine/src/redact/index.js';
import { DEFAULT_PROGRESSION_CONFIG } from '../../packages/case-engine/src/progression/config.js';
import { DIFFICULTY_WEIGHTS } from '../../packages/case-engine/src/validator/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''");
}

function escapeSqlJson(obj: unknown): string {
  return `'${escapeSqlString(JSON.stringify(obj))}'::jsonb`;
}

export function buildSeedSql(): string {
  const rootDir = resolve(__dirname, '../..');
  const authoredDir = resolve(rootDir, 'packages/content/cases/authored');
  const caseIds = ['case_0001', 'case_0002', 'case_0003', 'case_0004'];

  const lines: string[] = [
    '-- =============================================================================',
    '-- Seed Data: THE LAST LIE: Infinite (SYSTEM_DESIGN §8.1)',
    '-- Generated deterministically via supabase/scripts/generate_seed.ts',
    '-- =============================================================================',
    '',
    '-- -----------------------------------------------------------------------------',
    '-- 1. Game Configuration Defaults',
    '-- -----------------------------------------------------------------------------',
    `insert into public.game_config (key, value, updated_at) values`,
    `  ('progression', ${escapeSqlJson(DEFAULT_PROGRESSION_CONFIG)}, now()),`,
    `  ('difficulty_weights', ${escapeSqlJson(DIFFICULTY_WEIGHTS)}, now()),`,
    `  ('feature_flags', ${escapeSqlJson({ hint_mode: false, daily_active: true, remote_scoring: true })}, now())`,
    `on conflict (key) do update set value = excluded.value, updated_at = now();`,
    '',
    '-- -----------------------------------------------------------------------------',
    '-- 2. Authored Cases: Public Catalog & Ground Truth',
    '-- -----------------------------------------------------------------------------',
  ];

  for (const caseId of caseIds) {
    const filePath = resolve(authoredDir, `${caseId}.json`);
    const rawJson = readFileSync(filePath, 'utf8');
    const def = JSON.parse(rawJson) as CaseDefinition;

    // Default clues for initial session state
    const defaultClueIds = def.clues
      .filter((c) => c.unlock.kind === 'default')
      .map((c) => c.id);

    const publicPayload = toPublicCase(def, defaultClueIds);

    lines.push(`-- Case: ${def.id} - "${def.title}"`);
    lines.push(
      `insert into public.cases (id, version, kind, title, difficulty, mystery_type, estimated_minutes, status, public_payload, published_at) values (`,
      `  '${escapeSqlString(def.id)}',`,
      `  ${def.version},`,
      `  '${escapeSqlString(def.kind)}',`,
      `  '${escapeSqlString(def.title)}',`,
      `  ${def.difficulty},`,
      `  '${escapeSqlString(def.mysteryType)}',`,
      `  ${def.estimatedMinutes},`,
      `  'published',`,
      `  ${escapeSqlJson(publicPayload)},`,
      `  now()`,
      `) on conflict (id) do update set`,
      `  version = excluded.version,`,
      `  kind = excluded.kind,`,
      `  title = excluded.title,`,
      `  difficulty = excluded.difficulty,`,
      `  mystery_type = excluded.mystery_type,`,
      `  estimated_minutes = excluded.estimated_minutes,`,
      `  status = excluded.status,`,
      `  public_payload = excluded.public_payload,`,
      `  published_at = excluded.published_at;`,
      '',
    );

    lines.push(
      `insert into public.case_private (case_id, version, definition) values (`,
      `  '${escapeSqlString(def.id)}',`,
      `  ${def.version},`,
      `  ${escapeSqlJson(def)}`,
      `) on conflict (case_id) do update set`,
      `  version = excluded.version,`,
      `  definition = excluded.definition;`,
      '',
    );
  }

  lines.push(
    '-- -----------------------------------------------------------------------------',
    '-- 3. Daily Featured Case for Today',
    '-- -----------------------------------------------------------------------------',
    `insert into public.daily_cases (date, case_id) values`,
    `  (current_date, 'case_0001')`,
    `on conflict (date) do update set case_id = excluded.case_id;`,
    '',
  );

  return lines.join('\n');
}

// When executed directly, generate seed.sql
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const seedSql = buildSeedSql();
  const outputPath = resolve(__dirname, '../seed.sql');
  writeFileSync(outputPath, seedSql, 'utf8');
  console.log(`Successfully generated seed.sql at ${outputPath} (${seedSql.length} bytes)`);
}
