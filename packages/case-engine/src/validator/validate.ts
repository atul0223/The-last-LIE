import { buildContext } from '../logic/index.js';
import type { CaseDefinition } from '../schema/index.js';
import { v1SchemaCheck } from './checks/v1_schema.js';
import { v2RefsCheck } from './checks/v2_refs.js';
import { v3TimelineConsistentCheck } from './checks/v3_timeline_consistent.js';
import { v4PhysicalEntailedCheck } from './checks/v4_physical_entailed.js';
import { v5TestimonyLiesCheck } from './checks/v5_testimony_lies.js';
import { v6SolutionConsistentCheck } from './checks/v6_solution_consistent.js';
import { v7SolutionUniqueCheck } from './checks/v7_solution_unique.js';
import { v8SolutionReachableCheck } from './checks/v8_solution_reachable.js';
import { v9UnlockAcyclicCheck } from './checks/v9_unlock_acyclic.js';
import { v10DifficultyBandCheck } from './checks/v10_difficulty_band.js';
import { v11TextRenderCheck } from './checks/v11_text_render.js';
import { v12HooksCanonicalCheck } from './checks/v12_hooks_canonical.js';
import { v13AmbiguityCheck } from './checks/v13_ambiguity.js';
import { v14LieContradictableCheck } from './checks/v14_lie_contradictable.js';
import { v15SolutionPositiveEvidenceCheck } from './checks/v15_solution_positive_evidence.js';
import { computeDifficultyMetrics } from './config.js';
import { getObtainableClueIds } from './obtainable.js';
import type {
  ValidationIssue,
  ValidationReport,
  ValidatorCheck,
  ValidatorContext,
} from './types.js';

export interface ValidateCaseOptions {
  checks?: string[]; // Optional filter of checkIds to run
}

export const ALL_CHECKS: ValidatorCheck[] = [
  v1SchemaCheck,
  v2RefsCheck,
  v3TimelineConsistentCheck,
  v4PhysicalEntailedCheck,
  v5TestimonyLiesCheck,
  v6SolutionConsistentCheck,
  v7SolutionUniqueCheck,
  v8SolutionReachableCheck,
  v9UnlockAcyclicCheck,
  v10DifficultyBandCheck,
  v11TextRenderCheck,
  v12HooksCanonicalCheck,
  v13AmbiguityCheck,
  v14LieContradictableCheck,
  v15SolutionPositiveEvidenceCheck,
];

/**
 * Validates a case definition against all deterministic validation rules (V1-V15).
 * A case is publishable only with zero errors (ok === true).
 */
export function validateCase(def: CaseDefinition, opts?: ValidateCaseOptions): ValidationReport {
  const schemaErrors = v1SchemaCheck.run(def, {
    logicCtx: {
      doorLocations: {},
      deviceOwners: {},
      travelTimes: {},
      getTravelTime: () => null,
    },
    obtainableClueIds: new Set(),
  });

  if (schemaErrors.length > 0) {
    const metrics = computeDifficultyMetrics(def);
    return {
      ok: false,
      errors: schemaErrors,
      warnings: [],
      metrics,
    };
  }

  // Build context
  const logicCtx = buildContext(def);
  const obtainableClueIds = getObtainableClueIds(def);
  const ctx: ValidatorContext = {
    logicCtx,
    obtainableClueIds,
  };

  const metrics = computeDifficultyMetrics(def);
  metrics.obtainableCluesCount = obtainableClueIds.size;

  const checksToRun = opts?.checks
    ? ALL_CHECKS.filter((c) => opts.checks?.includes(c.checkId))
    : ALL_CHECKS;

  const allIssues: ValidationIssue[] = [];
  for (const check of checksToRun) {
    if (check.checkId === 'schema') continue; // Already run above
    const issues = check.run(def, ctx);
    allIssues.push(...issues);
  }

  const errors = allIssues.filter((i) => i.severity === 'error');
  const warnings = allIssues.filter((i) => i.severity === 'warning');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics,
  };
}
