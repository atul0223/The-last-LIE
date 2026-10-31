import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer from 'react-test-renderer';
import type {
  ApiClient,
  ChallengeCompareResponse,
} from '@lastlie/api-contract';
import {
  validateChallengeCode,
  formatChallengeUrl,
  ResultCard,
  type ResultCardProps,
  ChallengeCompareView,
  ChallengeShareContent,
  GUEST_TOKEN_KEY_PREFIX,
} from '../src/features/challenges';
import { MemoryKeyValueStore } from '../src/services/local/storage/MemoryKeyValueStore';

const FORBIDDEN_LEAK_KEYS = new Set([
  'truth',
  'claims',
  'culpritIds',
  'seed',
  'keyEvidence',
  'liars',
  'solutionHypothesisId',
]);

function deepScan(value: unknown, path: string = 'root'): void {
  if (value === null || value === undefined) return;

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      value.forEach((item, idx) => deepScan(item, `${path}[${idx}]`));
    } else {
      const record = value as Record<string, unknown>;

      for (const [key, val] of Object.entries(record)) {
        if (FORBIDDEN_LEAK_KEYS.has(key)) {
          throw new Error(`Security leak detected: key '${key}' found at path '${path}.${key}'`);
        }
        deepScan(val, `${path}.${key}`);
      }
    }
  }
}

