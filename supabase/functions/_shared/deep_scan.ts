/**
 * Deep scanner to detect answer leaks in API response bodies.
 * As specified in SYSTEM_DESIGN §3.6 and AGENTS.md, responses must never contain:
 * - truth
 * - claims (hypothesis facts)
 * - culpritIds
 * - asserts (clue facts)
 * - keyEvidence
 * - liars
 * - meta.seed
 * - conspiracyHooks
 * - text of locked clues
 * - real ids of locked clues (must use locked_<n> placeholders)
 */

export const FORBIDDEN_KEYS = new Set([
  'truth',
  'claims',
  'culpritIds',
  'asserts',
  'keyEvidence',
  'liars',
  'seed',
  'conspiracyHooks',
]);

export interface LeakScanViolation {
  path: string;
  key?: string;
  value?: unknown;
  reason: string;
}

export function deepScanForLeaks(obj: unknown, path = 'root'): LeakScanViolation[] {
  const violations: LeakScanViolation[] = [];

  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return violations;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      violations.push(...deepScanForLeaks(item, `${path}[${index}]`));
    });
    return violations;
  }

  const record = obj as Record<string, unknown>;

  for (const [key, value] of Object.entries(record)) {
    const currentPath = `${path}.${key}`;

    if (FORBIDDEN_KEYS.has(key)) {
      violations.push({
        path: currentPath,
        key,
        value,
        reason: `Forbidden key '${key}' present in response payload`,
      });
    }

    // Check locked clue leak: locked clue must NOT have 'text'
    if (record.locked === true && key === 'text') {
      violations.push({
        path: currentPath,
        key,
        value,
        reason: `Locked clue has 'text' property exposed`,
      });
    }

    // Check placeholder id requirement for locked clues
    if (record.locked === true && key === 'id' && typeof value === 'string' && !value.startsWith('locked_')) {
      violations.push({
        path: currentPath,
        key,
        value,
        reason: `Locked clue exposed real id '${value}' instead of locked_<n> placeholder`,
      });
    }

    if (typeof value === 'object' && value !== null) {
      violations.push(...deepScanForLeaks(value, currentPath));
    }
  }

  return violations;
}
