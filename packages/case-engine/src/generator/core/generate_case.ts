import { createRng } from '../../rng.js';
import { validateCase } from '../../validator/index.js';
import { buildRenderWorld, renderClue } from '../../render/index.js';
import type { ValidationReport } from '../../validator/types.js';
import { fillSlots } from './fill_slots.js';
import { tpl_toy_two_rooms } from './toy_template.js';
import { tpl_false_alibi } from '../templates/false_alibi.js';
import {
  type CaseTemplate,
  type GenerationOptions,
  type GenerationResult,
  GenerationError,
} from './types.js';

export const BUILTIN_TEMPLATES: Record<string, CaseTemplate> = {
  [tpl_toy_two_rooms.id]: tpl_toy_two_rooms,
  [tpl_false_alibi.id]: tpl_false_alibi,
};

/**
 * Generates a valid, deterministic CaseDefinition from a template and seed.
 * Implements the SYSTEM_DESIGN §5.2 generation pipeline:
 * - forked RNG streams per phase ('slots', 'build', 'render')
 * - retry loop with seed + 1 up to maxAttempts (default: 20)
 * - returns { case, attempts, report }
 * - throws a typed GenerationError after maxAttempts failures
 */
export function generateCase(options: GenerationOptions): GenerationResult {
  const maxAttempts = options.maxAttempts ?? 20;

  // Resolve template from options.templates or BUILTIN_TEMPLATES
  let template: CaseTemplate | undefined;
  if (options.templates) {
    if (Array.isArray(options.templates)) {
      template = options.templates.find((t) => t.id === options.templateId);
    } else if (options.templates instanceof Map) {
      template = options.templates.get(options.templateId);
    } else if (typeof options.templates === 'object') {
      template = (options.templates as Record<string, CaseTemplate>)[options.templateId];
    }
  }
  if (!template) {
    template = BUILTIN_TEMPLATES[options.templateId];
  }

  if (!template) {
    throw new GenerationError(
      `Template '${options.templateId}' not found in registry.`,
      options.templateId,
      options.seed,
      0,
    );
  }

  let lastReport: ValidationReport | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const currentSeed = options.seed + (attempt - 1);
    const rng = createRng(currentSeed);

    const slotsRng = rng.fork('slots');
    const buildRng = rng.fork('build');
    const renderRng = rng.fork('render');

    // Step 1: Fill slots from pools
    const slots = fillSlots(template.slots, slotsRng, options.pools);

    // Step 2: Build case definition
    const def = template.build(buildRng, slots, {
      difficulty: options.difficulty,
      ...options.params,
    });

    // Step 3: Render prose for clues lacking explicit text
    const world = buildRenderWorld(def);
    for (const clue of def.clues) {
      if (!clue.text || clue.text.trim().length === 0) {
        clue.text = renderClue(clue, world, renderRng);
      }
    }

    // Step 4: Validate generated case
    const report = validateCase(def);
    lastReport = report;

    if (report.ok) {
      return {
        case: def,
        attempts: attempt,
        report,
      };
    }
  }

  throw new GenerationError(
    `Failed to generate valid case for template '${options.templateId}' after ${maxAttempts} attempts. Errors: ${lastReport?.errors.map((e) => e.message).join('; ') ?? 'None'}`,
    options.templateId,
    options.seed,
    maxAttempts,
    lastReport,
  );
}
