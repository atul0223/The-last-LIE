/**
 * Unambiguous alphabet used for 8-character challenge short codes.
 * Excludes easily confused characters: 0, 1, O, I.
 */
export const CHALLENGE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CHALLENGE_CODE_REGEX = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;

export interface CodeValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Validates and normalizes a challenge code string.
 */
export function validateChallengeCode(rawCode: string | null | undefined): CodeValidationResult {
  if (!rawCode || typeof rawCode !== 'string') {
    return { valid: false, error: 'Challenge code is missing or empty' };
  }

  const trimmed = rawCode.trim();
  // Strip any accidental URL prefix (e.g. /c/CODE or https://thelastlie.game/c/CODE)
  const codeOnly = trimmed.includes('/') ? trimmed.split('/').filter(Boolean).pop()! : trimmed;
  const normalized = codeOnly.toUpperCase();

  if (normalized.length !== 8) {
    return {
      valid: false,
      error: `Challenge code must be exactly 8 characters long (received ${normalized.length})`,
    };
  }

  if (!CHALLENGE_CODE_REGEX.test(normalized)) {
    return {
      valid: false,
      error: 'Challenge code contains invalid characters. Only unambiguous alphanumeric characters are permitted (no 0, 1, O, I).',
    };
  }

  return { valid: true, normalized };
}

/**
 * Formats a challenge code into a shareable web URL.
 */
export function formatChallengeUrl(code: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://thelastlie.game');
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${cleanBase}/c/${code.toUpperCase()}`;
}
