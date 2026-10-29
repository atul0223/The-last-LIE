import type { CaseDefinition, SessionState } from '../schema/index.js';
import type { CanUnlockOptions, CanUnlockResult } from './types.js';

/**
 * Evaluates whether a clue can be unlocked in the given session.
 */
export function canUnlock(
  def: CaseDefinition,
  session: SessionState,
  clueId: string,
  via: CanUnlockOptions,
): CanUnlockResult {
  // 1. Verify clue existence in case definition
  const clue = def.clues.find((c) => c.id === clueId);
  if (!clue) {
    return {
      ok: false,
      error: 'clue_not_found',
      message: `Clue '${clueId}' does not exist in case definition`,
    };
  }

  // 2. Check if already unlocked
  if (session.unlockedClueIds.includes(clueId)) {
    return {
      ok: false,
      error: 'already_unlocked',
      message: `Clue '${clueId}' is already unlocked in this session`,
    };
  }

  // 3. Verify session status
  if (session.status !== 'in_progress') {
    return {
      ok: false,
      error: 'session_inactive',
      message: `Session status is '${session.status}', must be 'in_progress' to unlock clues`,
    };
  }

  // 4. Validate unlock criteria based on clue.unlock
  const unlock = clue.unlock;

  switch (unlock.kind) {
    case 'default': {
      if (via.kind !== 'default') {
        return {
          ok: false,
          error: 'unlock_method_mismatch',
          message: `Clue '${clueId}' has unlock kind 'default', got '${via.kind}'`,
        };
      }
      return { ok: true };
    }

    case 'after_clue': {
      if (via.kind !== 'after_clue') {
        return {
          ok: false,
          error: 'unlock_method_mismatch',
          message: `Clue '${clueId}' has unlock kind 'after_clue', got '${via.kind}'`,
        };
      }
      const prerequisiteClueId = unlock.clueId;
      if (!session.unlockedClueIds.includes(prerequisiteClueId)) {
        return {
          ok: false,
          error: 'prerequisite_not_unlocked',
          message: `Prerequisite clue '${prerequisiteClueId}' is not unlocked in session`,
        };
      }
      return { ok: true };
    }

    case 'interview': {
      if (via.kind !== 'interview') {
        return {
          ok: false,
          error: 'unlock_method_mismatch',
          message: `Clue '${clueId}' has unlock kind 'interview', got '${via.kind}'`,
        };
      }
      if (via.characterId !== unlock.characterId || via.questionId !== unlock.questionId) {
        return {
          ok: false,
          error: 'interview_mismatch',
          message: `Interview parameters (char: ${via.characterId}, q: ${via.questionId}) do not match clue requirement (char: ${unlock.characterId}, q: ${unlock.questionId})`,
        };
      }
      return { ok: true };
    }

    case 'request': {
      if (via.kind !== 'request') {
        return {
          ok: false,
          error: 'unlock_method_mismatch',
          message: `Clue '${clueId}' has unlock kind 'request', got '${via.kind}'`,
        };
      }
      return { ok: true };
    }

    default: {
      return {
        ok: false,
        error: 'unknown_unlock_kind',
        message: 'Unknown clue unlock kind',
      };
    }
  }
}
