import { CaseDefinitionSchema, type CaseDefinition } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v1SchemaCheck: ValidatorCheck = {
  checkId: 'schema',
  run(def: CaseDefinition, _ctx: ValidatorContext): ValidationIssue[] {
    const parsed = CaseDefinitionSchema.safeParse(def);
    if (!parsed.success) {
      return [
        {
          checkId: 'schema',
          severity: 'error',
          message: parsed.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; '),
          refs: parsed.error.issues.map((i) => i.path.join('.')),
        },
      ];
    }
    return [];
  },
};
