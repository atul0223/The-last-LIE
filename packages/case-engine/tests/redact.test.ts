import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CaseDefinition, SessionState } from '../src/schema/index.js';
import { canUnlock, toPublicCase } from '../src/redact/index.js';

const FORBIDDEN_KEYS = new Set([
  'truth',
  'claims',
  'culpritIds',
  'seed',
  'asserts',
  'keyEvidence',
  'liars',
  'conspiracyHooks',
]);

const INTERNAL_TAGS = ['red_herring', 'conspiracy_hook', 'tampered'];

function deepScan(
  target: unknown,
  forbiddenKeys: Set<string>,
  forbiddenTexts: string[],
  forbiddenIds: string[] = [],
  path = '',
): string[] {
  const leaks: string[] = [];

  if (target === null || target === undefined) {
    return leaks;
  }

  if (typeof target === 'string') {
    for (const text of forbiddenTexts) {
      if (text.length > 5 && target.includes(text)) {
        leaks.push(`Forbidden text leak at ${path}: "${text}"`);
      }
    }
    for (const tag of INTERNAL_TAGS) {
      if (target === tag || target.includes(tag)) {
        leaks.push(`Internal tag leak at ${path}: "${tag}"`);
      }
    }
    return leaks;
  }

  if (typeof target === 'object') {
    if (Array.isArray(target)) {
      target.forEach((item, idx) => {
        leaks.push(
          ...deepScan(item, forbiddenKeys, forbiddenTexts, forbiddenIds, `${path}[${idx}]`),
        );
      });
    } else {
      const obj = target as Record<string, unknown>;

      // Check if locked clue leaks real id
      if (obj['locked'] === true && typeof obj['id'] === 'string') {
        if (!/^locked_\d+$/.test(obj['id'])) {
          leaks.push(`Locked clue has non-opaque id: "${obj['id']}" at path "${path}.id"`);
        }
        if (forbiddenIds.includes(obj['id'])) {
          leaks.push(`Locked clue leaks real id "${obj['id']}" at path "${path}.id"`);
        }
      }

      for (const [key, value] of Object.entries(target)) {
        if (forbiddenKeys.has(key)) {
          leaks.push(`Forbidden key leak: "${key}" at path "${path}.${key}"`);
        }
        leaks.push(
          ...deepScan(value, forbiddenKeys, forbiddenTexts, forbiddenIds, `${path}.${key}`),
        );
      }
    }
  }

  return leaks;
}

function powerSet<T>(arr: T[]): T[][] {
  return arr.reduce((subsets, value) => subsets.concat(subsets.map((set) => [value, ...set])), [
    [],
  ] as T[][]);
}

