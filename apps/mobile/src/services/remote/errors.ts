import type { GameErrorCode } from '../local/errors';
import type { ApiError, ApiErrorCode, ApiErrorEnvelope } from '@lastlie/api-contract';

export type ExtendedErrorCode = ApiErrorCode | GameErrorCode | 'SCHEMA_MISMATCH' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';

export class RemoteServiceError extends Error {
  readonly code: ExtendedErrorCode;
  readonly status?: number;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(
    code: ExtendedErrorCode,
    message: string,
    status?: number,
    requestId?: string,
    details?: unknown,
  ) {
    super(`[${code}] ${message}`);
    this.name = 'RemoteServiceError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
    Object.setPrototypeOf(this, RemoteServiceError.prototype);
  }

  get isClientError(): boolean {
    return typeof this.status === 'number' && this.status >= 400 && this.status < 500;
  }

  get isServerError(): boolean {
    return typeof this.status === 'number' && this.status >= 500;
  }

  get isNotFound(): boolean {
    return (
      this.status === 404 ||
      this.code === 'NOT_FOUND' ||
      this.code === 'SESSION_NOT_FOUND' ||
      this.code === 'CHALLENGE_NOT_FOUND'
    );
  }

  get isConflict(): boolean {
    return (
      this.status === 409 ||
      this.code === 'CONFLICT' ||
      this.code === 'SESSION_ALREADY_SUBMITTED' ||
      this.code === 'ALREADY_ATTACHED'
    );
  }

  get isUnauthorized(): boolean {
    return (
      this.status === 401 ||
      this.status === 403 ||
      this.code === 'UNAUTHORIZED' ||
      this.code === 'FORBIDDEN' ||
      this.code === 'INVALID_CREDENTIALS'
    );
  }

  get isSchemaMismatch(): boolean {
    return this.code === 'SCHEMA_MISMATCH' || this.code === 'UNPROCESSABLE_ENTITY';
  }

  static fromApiError(error: ApiError, status?: number): RemoteServiceError {
    return new RemoteServiceError(error.code, error.message, status, error.requestId);
  }

  static fromEnvelope(envelope: ApiErrorEnvelope, status?: number): RemoteServiceError {
    return RemoteServiceError.fromApiError(envelope.error, status);
  }
}
