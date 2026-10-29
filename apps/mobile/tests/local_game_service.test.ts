import { describe, it, expect, beforeEach } from 'vitest';
import { LocalGameService } from '../src/services/local/LocalGameService';
import { GameServiceError } from '../src/services/local/errors';
import { useSessionStore } from '../src/store';
import type { Submission } from '@lastlie/case-engine';

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

      // If clue has locked: true, ensure its text is not present
      if (record.locked === true && typeof record.text === 'string' && record.text.length > 0) {
        throw new Error(`Security leak detected: locked clue exposed text at path '${path}'`);
      }
    }
  }
}

describe('LocalGameService (WP-10)', () => {
  let service: LocalGameService;

  beforeEach(() => {
    useSessionStore.getState().clear();
    service = new LocalGameService();
  });

  it('runs a full session on case_0001 (start -> unlock -> saveBoard -> submit -> reveal)', async () => {
    // 1. Start session
    const { session, case: publicCase } = await service.startSession({
      caseId: 'case_0001',
      mode: 'normal',
    });

    expect(session).toBeDefined();
    expect(session.caseId).toBe('case_0001');
    expect(session.status).toBe('in_progress');
    expect(publicCase.id).toBe('case_0001');
    expect(publicCase.hypotheses.length).toBe(3);

    // Initial default unlocked clues in case_0001
    expect(session.unlockedClueIds).toContain('clue_message_carrier');
    expect(session.unlockedClueIds).toContain('clue_arjun_testimony');
    expect(session.unlockedClueIds).toContain('clue_maya_testimony');
    expect(session.unlockedClueIds).toContain('clue_rhea_testimony');
    expect(session.unlockedClueIds).toContain('clue_marcus_log');

    // Deep scan initial returned publicCase and session
    deepScan(publicCase, 'publicCase');
    deepScan(session, 'session');

    // 2. Unlock clue_keycard_exit (requires clue_maya_testimony)
    const clueExit = await service.unlockClue(session.id, 'clue_keycard_exit', {
      kind: 'after_clue',
      clueId: 'clue_maya_testimony',
    });
    expect(clueExit.id).toBe('clue_keycard_exit');
    expect(clueExit.locked).toBeFalsy();
    deepScan(clueExit, 'clue_keycard_exit');

    // 3. Unlock clue_device_log (requires clue_keycard_exit)
    const clueDevice = await service.unlockClue(session.id, 'clue_device_log', {
      kind: 'after_clue',
      clueId: 'clue_keycard_exit',
    });
    expect(clueDevice.id).toBe('clue_device_log');
    expect(clueDevice.locked).toBeFalsy();
    deepScan(clueDevice, 'clue_device_log');

    // Verify session store reflects both unlocked clues
    const currentSession = useSessionStore.getState().getSession(session.id);
    expect(currentSession?.unlockedClueIds).toContain('clue_keycard_exit');
    expect(currentSession?.unlockedClueIds).toContain('clue_device_log');
    expect(currentSession?.board.cards.some((c) => c.id === 'clue_device_log')).toBe(true);

    // 4. Save board
    const newBoard = {
      cards: [
        { id: 'clue_keycard_exit', x: 200, y: 150 },
        { id: 'clue_device_log', x: 450, y: 150 },
      ],
      links: [{ a: 'clue_arjun_testimony', b: 'clue_keycard_exit' }],
    };

    await service.saveBoard(session.id, newBoard);
    const updatedSession = useSessionStore.getState().getSession(session.id);
    expect(updatedSession?.board.links.length).toBe(1);
    expect(updatedSession?.board.cards.length).toBe(2);

    // 5. Submit theory
    const submission: Submission = {
      sessionId: session.id,
      hypothesisId: 'hyp_arjun_forged',
      supportingClueIds: ['clue_keycard_exit', 'clue_device_log'],
      contradictions: [{ a: 'clue_arjun_testimony', b: 'clue_keycard_exit' }],
    };

    const outcome = await service.submit(submission);
    expect(outcome.result.score).toBeGreaterThan(0);
    expect(outcome.result.breakdown.correctHypothesis).toBe(true);
    expect(outcome.reveal.solutionHypothesisId).toBe('hyp_arjun_forged');
    expect(outcome.reveal.culprits).toContain('char_arjun');

    // Verify session state updated to submitted
    const finalSession = useSessionStore.getState().getSession(session.id);
    expect(finalSession?.status).toBe('submitted');
    expect(finalSession?.submittedAt).toBeDefined();
  });

  it('submitting twice gives the same result and no double XP', async () => {
    const { session } = await service.startSession({ caseId: 'case_0001' });

    // Unlock prerequisites
    await service.unlockClue(session.id, 'clue_keycard_exit', {
      kind: 'after_clue',
      clueId: 'clue_maya_testimony',
    });
    await service.unlockClue(session.id, 'clue_device_log', {
      kind: 'after_clue',
      clueId: 'clue_keycard_exit',
    });

    const submission: Submission = {
      sessionId: session.id,
      hypothesisId: 'hyp_arjun_forged',
      supportingClueIds: ['clue_keycard_exit', 'clue_device_log'],
      contradictions: [{ a: 'clue_arjun_testimony', b: 'clue_keycard_exit' }],
    };

    const firstSubmit = await service.submit(submission);
    const initialXP = firstSubmit.result.xp;

    const secondSubmit = await service.submit(submission);

    expect(secondSubmit.result.score).toBe(firstSubmit.result.score);
    expect(secondSubmit.reveal.solutionHypothesisId).toBe(firstSubmit.reveal.solutionHypothesisId);
    expect(secondSubmit.result.xp).toBe(initialXP);
  });

  it('deepScans every value returned before submission for answer leaks', async () => {
    const { session, case: publicCase } = await service.startSession({ caseId: 'case_0001' });
    deepScan(session, 'session');
    deepScan(publicCase, 'publicCase');

    // Unlock clue_keycard_exit
    const clueA = await service.unlockClue(session.id, 'clue_keycard_exit', {
      kind: 'after_clue',
      clueId: 'clue_maya_testimony',
    });
    deepScan(clueA, 'clue_keycard_exit');

    // Unlock clue_device_log
    const clueB = await service.unlockClue(session.id, 'clue_device_log', {
      kind: 'after_clue',
      clueId: 'clue_keycard_exit',
    });
    deepScan(clueB, 'clue_device_log');

    // Daily & Archive checks
    const daily = await service.getDaily();
    deepScan(daily, 'daily');

    const progress = await service.getProgress();
    deepScan(progress, 'progress');

    const archive = await service.listArchive();
    deepScan(archive, 'archive');
  });

  it('throws typed errors for invalid operations', async () => {
    // 1. Case not found
    await expect(service.startSession({ caseId: 'case_missing_404' })).rejects.toThrowError(
      GameServiceError,
    );
    try {
      await service.startSession({ caseId: 'case_missing_404' });
    } catch (err) {
      expect((err as GameServiceError).code).toBe('CASE_NOT_FOUND');
    }

    // 2. Session not found
    await expect(
      service.unlockClue('non_existent_session', 'clue_device_log', {
        kind: 'after_clue',
        clueId: 'clue_keycard_exit',
      }),
    ).rejects.toThrowError(GameServiceError);

    // 3. Prerequisite not met for unlock
    const { session } = await service.startSession({ caseId: 'case_0001' });
    await expect(
      service.unlockClue(session.id, 'clue_device_log', {
        kind: 'after_clue',
        clueId: 'clue_keycard_exit', // prerequisite clue_keycard_exit not yet unlocked!
      }),
    ).rejects.toThrowError(GameServiceError);

    // 4. Cannot unlock after submission
    const submission: Submission = {
      sessionId: session.id,
      hypothesisId: 'hyp_arjun_forged',
      supportingClueIds: ['clue_message_carrier'],
      contradictions: [],
    };
    await service.submit(submission);

    await expect(
      service.unlockClue(session.id, 'clue_keycard_exit', {
        kind: 'after_clue',
        clueId: 'clue_maya_testimony',
      }),
    ).rejects.toThrowError(GameServiceError);
    try {
      await service.unlockClue(session.id, 'clue_keycard_exit', {
        kind: 'after_clue',
        clueId: 'clue_maya_testimony',
      });
    } catch (err) {
      expect((err as GameServiceError).code).toBe('ALREADY_SUBMITTED');
    }
  });
});