describe('toPublicCase & Security Leak Tests (WP-06)', () => {
  const case0001Path = resolve(__dirname, '../../content/cases/authored/case_0001.json');
  const raw = readFileSync(case0001Path, 'utf-8');
  const case0001 = JSON.parse(raw) as CaseDefinition;

  it('drops all forbidden keys when all clues are unlocked', () => {
    const allClueIds = case0001.clues.map((c) => c.id);
    const pub = toPublicCase(case0001, allClueIds);

    const leaks = deepScan(pub, FORBIDDEN_KEYS, []);
    expect(leaks).toEqual([]);
    expect(pub.clues).toHaveLength(case0001.clues.length);
    expect(pub.lockedClueIds).toHaveLength(0);
    // Asserts is completely absent from all clues
    expect(pub.clues.every((c) => !('asserts' in c))).toBe(true);
  });

  it('masks locked clues as opaque placeholders (locked_1, locked_2...) with locked: true and no text or asserts', () => {
    const pub = toPublicCase(case0001, []);
    expect(pub.clues).toHaveLength(case0001.clues.length);
    expect(pub.lockedClueIds).toHaveLength(case0001.clues.length);

    let index = 1;
    for (const clue of pub.clues) {
      expect(clue).toHaveProperty('locked', true);
      expect(clue.id).toBe(`locked_${index++}`);
      expect((clue as Record<string, unknown>)['text']).toBeUndefined();
      expect((clue as Record<string, unknown>)['asserts']).toBeUndefined();
    }
  });

  it('runs deepScan over the complete power set of unlock states for case_0001 (128 combinations)', () => {
    const clueIds = case0001.clues.map((c) => c.id);
    const subsets = powerSet(clueIds);
    expect(subsets).toHaveLength(Math.pow(2, clueIds.length)); // 2^7 = 128

    for (const subset of subsets) {
      const unlockedSet = new Set(subset);
      const lockedClues = case0001.clues.filter((c) => !unlockedSet.has(c.id));
      const lockedTexts = lockedClues
        .map((c) => c.text)
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
      const lockedRealIds = lockedClues.map((c) => c.id);

      const pub = toPublicCase(case0001, subset);
      const leaks = deepScan(pub, FORBIDDEN_KEYS, lockedTexts, lockedRealIds);

      expect(leaks).toEqual([]);
      expect(pub.clues.filter((c) => c.locked === true)).toHaveLength(lockedClues.length);
      expect(pub.lockedClueIds).toHaveLength(lockedClues.length);
      expect(pub.hypotheses.every((h) => !('claims' in h))).toBe(true);
      expect(pub.hypotheses.every((h) => !('culpritIds' in h))).toBe(true);
      expect('truth' in pub).toBe(false);
      expect('conspiracyHooks' in pub).toBe(false);
      expect('asserts' in pub).toBe(false);
    }
  });

  it('filters out internal tags and preserves public tags', () => {
    const caseWithTags: CaseDefinition = {
      ...case0001,
      clues: [
        {
          ...case0001.clues[0]!,
          tags: ['physical', 'red_herring', 'conspiracy_hook', 'alibi'],
        },
      ],
    };

    const pub = toPublicCase(caseWithTags, [caseWithTags.clues[0]!.id]);
    const firstClue = pub.clues[0];
    if (firstClue && !firstClue.locked) {
      expect(firstClue.tags).toEqual(['physical', 'alibi']);
      expect(firstClue.tags).not.toContain('red_herring');
      expect(firstClue.tags).not.toContain('conspiracy_hook');
    } else {
      throw new Error('Expected first clue to be unlocked');
    }
  });

  it('handles locked clue hints: after_clue hides prerequisite until unlocked', () => {
    // clue_device_log unlocks after clue_keycard_exit
    // Case A: prerequisite is NOT unlocked -> hint is after_clue_hidden
    const pubWithoutPrereq = toPublicCase(case0001, []);
    const lockedWithoutPrereq = pubWithoutPrereq.clues.find(
      (c) => c.type === 'device_log' && c.locked === true,
    );
    if (lockedWithoutPrereq && lockedWithoutPrereq.locked) {
      expect(lockedWithoutPrereq.hint).toEqual({
        kind: 'after_clue_hidden',
      });
    } else {
      throw new Error('Expected locked device log');
    }

    // Case B: prerequisite is unlocked -> hint reveals prerequisite clueId
    const pubWithPrereq = toPublicCase(case0001, ['clue_keycard_exit']);
    const lockedWithPrereq = pubWithPrereq.clues.find(
      (c) => c.type === 'device_log' && c.locked === true,
    );
    if (lockedWithPrereq && lockedWithPrereq.locked) {
      expect(lockedWithPrereq.hint).toEqual({
        kind: 'after_clue',
        clueId: 'clue_keycard_exit',
      });
    } else {
      throw new Error('Expected locked device log with prerequisite');
    }
  });

  it('handles locked clue hints: interview and request', () => {
    const customCase: CaseDefinition = {
      ...case0001,
      clues: [
        ...case0001.clues,
        {
          id: 'clue_interview_q',
          type: 'testimony',
          reliability: 'testimony',
          asserts: [],
          text: 'An interview',
          unlock: {
            kind: 'interview',
            characterId: 'char_arjun',
            questionId: 'q_01',
          },
        },
        {
          id: 'clue_requested',
          type: 'document',
          reliability: 'physical',
          asserts: [],
          text: 'A subpoena',
          unlock: {
            kind: 'request',
            cost: 15,
          },
        },
      ],
    };

    const pub = toPublicCase(customCase, []);
    const interviewClue = pub.clues.find(
      (c) => c.locked === true && c.hint?.kind === 'interview',
    );
    if (interviewClue && interviewClue.locked) {
      expect(interviewClue.hint).toEqual({ kind: 'interview' });
    } else {
      throw new Error('Expected locked interview clue');
    }

    const requestClue = pub.clues.find(
      (c) => c.locked === true && c.hint?.kind === 'request',
    );
    if (requestClue && requestClue.locked) {
      expect(requestClue.hint).toEqual({ kind: 'request', cost: 15 });
    } else {
      throw new Error('Expected locked request clue');
    }
  });

  it('throws typed error if unlocked clue is missing text', () => {
    const brokenCase: CaseDefinition = {
      ...case0001,
      clues: [
        {
          ...case0001.clues[0]!,
          text: '   ',
        },
      ],
    };

    expect(() => toPublicCase(brokenCase, [brokenCase.clues[0]!.id])).toThrowError(
      /missing required text override/,
    );
  });
});

