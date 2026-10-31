import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';
import type {
  CasePublic,
  SessionState,
  ScoreResult,
  Reveal,
  PublicClue,
} from '@lastlie/case-engine';
import { useCaseSession, useGameService } from '../src/features/case/slots';
import { useSessionStore } from '../src/store';
import { GameServiceError } from '../src/services/local/errors';
import { setServiceConfig } from '../src/services/config';

const FORBIDDEN_LEAK_KEYS = new Set([
  'truth',
  'claims',
  'culpritIds',
  'seed',
  'keyEvidence',
  'liars',
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

      if (record.locked === true && typeof record.text === 'string' && record.text.length > 0) {
        throw new Error(`Security leak detected: locked clue exposed text at path '${path}'`);
      }
    }
  }
}

function renderCustomHook<T>(hookFn: () => T) {
  const result = {} as { current: T };
  function TestComponent() {
    result.current = hookFn();
    return null;
  }
  let root: renderer.ReactTestRenderer;
  act(() => {
    root = renderer.create(<TestComponent />);
  });
  return {
    result,
    rerender: () => {
      act(() => {
        root.update(<TestComponent />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

describe('useCaseSession slot data contract (WP-10b)', () => {
  const testSessionId = 'sess_test_100';

  const mockCasePublic: CasePublic = {
    id: 'case_0001',
    version: 1,
    kind: 'authored',
    title: 'The Missing Message',
    difficulty: 2,
    estimatedMinutes: 5,
    mysteryType: 'false_alibi',
    setting: {
      locationIds: ['loc_studio'],
      date: '2026-10-29',
      summary: 'Design tower',
    },
    briefing: 'A message was sent.',
    characters: [
      {
        id: 'char_maya',
        name: 'Maya Lin',
        role: 'Architect',
        publicDescription: 'Lead architect.',
      },
    ],
    locations: [
      {
        id: 'loc_studio',
        name: 'Studio',
        doorIds: [],
        adjacency: [],
      },
    ],
    objects: [],
    clues: [
      {
        id: 'clue_carrier',
        type: 'message',
        reliability: 'physical',
        text: 'Carrier log text',
        unlock: { kind: 'default' },
      },
      {
        id: 'clue_locked_01',
        type: 'device_log',
        locked: true,
        hint: { kind: 'after_clue', clueId: 'clue_carrier' },
      },
    ],
    lockedClueIds: ['clue_locked_01'],
    hypotheses: [
      { id: 'hyp_01', label: 'Arjun forged the message' },
      { id: 'hyp_02', label: 'Maya sent it' },
    ],
    meta: { status: 'published' },
  };

  const mockSession: SessionState = {
    id: testSessionId,
    caseId: 'case_0001',
    caseVersion: 1,
    mode: 'normal',
    unlockedClueIds: ['clue_carrier'],
    board: {
      cards: [{ id: 'clue_carrier', x: 100, y: 100 }],
      links: [],
    },
    status: 'in_progress',
    startedAt: '2026-10-29T11:00:00.000Z',
  };

  beforeEach(() => {
    useSessionStore.getState().clear();
    setServiceConfig({ mode: 'fake' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provides useGameService and initial active session state', () => {
    useSessionStore.getState().setSession(mockSession, mockCasePublic);

    const hook = renderCustomHook(() => useCaseSession(testSessionId));
    expect(hook.result.current.status).toBe('active');
    expect(hook.result.current.session?.id).toBe(testSessionId);
    expect(hook.result.current.casePublic?.id).toBe('case_0001');
    expect(hook.result.current.casePublic?.clues.length).toBe(2);
  });

  it('unlocks clue and updates casePublic in store and hook', async () => {
    const service = useGameService();
    const unlockedSample: PublicClue = {
      id: 'clue_locked_01',
      type: 'device_log',
      reliability: 'physical',
      text: 'Screen unlock log',
      unlock: { kind: 'after_clue', clueId: 'clue_carrier' },
    };

    vi.spyOn(service, 'unlockClue').mockResolvedValue(unlockedSample);

    useSessionStore.getState().setSession(mockSession, mockCasePublic);
    const hook = renderCustomHook(() => useCaseSession(testSessionId));

    await act(async () => {
      await hook.result.current.unlockClue('clue_locked_01', {
        kind: 'after_clue',
        clueId: 'clue_carrier',
      });
    });

    const updatedCase = useSessionStore.getState().getCasePublic(testSessionId);
    expect(updatedCase?.lockedClueIds).not.toContain('clue_locked_01');
    const clue = updatedCase?.clues.find((c) => c.id === 'clue_locked_01');
    expect(clue?.locked).toBeFalsy();
    if (clue && !clue.locked) {
      expect(clue.text).toBe('Screen unlock log');
    }

    // DeepScan updated public case
    deepScan(updatedCase, 'updatedCaseInStore');
  });

  it('submitting twice triggers only one GameService.submit call (idempotence)', async () => {
    const service = useGameService();
    const mockOutcome: { result: ScoreResult; reveal: Reveal } = {
      result: {
        score: 950,
        breakdown: {
          correctHypothesis: true,
          hypothesisPoints: 500,
          evidencePoints: 200,
          contradictionPoints: 250,
          penaltyPoints: 0,
          multiplier: 1.0,
        },
        xp: 150,
      },
      reveal: {
        caseId: 'case_0001',
        solutionHypothesisId: 'hyp_01',
        explanation: [{ text: 'Truth beat', clueIds: ['clue_carrier'] }],
        allClues: [],
        culprits: ['char_arjun'],
        validLinks: [],
        invalidLinks: [],
      },
    };

    const submitSpy = vi.spyOn(service, 'submit').mockResolvedValue(mockOutcome);

    useSessionStore.getState().setSession(mockSession, mockCasePublic);
    const hook = renderCustomHook(() => useCaseSession(testSessionId));

    await act(async () => {
      await hook.result.current.submit({
        hypothesisId: 'hyp_01',
        supportingClueIds: ['clue_carrier'],
        contradictions: [],
      });
    });

    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(hook.result.current.status).toBe('submitted');
    expect(hook.result.current.result?.score).toBe(950);
    expect(hook.result.current.reveal?.solutionHypothesisId).toBe('hyp_01');

    // Second call must be a no-op
    await act(async () => {
      await hook.result.current.submit({
        hypothesisId: 'hyp_01',
        supportingClueIds: ['clue_carrier'],
        contradictions: [],
      });
    });

    expect(submitSpy).toHaveBeenCalledTimes(1);
  });

  it('debounces saveBoard calls by 500ms', () => {
    vi.useFakeTimers();
    const service = useGameService();
    const saveBoardSpy = vi.spyOn(service, 'saveBoard').mockResolvedValue();

    useSessionStore.getState().setSession(mockSession, mockCasePublic);
    const hook = renderCustomHook(() => useCaseSession(testSessionId));

    const board1 = {
      cards: [{ id: 'clue_carrier', x: 120, y: 140 }],
      links: [],
    };
    const board2 = {
      cards: [{ id: 'clue_carrier', x: 220, y: 240 }],
      links: [],
    };

    act(() => {
      hook.result.current.saveBoard(board1);
    });

    // Optimistic store update
    expect(useSessionStore.getState().getSession(testSessionId)?.board.cards[0]?.x).toBe(120);

    // After 200ms, service has not been called yet
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(saveBoardSpy).not.toHaveBeenCalled();

    // Call saveBoard again before 500ms
    act(() => {
      hook.result.current.saveBoard(board2);
    });
    expect(useSessionStore.getState().getSession(testSessionId)?.board.cards[0]?.x).toBe(220);

    // Advance 300ms (total 500ms since board1, but only 300ms since board2)
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(saveBoardSpy).not.toHaveBeenCalled();

    // Advance remaining 200ms past board2's debounce timeout
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(saveBoardSpy).toHaveBeenCalledTimes(1);
    expect(saveBoardSpy).toHaveBeenCalledWith(testSessionId, board2);
  });

  it('handles and exposes error state on failure', async () => {
    const service = useGameService();
    vi.spyOn(service, 'unlockClue').mockRejectedValue(
      new GameServiceError('CANNOT_UNLOCK', 'Prerequisite not met'),
    );

    useSessionStore.getState().setSession(mockSession, mockCasePublic);
    const hook = renderCustomHook(() => useCaseSession(testSessionId));

    await expect(
      hook.result.current.unlockClue('clue_locked_01', {
        kind: 'after_clue',
        clueId: 'clue_carrier',
      }),
    ).rejects.toThrowError(GameServiceError);

    await act(async () => {});

    expect(hook.result.current.status).toBe('error');
    expect(hook.result.current.error?.code).toBe('CANNOT_UNLOCK');
  });

  it('deepScans casePublic held in store to prevent answer leaks', () => {
    useSessionStore.getState().setSession(mockSession, mockCasePublic);
    const storedCase = useSessionStore.getState().getCasePublic(testSessionId);
    expect(storedCase).toBeDefined();
    deepScan(storedCase, 'storedCase');
  });
});
