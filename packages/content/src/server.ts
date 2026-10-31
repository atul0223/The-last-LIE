import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CaseDefinition } from '@lastlie/case-engine';
import poolManifest from '../cases/pool/manifest.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POOL_CASES_DIR = path.resolve(__dirname, '../cases/pool');

export interface PoolManifestEntry {
  id: string;
  file: string;
  templateId: string;
  difficulty: number;
  title: string;
  daily_eligible: boolean;
  weekly_eligible: boolean;
  fingerprint: string;
  seed: number;
}

export const POOL_MANIFEST: PoolManifestEntry[] = poolManifest as PoolManifestEntry[];

/**
 * Loads a single pool case by ID directly from the server storage pool.
 * SERVER-ONLY: Never bundled in client applications.
 */
export function getPoolCase(id: string): CaseDefinition {
  const entry = POOL_MANIFEST.find((c) => c.id === id);
  if (!entry) {
    throw new Error(`Pool case '${id}' not found in server manifest`);
  }
  const filePath = path.join(POOL_CASES_DIR, entry.file);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as CaseDefinition;
}

/**
 * Loads all 128 pool cases from disk.
 * SERVER-ONLY: Used exclusively by backend batch loaders, CLI publish, and test harnesses.
 */
export function getAllPoolCases(): CaseDefinition[] {
  return POOL_MANIFEST.map((entry) => {
    const filePath = path.join(POOL_CASES_DIR, entry.file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as CaseDefinition;
  });
}