describe('canUnlock Clue Access Control (WP-06)', () => {
  const case0001Path = resolve(__dirname, '../../content/cases/authored/case_0001.json');
  const raw = readFileSync(case0001Path, 'utf-8');
  const case0001 = JSON.parse(raw) as CaseDefinition;

  function makeSession(unlocked: string[] = []): SessionState {
    return {
      id: 'session_01',
      caseId: case0001.id,
      caseVersion: 1,
      mode: 'normal',
      status: 'in_progress',
      unlockedClueIds: unlocked,
      board: { cards: [], links: [] },
      startedAt: '2026-10-29T10:00:00Z',
    };
  }

  it('rejects nonexistent clue', () => {
    const session = makeSession();
    const res = canUnlock(case0001, session, 'clue_ghost', { kind: 'default' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('clue_not_found');
  });

  it('rejects already unlocked clue', () => {
    const session = makeSession(['clue_arjun_testimony']);
    const res = canUnlock(case0001, session, 'clue_arjun_testimony', {
      kind: 'default',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('already_unlocked');
  });

  it('rejects unlock when session is not in_progress', () => {
    const session = makeSession();
    session.status = 'submitted';
    const res = canUnlock(case0001, session, 'clue_arjun_testimony', {
      kind: 'default',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('session_inactive');
  });

  it('unlocks default clue via default kind, rejects mismatch', () => {
    const session = makeSession();
    const okRes = canUnlock(case0001, session, 'clue_arjun_testimony', {
      kind: 'default',
    });
    expect(okRes.ok).toBe(true);

    const badRes = canUnlock(case0001, session, 'clue_arjun_testimony', {
      kind: 'after_clue',
    });
    expect(badRes.ok).toBe(false);
    if (!badRes.ok) expect(badRes.error).toBe('unlock_method_mismatch');
  });

  it('handles after_clue unlock: requires prerequisite clue to be unlocked', () => {
    const sessionWithoutPrereq = makeSession();
    // clue_device_log unlocks after clue_keycard_exit
    const failRes = canUnlock(case0001, sessionWithoutPrereq, 'clue_device_log', {
      kind: 'after_clue',
    });
    expect(failRes.ok).toBe(false);
    if (!failRes.ok) expect(failRes.error).toBe('prerequisite_not_unlocked');

    const sessionWithPrereq = makeSession(['clue_keycard_exit']);
    const okRes = canUnlock(case0001, sessionWithPrereq, 'clue_device_log', {
      kind: 'after_clue',
    });
    expect(okRes.ok).toBe(true);
  });

  it('handles interview unlock: validates character and question ids', () => {
    const customCase: CaseDefinition = {
      ...case0001,
      clues: [
        ...case0001.clues,
        {
          id: 'clue_interview_secret',
          type: 'testimony',
          reliability: 'testimony',
          asserts: [],
          text: 'Confession',
          unlock: {
            kind: 'interview',
            characterId: 'char_arjun',
            questionId: 'q_weapon',
          },
        },
      ],
    };

    const session = makeSession();
    const badKindRes = canUnlock(customCase, session, 'clue_interview_secret', {
      kind: 'default',
    });
    expect(badKindRes.ok).toBe(false);
    if (!badKindRes.ok) expect(badKindRes.error).toBe('unlock_method_mismatch');

    const wrongChar = canUnlock(customCase, session, 'clue_interview_secret', {
      kind: 'interview',
      characterId: 'char_maya',
      questionId: 'q_weapon',
    });
    expect(wrongChar.ok).toBe(false);
    if (!wrongChar.ok) expect(wrongChar.error).toBe('interview_mismatch');

    const okRes = canUnlock(customCase, session, 'clue_interview_secret', {
      kind: 'interview',
      characterId: 'char_arjun',
      questionId: 'q_weapon',
    });
    expect(okRes.ok).toBe(true);
  });

  it('handles request unlock: accepts request kind', () => {
    const customCase: CaseDefinition = {
      ...case0001,
      clues: [
        ...case0001.clues,
        {
          id: 'clue_subpoena',
          type: 'document',
          reliability: 'physical',
          asserts: [],
          text: 'Subpoena document',
          unlock: {
            kind: 'request',
            cost: 10,
          },
        },
      ],
    };

    const session = makeSession();
    const wrongRes = canUnlock(customCase, session, 'clue_subpoena', {
      kind: 'default',
    });
    expect(wrongRes.ok).toBe(false);
    if (!wrongRes.ok) expect(wrongRes.error).toBe('unlock_method_mismatch');

    const okRes = canUnlock(customCase, session, 'clue_subpoena', {
      kind: 'request',
    });
    expect(okRes.ok).toBe(true);
  });

  it('handles unknown unlock kind gracefully', () => {
    const customCase: CaseDefinition = {
      ...case0001,
      clues: [
        ...case0001.clues,
        {
          id: 'clue_weird',
          type: 'document',
          reliability: 'physical',
          asserts: [],
          text: 'Weird',
          unlock: { kind: 'alien' as unknown as 'default' },
        },
      ],
    };
    const session = makeSession();
    const res = canUnlock(customCase, session, 'clue_weird', { kind: 'default' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('unknown_unlock_kind');
  });
});
