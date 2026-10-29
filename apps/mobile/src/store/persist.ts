import { z } from 'zod';
import {
  SessionStateSchema,
  CasePublicSchema,
  ScoreResultSchema,
  RevealSchema,
} from '@lastlie/case-engine';

import { getStorage, type KeyValueStore } from '../services/local/storage';
export type { KeyValueStore };

export const CURRENT_SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  STATE: 'lastlie:v1:state',
  SCHEMA_VERSION: 'lastlie:v1:schema_version',
  QUARANTINE_PREFIX: 'lastlie:quarantine:',
} as const;

export const FORBIDDEN_STORAGE_KEYS = new Set([
  'truth',
  'claims',
  'culpritIds',
  'asserts',
  'keyEvidence',
  'liars',
  'seed',
]);

export const PersistedSessionResultOutcomeSchema = z.object({
  result: ScoreResultSchema,
  reveal: RevealSchema,
});

export const PersistedStoreStateSchema = z.object({
  schemaVersion: z.number().int().min(1),
  sessions: z.record(SessionStateSchema).default({}),
  cases: z.record(CasePublicSchema).default({}),
  results: z.record(PersistedSessionResultOutcomeSchema).default({}),
  readClueIds: z.record(z.array(z.string())).default({}),
  activeSessionId: z.string().nullable().default(null),
  awardedSessionIds: z.array(z.string()).default([]),
}).passthrough();

export type PersistedStoreState = z.infer<typeof PersistedStoreStateSchema>;

export interface Migration {
  version: number;
  migrate: (data: Record<string, unknown>) => Record<string, unknown>;
}

export const DEFAULT_MIGRATIONS: Migration[] = [
  {
    version: 1,
    migrate: (data) => data,
  },
];

export function createEmptyPersistedState(schemaVersion = CURRENT_SCHEMA_VERSION): PersistedStoreState {
  return {
    schemaVersion,
    sessions: {},
    cases: {},
    results: {},
    readClueIds: {},
    activeSessionId: null,
    awardedSessionIds: [],
  };
}

/**
 * Deep sanitization to ensure no security leaks or forbidden keys reach persistent storage.
 */
export function sanitizeForStorage<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForStorage(item)) as unknown as T;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(record)) {
      if (FORBIDDEN_STORAGE_KEYS.has(k)) {
        continue;
      }
      sanitized[k] = sanitizeForStorage(v);
    }

    // In locked clues, never expose text
    if (sanitized.locked === true) {
      delete sanitized.text;
    }

    return sanitized as T;
  }

  return value;
}

/**
 * Validates that an arbitrary object contains no security leaks.
 */
export function deepScanForLeaks(value: unknown, path = 'root'): void {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    value.forEach((item, idx) => deepScanForLeaks(item, `${path}[${idx}]`));
    return;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const [k, v] of Object.entries(record)) {
      if (FORBIDDEN_STORAGE_KEYS.has(k)) {
        throw new Error(`Security leak detected: key '${k}' found at path '${path}.${k}'`);
      }
      deepScanForLeaks(v, `${path}.${k}`);
    }

    if (record.locked === true && typeof record.text === 'string' && record.text.length > 0) {
      throw new Error(`Security leak detected: locked clue exposed text at path '${path}'`);
    }
  }
}

export function applyMigrations(
  data: Record<string, unknown>,
  fromVersion: number,
  toVersion: number,
  migrations: Migration[],
): Record<string, unknown> {
  const sorted = [...migrations].sort((a, b) => a.version - b.version);
  let current = { ...data };

  for (const m of sorted) {
    if (m.version > fromVersion && m.version <= toVersion) {
      current = m.migrate(current);
      current.schemaVersion = m.version;
    }
  }

  return current;
}

export interface LoadPersistedOptions {
  store?: KeyValueStore;
  targetVersion?: number;
  migrations?: Migration[];
  getTimestamp?: () => number | string;
}

export function loadPersistedState(options?: LoadPersistedOptions): PersistedStoreState {
  const store = options?.store ?? getStorage();
  const targetVersion = options?.targetVersion ?? CURRENT_SCHEMA_VERSION;
  const migrations = options?.migrations ?? DEFAULT_MIGRATIONS;
  const getTimestamp = options?.getTimestamp ?? (() => Date.now());

  const rawState = store.getString(STORAGE_KEYS.STATE);
  if (!rawState) {
    return createEmptyPersistedState(targetVersion);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawState);
  } catch {
    // Corrupt JSON blob -> quarantine and start fresh
    const ts = getTimestamp();
    store.set(`${STORAGE_KEYS.QUARANTINE_PREFIX}${ts}`, rawState);
    store.delete(STORAGE_KEYS.STATE);
    return createEmptyPersistedState(targetVersion);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    const ts = getTimestamp();
    store.set(`${STORAGE_KEYS.QUARANTINE_PREFIX}${ts}`, rawState);
    store.delete(STORAGE_KEYS.STATE);
    return createEmptyPersistedState(targetVersion);
  }

  let dataRecord = parsed as Record<string, unknown>;

  const rawVersion = store.getString(STORAGE_KEYS.SCHEMA_VERSION);
  const storedVersion =
    typeof dataRecord.schemaVersion === 'number'
      ? dataRecord.schemaVersion
      : rawVersion
        ? Number(rawVersion)
        : 1;

  if (storedVersion < targetVersion) {
    try {
      dataRecord = applyMigrations(dataRecord, storedVersion, targetVersion, migrations);
    } catch {
      const ts = getTimestamp();
      store.set(`${STORAGE_KEYS.QUARANTINE_PREFIX}${ts}`, rawState);
      store.delete(STORAGE_KEYS.STATE);
      return createEmptyPersistedState(targetVersion);
    }
  }

  const result = PersistedStoreStateSchema.safeParse(dataRecord);
  if (!result.success) {
    const ts = getTimestamp();
    store.set(`${STORAGE_KEYS.QUARANTINE_PREFIX}${ts}`, rawState);
    store.delete(STORAGE_KEYS.STATE);
    return createEmptyPersistedState(targetVersion);
  }

  return result.data;
}

export function savePersistedState(
  state: PersistedStoreState,
  options?: { store?: KeyValueStore },
): void {
  const store = options?.store ?? getStorage();
  const sanitized = sanitizeForStorage(state);

  const serialized = JSON.stringify(sanitized);
  store.set(STORAGE_KEYS.STATE, serialized);
  store.set(
    STORAGE_KEYS.SCHEMA_VERSION,
    String(sanitized.schemaVersion ?? CURRENT_SCHEMA_VERSION),
  );
}