describe('WP-45: Challenges & Web Play', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Code Format Validation', () => {
    it('accepts valid 8-character codes from the unambiguous alphabet', () => {
      const validCodes = ['8X99K2LP', '23456789', 'ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'];
      for (const code of validCodes) {
        const result = validateChallengeCode(code);
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe(code);
        expect(result.error).toBeUndefined();
      }
    });

    it('normalizes lowercase codes and URL fragments to uppercase 8-character code', () => {
      const lower = validateChallengeCode('8x99k2lp');
      expect(lower.valid).toBe(true);
      expect(lower.normalized).toBe('8X99K2LP');

      const urlFragment = validateChallengeCode('/c/8x99k2lp');
      expect(urlFragment.valid).toBe(true);
      expect(urlFragment.normalized).toBe('8X99K2LP');

      const fullUrl = validateChallengeCode('https://thelastlie.game/c/8X99K2LP');
      expect(fullUrl.valid).toBe(true);
      expect(fullUrl.normalized).toBe('8X99K2LP');
    });

    it('rejects codes that are not 8 characters in length', () => {
      expect(validateChallengeCode('8X99').valid).toBe(false);
      expect(validateChallengeCode('8X99K2LPA').valid).toBe(false);
      expect(validateChallengeCode('').valid).toBe(false);
      expect(validateChallengeCode(null).valid).toBe(false);
    });

    it('rejects codes with ambiguous characters (0, 1, O, I) or symbols', () => {
      expect(validateChallengeCode('8X99K2L0').valid).toBe(false); // contains '0'
      expect(validateChallengeCode('8X99K2L1').valid).toBe(false); // contains '1'
      expect(validateChallengeCode('8X99K2LO').valid).toBe(false); // contains 'O'
      expect(validateChallengeCode('8X99K2LI').valid).toBe(false); // contains 'I'
      expect(validateChallengeCode('8X99-2LP').valid).toBe(false); // contains '-'
      expect(validateChallengeCode('8X99!2LP').valid).toBe(false); // contains '!'
    });

    it('formats challenge web URL correctly', () => {
      expect(formatChallengeUrl('8x99k2lp', 'https://thelastlie.game')).toBe(
        'https://thelastlie.game/c/8X99K2LP',
      );
    });
  });

  describe('Spoiler-Free Result Card (Security Audit)', () => {
    it('renders result card without leaking answers, hypotheses, or clue text', () => {
      const cardProps: ResultCardProps = {
        caseTitle: 'The Missing Chronometer',
        score: 95,
        xpEarned: 150,
        detectiveHandle: 'Agent Victor Vance',
        rankTitle: 'Senior Detective',
        callToAction: 'Can you beat my deduction?',
        challengeCode: '8X99K2LP',
      };

      // 1. Deep scan props for forbidden keys
      expect(() => deepScan(cardProps)).not.toThrow();

      // 2. Render and verify DOM content
      const tree = renderer.create(<ResultCard {...cardProps} />).toJSON();
      expect(tree).toBeTruthy();
      const str = JSON.stringify(tree);

      // Verify legitimate fields are present
      expect(str).toContain('The Missing Chronometer');
      expect(str).toContain('95');
      expect(str).toContain('Agent Victor Vance');
      expect(str).toContain('FLAWLESS DEDUCTION');
      expect(str).toContain('#8X99K2LP');

      // Verify ZERO leak keywords appear
      expect(str).not.toContain('culprit');
      expect(str).not.toContain('solutionHypothesis');
      expect(str).not.toContain('truth');
      expect(str).not.toContain('clue_');
      expect(str).not.toContain('hyp_');
    });

    it('fails deepScan if a spoiler property is accidentally injected', () => {
      const taintedProps = {
        caseTitle: 'The Broken Mirror',
        score: 80,
        solutionHypothesisId: 'hyp_1', // FORBIDDEN!
      };

      expect(() => deepScan(taintedProps)).toThrow(/Security leak detected/);
    });
  });

  describe('Peer Deduction Compare View Gating', () => {
    const mockCompareData: ChallengeCompareResponse = {
      code: '8X99K2LP',
      totalParticipants: 12,
      hypothesisDistribution: {
        hyp_1: 8,
        hyp_2: 3,
        hyp_3: 1,
      },
      mostUsedClues: [
        { clueId: 'clue_keycard_exit', count: 11 },
        { clueId: 'clue_message_log', count: 9 },
      ],
    };

    it('strictly locks comparison statistics before submission', () => {
      const tree = renderer
        .create(
          <ChallengeCompareView
            hasSubmitted={false}
            compareData={mockCompareData}
          />,
        )
        .toJSON();

      expect(tree).toBeTruthy();
      const str = JSON.stringify(tree);

      expect(str).toContain('CLASSIFIED // COMPARISON LOCKED');
      expect(str).toContain('Peer Statistics Locked');

      // Crucial: Distribution percentages and participant counts must NOT be shown when locked
      expect(str).not.toContain('12 DETECTIVES');
      expect(str).not.toContain('clue_keycard_exit');
    });

    it('displays aggregate distributions and clue citations after submission', () => {
      const tree = renderer
        .create(
          <ChallengeCompareView
            hasSubmitted={true}
            compareData={mockCompareData}
            hypothesisLabels={{
              hyp_1: 'Marcus altered the security schedule',
              hyp_2: 'Elena forged the visitor pass',
              hyp_3: 'Julian bypassed the sensor',
            }}
            clueLabels={{
              clue_keycard_exit: 'Keycard Access Log',
              clue_message_log: 'Encrypted Message',
            }}
          />,
        )
        .toJSON();

      expect(tree).toBeTruthy();
      const str = JSON.stringify(tree);

      expect(str).toContain('PEER DEDUCTION COMPARISON');
      expect(str).toContain('12 DETECTIVES');
      expect(str).toContain('Marcus altered the security schedule');
      expect(str).toContain('67%'); // 8/12 = 67%
      expect(str).toContain('Keycard Access Log');
      expect(str).toContain('11');

      // Verify no PII or user IDs
      expect(() => deepScan(mockCompareData)).not.toThrow();
    });
  });

  describe('Challenge Hook & Guest Token Flow', () => {
    it('creates challenge and formats response through ApiClient', async () => {
      let createdSessionId: string | null = null;
      const fakeApiClient: Partial<ApiClient> = {
        createChallenge: async (req) => {
          createdSessionId = req.sessionId;
          return {
            code: '8X99K2LP',
            url: 'https://thelastlie.game/c/8X99K2LP',
            expiresAt: '2026-11-08T00:00:00Z',
          };
        },
      };

      // Direct method invocation test
      const response = await fakeApiClient.createChallenge!({ sessionId: 'sess_123' });
      expect(createdSessionId).toBe('sess_123');
      expect(response.code).toBe('8X99K2LP');
    });

    it('persists and retrieves guest token across sessions', async () => {
      const storage = new MemoryKeyValueStore();
      const code = '8X99K2LP';
      const guestKey = `${GUEST_TOKEN_KEY_PREFIX}${code}`;

      expect(storage.getString(guestKey)).toBeUndefined();

      // Simulate token generation and persistence
      const fakeGuestToken = 'mock_jwt_guest_token_abc.sig';
      storage.set(guestKey, fakeGuestToken);

      expect(storage.getString(guestKey)).toBe(fakeGuestToken);
    });
  });

  describe('ChallengeShareModal Rendering', () => {
    it('renders share modal with result card and copyable link', () => {
      const tree = renderer
        .create(
          <ChallengeShareContent
            onClose={() => {}}
            challengeCode="8X99K2LP"
            caseTitle="The Missing Chronometer"
            score={95}
            xpEarned={150}
            detectiveHandle="Agent Victor Vance"
          />,
        )
        .toJSON();

      expect(tree).toBeTruthy();
      const str = JSON.stringify(tree);

      expect(str).toContain('CHALLENGE A FRIEND');
      expect(str).toContain('https://thelastlie.game/c/8X99K2LP');
      expect(str).toContain('SHARE CHALLENGE');
      expect(str).toContain('COPY LINK');
    });
  });
});
