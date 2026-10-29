import type { CaseDefinition } from '../schema/index.js';
import type { LogicContext } from '../logic/index.js';

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  checkId: string;
  severity: IssueSeverity;
  message: string;
  refs?: string[];
}

export interface ValidationMetrics {
  difficultyScore: number;
  measuredDifficulty: number;
  smallestKeyEvidenceSize: number;
  nonDefaultKeyCluesCount: number;
  redHerringsCount: number;
  hypothesesCount: number;
  needsTravelTime: boolean;
  totalCluesCount: number;
  obtainableCluesCount: number;
}

export interface ValidationReport {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  metrics: ValidationMetrics;
}

export interface ValidatorContext {
  logicCtx: LogicContext;
  obtainableClueIds: Set<string>;
}

export interface ValidatorCheck {
  checkId: string;
  run(def: CaseDefinition, ctx: ValidatorContext): ValidationIssue[];
}
