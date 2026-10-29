import type { CaseDefinition } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v12HooksCanonicalCheck: ValidatorCheck = {
  checkId: 'hooks.canonical',
  run(def: CaseDefinition, _ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const clueIds = new Set(def.clues.map((c) => c.id));

    if (!def.conspiracyHooks) {
      return issues;
    }

    for (let idx = 0; idx < def.conspiracyHooks.length; idx++) {
      const hook = def.conspiracyHooks[idx]!;

      if (!hook.nodeId || hook.nodeId.trim().length === 0) {
        issues.push({
          checkId: 'hooks.canonical',
          severity: 'warning',
          message: `conspiracyHook at index ${idx} has missing or empty nodeId`,
          refs: [`conspiracyHooks[${idx}]`],
        });
      }

      if (hook.clueId && !clueIds.has(hook.clueId)) {
        issues.push({
          checkId: 'hooks.canonical',
          severity: 'warning',
          message: `conspiracyHook at index ${idx} references nonexistent clueId '${hook.clueId}'`,
          refs: [hook.clueId, `conspiracyHooks[${idx}]`],
        });
      }

      // Procedural/case hooks can never create edges (only reference nodes)
      const rawHook = hook as Record<string, unknown>;
      if (rawHook['from'] || rawHook['to'] || rawHook['target']) {
        issues.push({
          checkId: 'hooks.canonical',
          severity: 'warning',
          message: `conspiracyHook at index ${idx} attempts to define an edge ('from'/'to'); hooks may only reference existing canonical nodes`,
          refs: [`conspiracyHooks[${idx}]`],
        });
      }
    }

    return issues;
  },
};
