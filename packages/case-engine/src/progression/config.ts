import type { ProgressionConfig } from './types.js';
import { ProgressionConfigSchema } from './types.js';

export const DEFAULT_PROGRESSION_CONFIG: ProgressionConfig = {
  ranks: [
    {
      id: 'Trainee',
      level: 1,
      name: 'Trainee',
      xpThreshold: 0,
      masteryGate: {
        minDifficulty: 1,
        qualifyingSolves: 0,
        minEvidenceQuality: 0.6,
      },
    },
    {
      id: 'Investigator',
      level: 2,
      name: 'Investigator',
      xpThreshold: 500,
      masteryGate: {
        minDifficulty: 2,
        qualifyingSolves: 2,
        minEvidenceQuality: 0.6,
      },
    },
    {
      id: 'Specialist',
      level: 3,
      name: 'Specialist',
      xpThreshold: 1200,
      masteryGate: {
        minDifficulty: 3,
        qualifyingSolves: 2,
        minEvidenceQuality: 0.6,
      },
    },
    {
      id: 'Senior Detective',
      level: 4,
      name: 'Senior Detective',
      xpThreshold: 3000,
      masteryGate: {
        minDifficulty: 4,
        qualifyingSolves: 3,
        minEvidenceQuality: 0.6,
      },
    },
    {
      id: 'Master Detective',
      level: 5,
      name: 'Master Detective',
      xpThreshold: 6000,
      masteryGate: {
        minDifficulty: 5,
        qualifyingSolves: 3,
        minEvidenceQuality: 0.6,
      },
    },
  ],
  difficultyMultipliers: {
    1: 1.0,
    2: 2.0,
    3: 3.0,
    4: 4.0,
    5: 5.0,
  },
  replayMultiplier: 0.25,
};

/**
 * Validates and parses a progression configuration object. Throws ZodError if invalid.
 */
export function validateProgressionConfig(config: unknown): ProgressionConfig {
  return ProgressionConfigSchema.parse(config);
}
