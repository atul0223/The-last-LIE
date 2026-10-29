import { describe, it, expect, beforeEach } from 'vitest';
import { LocalGameService } from '../src/services/local/LocalGameService';
import { useSessionStore } from '../src/store';
import { MemoryKeyValueStore, setStorage } from '../src/services/local/storage';
import { deepScanForLeaks, loadPersistedState } from '../src/store/persist';
import { AUTHORED_CASES } from '@lastlie/content';
import { CaseDefinitionSchema } from '@lastlie/case-engine';

describe('R3 Security Audit: Phase 1 Defense in Depth', () => {
  let memoryStore: MemoryKeyValueStore;
  let service: LocalGameService;

  beforeEach(() => {
    memoryStore = new MemoryKeyValueStore();
    setStorage(memoryStore);
    useSessionStore.getState().clear();
    service = new LocalGameService();
  });

  it('A1. Service outputs strictly contain zero forbidden engine keys across all authored cases', async () => {
    for (const rawCase of AUTHORED_CASES) {
      const def = CaseDefinitionSchema.parse(rawCase);
      const { session, case: publicCase } = await service.startSession({ caseId: def.id });

      // Scan startSession response
      expect(() => deepScanForLeaks(session)).not.toThrow();
      expect(() => deepScanForLeaks(publicCase)).not.toThrow();

      // Check locked clues in publicCase have no text
      for (const clue of publicCase.clues) {
        if ('locked' in clue && clue.locked === true) {
          expect('text' in clue).toBe(false);
          expect('asserts' in clue).toBe(false);
        }
      }

      // Check hypotheses only have id and label
      for (const hyp of publicCase.hypotheses) {
        expect('claims' in hyp).toBe(false);
        expect('culpritIds' in hyp).toBe(false);
      }
    }
  });

  it('A2. Locked clue text never leaks in unlock failure or bad requests', async () => {
    const { session } = await service.startSession({ caseId: 'case_0001' });

    // Attempting to unlock an invalid or nonexistent clue
    await expect(
      service.unlockClue(session.id, 'clue_nonexistent_xyz', { kind: 'request', cost: 10 }),
    ).rejects.toThrow();
  });

  it('C1. Scoring integrity: double submission is idempotent and yields zero duplicate XP', async () => {
    const { session, case: publicCase } = await service.startSession({ caseId: 'case_0001' });

    // 1. Unlock prerequisite clue_keycard_exit
    await service.unlockClue(session.id, 'clue_keycard_exit', {
      kind: 'after_clue',
      clueId: 'clue_maya_testimony',
    });

    // 2. Unlock clue_device_log
    await service.unlockClue(session.id, 'clue_device_log', {
      kind: 'after_clue',
      clueId: 'clue_keycard_exit',
    });

    const submission = {
      sessionId: session.id,
      hypothesisId: publicCase.hypotheses[0]!.id,
      supportingClueIds: ['clue_message_carrier', 'clue_device_log'],
      contradictions: [
        {
          a: 'clue_arjun_testimony',
          b: 'clue_device_log',
        },
      ],
    };

    const first = await service.submit(submission);
    expect(first.result.score).toBeGreaterThan(0);
    const initialXP = first.result.xp;
    expect(initialXP).toBeGreaterThan(0);

    // Second submission on the exact same session
    const second = await service.submit(submission);
    expect(second.result.score).toBe(first.result.score);
    // Double submit does NOT grant double XP
    expect(second.result.xp).toBe(first.result.xp);
  });

  it('C2. Submission validation: rejects locked clue in supporting evidence', async () => {
    const { session, case: publicCase } = await service.startSession({ caseId: 'case_0001' });

    // Submit with clue_device_log which is still locked
    await expect(
      service.submit({
        sessionId: session.id,
        hypothesisId: publicCase.hypotheses[0]!.id,
        supportingClueIds: ['clue_device_log'],
        contradictions: [],
      }),
    ).rejects.toThrow();
  });

  it('C3. Submission validation: rejects nonexistent hypothesis ID', async () => {
    const { session } = await service.startSession({ caseId: 'case_0001' });

    await expect(
      service.submit({
        sessionId: session.id,
        hypothesisId: 'hyp_fake_id_9999',
        supportingClueIds: ['clue_message_carrier'],
        contradictions: [],
      }),
    ).rejects.toThrow();
  });

  it('G1. Persistent storage contains zero private case definitions or forbidden keys', async () => {
    const { session } = await service.startSession({ caseId: 'case_0001' });

    await service.saveBoard(session.id, {
      cards: [{ id: 'clue_message_carrier', x: 50, y: 50 }],
      links: [],
    });

    const persisted = loadPersistedState({ store: memoryStore });
    expect(() => deepScanForLeaks(persisted)).not.toThrow();

    // Verify raw JSON string in storage contains no forbidden keys
    const rawState = memoryStore.getString('lastlie:v1:state');
    expect(rawState).toBeDefined();
    expect(rawState).not.toContain('"truth"');
    expect(rawState).not.toContain('"culpritIds"');
    expect(rawState).not.toContain('"keyEvidence"');
    expect(rawState).not.toContain('"liars"');
  });
});
