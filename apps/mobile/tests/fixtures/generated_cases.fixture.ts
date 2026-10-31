import { generateCase, type CaseDefinition } from '@lastlie/case-engine';

/**
 * Local fixture of 2 generated cases for WP-26 testing.
 * Satisfies the requirement: "test with a local fixture of 2 generated cases.
 * Never import JSON files directly from packages/content/cases/generated/."
 */
export const fixtureGeneratedCases: CaseDefinition[] = [
  generateCase({ templateId: 'tpl_false_alibi_v1', seed: 9001, difficulty: 1 }).case,
  generateCase({ templateId: 'tpl_missing_item_v1', seed: 9002, difficulty: 2 }).case,
];
