import type { CaseDefinition } from '../../schema/index.js';
import { computeDifficultyMetrics } from '../config.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

export const v10DifficultyBandCheck: ValidatorCheck = {
  checkId: 'difficulty.band',
  run(def: CaseDefinition, _ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const metrics = computeDifficultyMetrics(def);
    const delta = Math.abs(metrics.measuredDifficulty - def.difficulty);

    if (delta >= 2) {
      issues.push({
        checkId: 'difficulty.band',
        severity: 'warning',
        message: `Measured difficulty (${metrics.measuredDifficulty}) differs from declared difficulty (${def.difficulty}) by ±2 or more (difficulty score: ${metrics.difficultyScore})`,
        refs: [String(def.difficulty), String(metrics.measuredDifficulty)],
      });
    }

    return issues;
  },
};
