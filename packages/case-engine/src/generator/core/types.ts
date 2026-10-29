import type { CaseDefinition, Id } from '../../schema/index.js';
import type { Rng } from '../../rng.js';
import type { ValidationReport } from '../../validator/types.js';

export interface PoolLocation {
  id: string;
  name: string;
  description: string;
  doorIds: string[];
  adjacency: Array<{ to: string; travelMinutes: number }>;
}

export interface PoolObject {
  id: string;
  name: string;
  description: string;
  type: 'item' | 'device';
}

export interface PoolsData {
  names: {
    firstNames: string[];
    surnames: string[];
  };
  locations: PoolLocation[];
  objects: PoolObject[];
  motives: string[];
  relations: string[];
}

export interface SlotSpec {
  name: string;
  type: 'character' | 'location' | 'object' | 'motive' | 'relation';
  role?: string;
  constraints?: {
    exclude?: string[];
    [key: string]: unknown;
  };
}

export type FilledSlots = Record<string, unknown>;

export interface TemplateParams {
  difficulty: 1 | 2 | 3 | 4 | 5;
  [key: string]: unknown;
}

export interface CaseTemplate {
  id: Id;
  mysteryType: string;
  difficultyRange: [number, number];
  slots: SlotSpec[];
  build(rng: Rng, slots: FilledSlots, params: TemplateParams): CaseDefinition;
}

export interface GenerationOptions {
  templateId: Id;
  seed: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  params?: Record<string, unknown>;
  maxAttempts?: number;
  templates?: CaseTemplate[] | Map<string, CaseTemplate> | Record<string, CaseTemplate>;
  pools?: Partial<PoolsData>;
}

export interface GenerationResult {
  case: CaseDefinition;
  attempts: number;
  report: ValidationReport;
}

export class GenerationError extends Error {
  readonly templateId: Id;
  readonly seed: number;
  readonly attempts: number;
  readonly lastReport?: ValidationReport | undefined;

  constructor(
    message: string,
    templateId: Id,
    seed: number,
    attempts: number,
    lastReport?: ValidationReport | undefined,
  ) {
    super(message);
    this.name = 'GenerationError';
    this.templateId = templateId;
    this.seed = seed;
    this.attempts = attempts;
    this.lastReport = lastReport;
  }
}
