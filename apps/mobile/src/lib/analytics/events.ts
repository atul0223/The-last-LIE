export type AnalyticsEvent =
  | { name: 'app_open'; properties?: Record<string, never> }
  | {
      name: 'case_started';
      properties: {
        caseId: string;
        kind: string;
        difficulty: number;
        mode: string;
      };
    }
  | {
      name: 'clue_viewed';
      properties: {
        caseId: string;
        clueId: string;
      };
    }
  | {
      name: 'clue_unlocked';
      properties: {
        caseId: string;
        clueId: string;
        via: string;
      };
    }
  | {
      name: 'board_link_created';
      properties: {
        caseId: string;
        a: string;
        b: string;
        valid?: boolean;
      };
    }
  | {
      name: 'case_submitted';
      properties: {
        caseId: string;
        correct: boolean;
        score: number;
        durationSec: number;
      };
    }
  | {
      name: 'reveal_viewed';
      properties: {
        caseId: string;
      };
    }
  | {
      name: 'next_case_tapped';
      properties: {
        caseId: string;
      };
    }
  | {
      name: 'challenge_created';
      properties: {
        caseId: string;
        challengeCode?: string;
      };
    }
  | {
      name: 'challenge_opened';
      properties: {
        challengeCode: string;
        guest: boolean;
      };
    }
  | {
      name: 'challenge_completed';
      properties: {
        challengeCode: string;
      };
    }
  | {
      name: 'signup_from_challenge';
      properties: {
        challengeCode: string;
      };
    }
  | {
      name: 'case_reported';
      properties: {
        caseId: string;
        reason: string;
      };
    };

export type AnalyticsEventName = AnalyticsEvent['name'];

const ALLOWED_PROPERTIES_MAP: Record<AnalyticsEventName, Set<string>> = {
  app_open: new Set([]),
  case_started: new Set(['caseId', 'kind', 'difficulty', 'mode']),
  clue_viewed: new Set(['caseId', 'clueId']),
  clue_unlocked: new Set(['caseId', 'clueId', 'via']),
  board_link_created: new Set(['caseId', 'a', 'b', 'valid']),
  case_submitted: new Set(['caseId', 'correct', 'score', 'durationSec']),
  reveal_viewed: new Set(['caseId']),
  next_case_tapped: new Set(['caseId']),
  challenge_created: new Set(['caseId', 'challengeCode']),
  challenge_opened: new Set(['challengeCode', 'guest']),
  challenge_completed: new Set(['challengeCode']),
  signup_from_challenge: new Set(['challengeCode']),
  case_reported: new Set(['caseId', 'reason']),
};

const FORBIDDEN_KEY_PATTERNS = [
  /email/i,
  /name/i,
  /display.*name/i,
  /user/i,
  /text/i,
  /prose/i,
  /testimony/i,
  /claim/i,
  /hypothesis/i,
  /clue_text/i,
  /secret/i,
  /token/i,
  /pass/i,
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

/**
 * Validates an event against the strict §11 allow-list.
 * Ensures:
 * 1. Only defined event names exist in the union.
 * 2. Only allowed property keys for that event are present.
 * 3. No property values contain emails, display names, free text prose, or hypothesis/clue narrative content.
 */
export function validateEvent(event: AnalyticsEvent): { ok: boolean; reason?: string } {
  if (!event || typeof event !== 'object' || typeof event.name !== 'string') {
    return { ok: false, reason: 'Invalid event structure: missing or non-string name.' };
  }

  const allowedKeys = ALLOWED_PROPERTIES_MAP[event.name];
  if (!allowedKeys) {
    return { ok: false, reason: `Unknown event '${event.name}' is not in §11 event union.` };
  }

  const props = ('properties' in event && event.properties ? event.properties : {}) as Record<string, unknown>;

  for (const [key, value] of Object.entries(props)) {
    // 1. Check property allow-list
    if (!allowedKeys.has(key)) {
      return {
        ok: false,
        reason: `Disallowed property key '${key}' for event '${event.name}'. Allowed keys: ${Array.from(allowedKeys).join(', ')}`,
      };
    }

    // 2. Check key name against forbidden PII / free-text patterns
    for (const pattern of FORBIDDEN_KEY_PATTERNS) {
      if (pattern.test(key)) {
        return {
          ok: false,
          reason: `Property key '${key}' violates PII allow-list policy.`,
        };
      }
    }

    // 3. Check property string values for PII / narrative prose
    if (typeof value === 'string') {
      if (EMAIL_REGEX.test(value)) {
        return {
          ok: false,
          reason: `Property value for '${key}' contains an email address.`,
        };
      }

      // Prohibit long free-form text or multi-word sentences (> 4 words or > 64 chars)
      const wordCount = value.trim().split(/\s+/).length;
      if (value.length > 64 || wordCount > 4) {
        return {
          ok: false,
          reason: `Property value for '${key}' appears to contain free-text or clue/hypothesis prose (${value.length} chars, ${wordCount} words). Only IDs or tokens are allowed.`,
        };
      }

      // Check for common narrative keywords that indicate clue / hypothesis text
      if (/\b(stated|claimed|alibi|witness|victim|murder|suspect|turnstile)\b/i.test(value)) {
        return {
          ok: false,
          reason: `Property value for '${key}' contains narrative clue/hypothesis text keywords.`,
        };
      }
    }
  }

  return { ok: true };
}
