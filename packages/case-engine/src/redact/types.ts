import type { ClueUnlock } from '../schema/index.js';

export interface CanUnlockOptions {
  kind: ClueUnlock['kind'];
  clueId?: string;
  characterId?: string;
  questionId?: string;
  [key: string]: unknown;
}

export type CanUnlockResult = { ok: true } | { ok: false; error: string; message: string };
