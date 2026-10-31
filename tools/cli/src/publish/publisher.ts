import fs from 'node:fs';
import path from 'node:path';
import {
  toPublicCase,
  validateCase,
  type CaseDefinition,
  type CasePublic,
} from '@lastlie/case-engine';

export interface PublishOptions {
  globPattern: string;
  env: 'local' | 'staging' | 'prod';
  dryRun?: boolean;
  confirmProd?: boolean; // programmatic confirmation for prod
  client?: PublishClient; // injectable client for testing
}

export interface PublishClient {
  getCase(id: string): Promise<{ id: string; version: number; publicPayload: CasePublic } | null>;
  upsertCase(params: {
    caseRow: {
      id: string;
      version: number;
      kind: string;
      title: string;
      difficulty: number;
      mysteryType: string;
      estimatedMinutes: number;
      status: string;
      publicPayload: CasePublic;
      fingerprint?: string;
      templateId?: string;
      publishedAt: string;
    };
    definition: CaseDefinition;
  }): Promise<void>;
}

export interface PublishResult {
  success: boolean;
  publishedCount: number;
  skippedCount: number;
  failedCount: number;
  details: Array<{
    caseId: string;
    version: number;
    title: string;
    status: 'published' | 'dry_run' | 'skipped' | 'validation_failed' | 'error';
    errors?: string[];
  }>;
}

/**
 * Resolves file paths matching the given glob pattern or path.
 */
export function resolveCaseFiles(pattern: string, baseDir = process.cwd()): string[] {
  // Normalize slashes
  const normalized = pattern.replace(/\\/g, '/');

  // Direct file check
  const directPath = path.resolve(baseDir, pattern);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return [directPath];
  }

  // Handle directory or glob
  const files: string[] = [];
  const walkDir = (currentDir: string) => {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const relativePosix = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        if (matchesPattern(relativePosix, normalized) || matchesPattern(entry.name, normalized)) {
          files.push(fullPath);
        }
      }
    }
  };

  // Find root search directory
  const wildcardIndex = normalized.indexOf('*');
  const searchRoot =
    wildcardIndex === -1
      ? path.dirname(directPath)
      : path.resolve(baseDir, normalized.substring(0, normalized.lastIndexOf('/', wildcardIndex) || 0));

  walkDir(searchRoot);
  return files;
}

function matchesPattern(str: string, pattern: string): boolean {
  if (pattern === '*' || pattern === '**/*' || pattern.endsWith('*.json')) {
    return str.endsWith('.json');
  }
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${regexPattern}$`).test(str);
}

export async function publishCases(options: PublishOptions): Promise<PublishResult> {
  const { globPattern, env, dryRun = false, confirmProd = false, client } = options;

  if (env === 'prod' && !dryRun && !confirmProd) {
    throw new Error('Production publish requires explicit confirmation (--yes or interactive prompt)');
  }

  const files = resolveCaseFiles(globPattern);
  if (files.length === 0) {
    return {
      success: true,
      publishedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      details: [],
    };
  }

  const result: PublishResult = {
    success: true,
    publishedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    details: [],
  };

  for (const filePath of files) {
    try {
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const def = JSON.parse(rawContent) as CaseDefinition;

      // 1. Validate first (refuse on ANY validation error)
      const report = validateCase(def);
      if (!report.ok || report.errors.length > 0) {
        result.success = false;
        result.failedCount++;
        result.details.push({
          caseId: def.id || path.basename(filePath, '.json'),
          version: def.version || 1,
          title: def.title || 'Unknown',
          status: 'validation_failed',
          errors: report.errors.map((e) => `[${e.checkId}] ${e.message}`),
        });
        continue;
      }

      // 2. Default unlocked clues
      const defaultUnlockedIds = def.clues
        .filter((c) => c.unlock.kind === 'default')
        .map((c) => c.id);

      // 3. Generate sanitized public payload
      const publicPayload = toPublicCase(def, defaultUnlockedIds);

      // 4. Version bump on change
      let targetVersion = def.version;
      if (client) {
        const existing = await client.getCase(def.id);
        if (existing) {
          const isContentChanged = JSON.stringify(existing.publicPayload) !== JSON.stringify(publicPayload);
          if (isContentChanged) {
            targetVersion = Math.max(existing.version + 1, def.version + 1);
          }
        }
      }

      if (dryRun) {
        result.publishedCount++;
        result.details.push({
          caseId: def.id,
          version: targetVersion,
          title: def.title,
          status: 'dry_run',
        });
        continue;
      }

      // 5. Database Upsert
      if (client) {
        await client.upsertCase({
          caseRow: {
            id: def.id,
            version: targetVersion,
            kind: def.kind,
            title: def.title,
            difficulty: def.difficulty,
            mysteryType: def.mysteryType,
            estimatedMinutes: def.estimatedMinutes,
            status: 'published',
            publicPayload,
            ...(def.meta?.templateId ? { templateId: def.meta.templateId } : {}),
            publishedAt: new Date().toISOString(),
          },
          definition: {
            ...def,
            version: targetVersion,
          },
        });
      }

      result.publishedCount++;
      result.details.push({
        caseId: def.id,
        version: targetVersion,
        title: def.title,
        status: 'published',
      });
    } catch (err) {
      result.success = false;
      result.failedCount++;
      result.details.push({
        caseId: path.basename(filePath, '.json'),
        version: 1,
        title: 'Error',
        status: 'error',
        errors: [(err as Error).message],
      });
    }
  }

  return result;
}
