import type { CaseDefinition, Character } from '../../schema/index.js';
import type { ValidationIssue, ValidatorCheck, ValidatorContext } from '../types.js';

const HONORIFICS = new Set([
  'mr',
  'mrs',
  'ms',
  'miss',
  'dr',
  'prof',
  'professor',
  'rev',
  'reverend',
  'lord',
  'lady',
  'sir',
  'officer',
  'agent',
  'inspector',
  'detective',
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts significant name parts (first name, last name, and middle tokens)
 * from a character's full name, filtering out honorifics and single-letter initials.
 */
function getSignificantNameParts(fullName: string): string[] {
  return fullName
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((token) => token.length >= 2 && !HONORIFICS.has(token.toLowerCase()));
}

/**
 * Checks if a string contains any of the character's significant name parts as whole words.
 */
function textContainsCharacterName(text: string, char: Character): { matched: boolean; part?: string } {
  const parts = getSignificantNameParts(char.name);
  for (const part of parts) {
    // Unicode-aware word boundary pattern
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(part)}(?:[^\\p{L}\\p{N}]|$)`, 'iu');
    if (pattern.test(text)) {
      return { matched: true, part };
    }
  }
  return { matched: false };
}

/**
 * V16: presentation.neutral
 *
 * Enforces presentation neutrality in titles and briefings so the case presentation
 * does not give away the solution:
 * 1. Title must not contain any character's first or last name.
 * 2. Briefing: If it mentions any suspect (characters whose role includes "suspect"
 *    or who are listed in truth.culpritIds), it must mention every character with role
 *    "suspect" (with at least 2 such suspects), OR it must mention every culprit plus
 *    at least two non-culprits.
 */
export const v16PresentationNeutralCheck: ValidatorCheck = {
  checkId: 'presentation.neutral',
  run(def: CaseDefinition, _ctx: ValidatorContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 1. Check title for any character name
    for (const char of def.characters) {
      const { matched, part } = textContainsCharacterName(def.title, char);
      if (matched && part) {
        issues.push({
          checkId: 'presentation.neutral',
          severity: 'error',
          message: `Case title "${def.title}" contains character name part "${part}" from character "${char.name}"`,
          refs: [char.id],
        });
      }
    }

    // 2. Check briefing neutrality
    const culpritSet = new Set(def.truth.culpritIds ?? []);
    const culprits = def.characters.filter((c) => culpritSet.has(c.id));
    const nonCulprits = def.characters.filter((c) => !culpritSet.has(c.id));
    const roleSuspects = def.characters.filter((c) => c.role.toLowerCase().includes('suspect'));

    // Character mention helper
    const isMentioned = (c: Character): boolean => textContainsCharacterName(def.briefing, c).matched;

    // Check if any suspect is mentioned in the briefing
    const anySuspectMentioned = def.characters.some(
      (c) => (culpritSet.has(c.id) || c.role.toLowerCase().includes('suspect')) && isMentioned(c),
    );

    if (anySuspectMentioned) {
      const mentionsAllRoleSuspects =
        roleSuspects.length >= 2 && roleSuspects.every((c) => isMentioned(c));

      const mentionsAllCulpritsAndTwoNonCulprits =
        (culprits.length === 0 || culprits.every((c) => isMentioned(c))) &&
        nonCulprits.filter((c) => isMentioned(c)).length >= 2;

      if (!mentionsAllRoleSuspects && !mentionsAllCulpritsAndTwoNonCulprits) {
        issues.push({
          checkId: 'presentation.neutral',
          severity: 'error',
          message:
            'Briefing mentions a suspect but does not neutrally list all suspects (must mention every character with role "suspect", or every culprit plus at least two non-culprits)',
          refs: culprits.length > 0 ? culprits.map((c) => c.id) : roleSuspects.map((c) => c.id),
        });
      }
    }

    return issues;
  },
};
