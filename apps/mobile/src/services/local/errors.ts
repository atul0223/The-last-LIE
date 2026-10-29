export type GameErrorCode =
  | 'CASE_NOT_FOUND'
  | 'SESSION_NOT_FOUND'
  | 'CLUE_NOT_FOUND'
  | 'CLUE_LOCKED'
  | 'CANNOT_UNLOCK'
  | 'ALREADY_SUBMITTED'
  | 'INVALID_SUBMISSION'
  | 'UNKNOWN_ERROR';

export class GameServiceError extends Error {
  readonly code: GameErrorCode;
  readonly details?: unknown;

  constructor(code: GameErrorCode, message: string, details?: unknown) {
    super(`[${code}] ${message}`);
    this.name = 'GameServiceError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, GameServiceError.prototype);
  }
}
