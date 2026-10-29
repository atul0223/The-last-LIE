import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  SessionState,
  CasePublic,
  ScoreResult,
  Reveal,
  Submission,
} from '@lastlie/case-engine';
import {
  loadPersistedState,
  savePersistedState,
  createEmptyPersistedState,
  deepScanForLeaks,
  sanitizeForStorage,
  STORAGE_KEYS,
  type Migration,
} from '../src/store/persist';
import {
  MemoryKeyValueStore,
  LocalStorageKeyValueStore,
  setStorage,
  resetStorageLogging,
  createDefaultStorage,
} from '../src/services/local/storage';
import { useSessionStore, hydrateSessionStore } from '../src/store/sessionStore';
import { LocalGameService } from '../src/services/local/LocalGameService';

describe('Local Persistence & Storage Engine (WP-21)', () => {
  let memoryStore: MemoryKeyValueStore;

  const sampleSession: SessionState = {
    id: 'sess_test_resume_01',
    caseId: 'case_0001',
    caseVersion: 1,
    mode: 'normal',
    unlockedClueIds: ['clue_carrier', 'clue_office_log'],
    board: {
      cards: [{ id: 'clue_carrier', x: 120, y: 150 }],
      links: [{ a: 'clue_carrier', b: 'clue_office_log' }],
    },
    status: 'in_progress',
    startedAt: '2026-10-29T10:00:00.000Z',
  };

  const sampleCasePublic: CasePublic = {
    id: 'case_0001',
    version: 1,
    kind: 'authored',
    title: 'The Missing Message',
    difficulty: 1,
    estimatedMinutes: 6,
    mysteryType: 'forged_message',
    briefing: 'Who sent the forged message?',
    setting: {
      locationIds: ['loc_office'],
      date: '2026-10-24',
      summary: 'Tech HQ',
    },
    characters: [],
    locations: [],
    objects: [],
    clues: [
      {
        id: 'clue_carrier',
        type: 'message',
        reliability: 'testimony',
        text: 'SMS timestamp received at 23:47.',
        unlock: { kind: 'default' },
      },
      {
        id: 'locked_device',
        type: 'device_log',
        locked: true,
        hint: { kind: 'request', cost: 10 },
      },
    ],
    lockedClueIds: ['locked_device'],
    hypotheses: [{ id: 'hyp_01', label: 'Arjun forged it' }],
    meta: { status: 'published' },
  };

  const sampleResult: ScoreResult = {
    score: 95,
    xp: 150,
    breakdown: {
      correctHypothesis: true,
      hypothesisPoints: 50,
      evidencePoints: 25,
      contradictionPoints: 20,
      penaltyPoints: 0,
      multiplier: 1.0,
    },
  };

  const sampleReveal: Reveal = {
    caseId: 'case_0001',
    solutionHypothesisId: 'hyp_01',
    allClues: [],
    culprits: ['char_arjun'],
    explanation: [
      {
        time: 1427,
        text: 'Arjun forged the SMS from Maya phone.',
        clueIds: ['clue_carrier'],
      },
    ],
    validLinks: [{ a: 'clue_carrier', b: 'clue_office_log' }],
    invalidLinks: [],
  };

  beforeEach(() => {
    memoryStore = new MemoryKeyValueStore();
    setStorage(memoryStore);
    useSessionStore.getState().clear();
  });

  it('1. Round-trip: persists and reloads store state without loss', () => {
    const stateToSave = {
      schemaVersion: 1,
      sessions: { [sampleSession.id]: sampleSession },
      cases: { [sampleSession.id]: sampleCasePublic },
      results: { [sampleSession.id]: { result: sampleResult, reveal: sampleReveal } },
      readClueIds: { [sampleSession.id]: ['clue_carrier'] },
      activeSessionId: sampleSession.id,
      awardedSessionIds: [sampleSession.id],
    };

    savePersistedState(stateToSave, { store: memoryStore });

    const loaded = loadPersistedState({ store: memoryStore });
    expect(loaded.schemaVersion).toBe(1);
    expect(loaded.sessions[sampleSession.id]).toEqual(sampleSession);
    expect(loaded.cases[sampleSession.id]?.id).toBe('case_0001');
    expect(loaded.results[sampleSession.id]?.result.score).toBe(95);
    expect(loaded.readClueIds[sampleSession.id]).toEqual(['clue_carrier']);
    expect(loaded.activeSessionId).toBe(sampleSession.id);
    expect(loaded.awardedSessionIds).toEqual([sampleSession.id]);
  });

  it('2. Versioned migrations: upgrades v1 to v2 using ordered migration list', () => {
    const v1State = {
      schemaVersion: 1,
      sessions: { [sampleSession.id]: sampleSession },
      cases: {},
      results: {},
      readClueIds: {},
      activeSessionId: null,
      awardedSessionIds: [],
    };

    savePersistedState(v1State, { store: memoryStore });

    const testV2Migration: Migration = {
      version: 2,
      migrate: (data) => {
        return {
          ...data,
          v2Upgraded: true,
        };
      },
    };

    const loaded = loadPersistedState({
      store: memoryStore,
      targetVersion: 2,
      migrations: [
        { version: 1, migrate: (d) => d },
        testV2Migration,
      ],
    });

    expect(loaded.schemaVersion).toBe(2);
    expect((loaded as unknown as Record<string, unknown>).v2Upgraded).toBe(true);
    expect(loaded.sessions[sampleSession.id]?.id).toBe(sampleSession.id);
  });

  it('3. Corrupt blob: copies to lastlie:quarantine:<timestamp> and starts fresh without crashing', () => {
    const corruptPayload = '{"invalid_json_corrupted: true';
    memoryStore.set(STORAGE_KEYS.STATE, corruptPayload);

    const testTimestamp = 1710000999000;
    const loaded = loadPersistedState({
      store: memoryStore,
      getTimestamp: () => testTimestamp,
    });

    // 1. Fresh state returned
    expect(loaded).toEqual(createEmptyPersistedState(1));

    // 2. State key cleared
    expect(memoryStore.getString(STORAGE_KEYS.STATE)).toBeUndefined();

    // 3. Corrupt data quarantined
    const quarantined = memoryStore.getString(`lastlie:quarantine:${testTimestamp}`);
    expect(quarantined).toBe(corruptPayload);
  });

  it('3b. Invalid schema blob: quarantines invalid structure and starts fresh', () => {
    const invalidSchemaPayload = JSON.stringify({
      schemaVersion: 'invalid_string_version',
      sessions: 'not_an_object',
    });
    memoryStore.set(STORAGE_KEYS.STATE, invalidSchemaPayload);

    const testTimestamp = 1710000888000;
    const loaded = loadPersistedState({
      store: memoryStore,
      getTimestamp: () => testTimestamp,
    });

    expect(loaded).toEqual(createEmptyPersistedState(1));
    expect(memoryStore.getString(`lastlie:quarantine:${testTimestamp}`)).toBe(invalidSchemaPayload);
  });

  it('4. Resume scenario: restores in-progress session and maintains idempotency after simulated restart', async () => {
    const service1 = new LocalGameService();

    // 1. Start a session and perform actions
    const { session, case: publicCase } = await service1.startSession();
    const sessionId = session.id;

    // Update board in session
    const updatedBoard = {
      cards: [{ id: 'clue_test', x: 200, y: 300 }],
      links: [{ a: 'clue_test', b: 'clue_carrier' }],
    };
    await service1.saveBoard(sessionId, updatedBoard);
    useSessionStore.getState().markClueRead(sessionId, 'clue_carrier');

    // 2. Simulate complete app restart (new in-memory state rehydrating from storage)
    useSessionStore.setState({
      sessions: {},
      cases: {},
      results: {},
      readClueIds: {},
      errors: {},
      activeSessionId: null,
    });
    hydrateSessionStore(memoryStore);

    const resumedSession = useSessionStore.getState().getSession(sessionId);
    expect(resumedSession).toBeDefined();
    expect(resumedSession?.board.cards).toEqual([{ id: 'clue_test', x: 200, y: 300 }]);
    expect(resumedSession?.board.links).toEqual([{ a: 'clue_test', b: 'clue_carrier' }]);
    expect(useSessionStore.getState().getReadClues(sessionId)).toContain('clue_carrier');

    // 3. Submit the session
    const submission: Submission = {
      sessionId,
      hypothesisId: publicCase.hypotheses[0].id,
      supportingClueIds: [],
      contradictions: [],
    };

    const firstOutcome = await service1.submit(submission);
    expect(firstOutcome.result.score).toBeGreaterThan(0);
    expect(firstOutcome.result.xp).toBeGreaterThan(0);

    // 4. Simulate another restart over the same storage with a new LocalGameService instance
    hydrateSessionStore(memoryStore);
    const service2 = new LocalGameService();

    // The submitted session still displays its reveal
    const storedOutcome = useSessionStore.getState().getResult(sessionId);
    expect(storedOutcome).toBeDefined();
    expect(storedOutcome?.result.score).toBe(firstOutcome.result.score);
    expect(storedOutcome?.reveal.solutionHypothesisId).toBe(firstOutcome.reveal.solutionHypothesisId);

    // Submitting again is idempotent: returns existing outcome without awarding double XP
    const secondOutcome = await service2.submit(submission);
    expect(secondOutcome.result.score).toBe(firstOutcome.result.score);
  });

  it('5. SECURITY: deepScan proves storage contains no forbidden keys or locked clue text', async () => {
    const service = new LocalGameService();
    const { session, case: publicCase } = await service.startSession();

    // Play full loop
    await service.saveBoard(session.id, {
      cards: [{ id: 'card_1', x: 10, y: 10 }],
      links: [{ a: 'card_1', b: 'card_2' }],
    });

    await service.submit({
      sessionId: session.id,
      hypothesisId: publicCase.hypotheses[0].id,
      supportingClueIds: [],
      contradictions: [],
    });

    // DeepScan every single value written to persistent storage
    const allKeys = memoryStore.getAllKeys();
    expect(allKeys.length).toBeGreaterThan(0);

    for (const key of allKeys) {
      const raw = memoryStore.getString(key);
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw!);
      // Assert no leaks in stored payload
      expect(() => deepScanForLeaks(parsed)).not.toThrow();
    }

    // Direct unit test of sanitizeForStorage stripping forbidden keys
    const leakyObject = {
      safeTitle: 'Case 1',
      truth: { culprit: 'Maya' },
      claims: ['lie 1'],
      culpritIds: ['maya'],
      asserts: ['fact 1'],
      keyEvidence: ['e1'],
      liars: ['maya'],
      seed: 99999,
      lockedClue: {
        id: 'locked_01',
        locked: true,
        text: 'This secret text should be deleted',
      },
    };

    const sanitized = sanitizeForStorage(leakyObject);
    expect(() => deepScanForLeaks(sanitized)).not.toThrow();
    expect((sanitized as Record<string, unknown>).truth).toBeUndefined();
    expect((sanitized as Record<string, unknown>).claims).toBeUndefined();
    expect((sanitized as Record<string, unknown>).culpritIds).toBeUndefined();
    expect((sanitized as Record<string, unknown>).asserts).toBeUndefined();
    expect((sanitized as Record<string, unknown>).keyEvidence).toBeUndefined();
    expect((sanitized as Record<string, unknown>).liars).toBeUndefined();
    expect((sanitized as Record<string, unknown>).seed).toBeUndefined();
    expect((sanitized.lockedClue as Record<string, unknown>).text).toBeUndefined();
  });

  describe('6. Fallback and storage auto-detection', () => {
    it('falls back to MemoryKeyValueStore when MMKV and localStorage are unavailable', () => {
      resetStorageLogging();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const fallbackStorage = createDefaultStorage();
      expect(fallbackStorage).toBeInstanceOf(MemoryKeyValueStore);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('falling back to MemoryKeyValueStore'),
      );

      // Warning should log once
      createDefaultStorage();
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });

    it('LocalStorageKeyValueStore handles set, get, delete, getAllKeys', () => {
      const mockStorageData = new Map<string, string>();
      const fakeLocalStorage = {
        getItem: (k: string) => mockStorageData.get(k) ?? null,
        setItem: (k: string, v: string) => mockStorageData.set(k, v),
        removeItem: (k: string) => mockStorageData.delete(k),
        clear: () => mockStorageData.clear(),
        get length() {
          return mockStorageData.size;
        },
        key: (idx: number) => Array.from(mockStorageData.keys())[idx] ?? null,
      };

      const originalWindow = global.window;
      // @ts-expect-error Mocking browser window in test environment
      global.window = { localStorage: fakeLocalStorage };

      try {
        const localStore = new LocalStorageKeyValueStore();
        localStore.set('test_k', 'test_v');
        expect(localStore.getString('test_k')).toBe('test_v');
        expect(localStore.getAllKeys()).toContain('test_k');

        localStore.delete('test_k');
        expect(localStore.getString('test_k')).toBeUndefined();
      } finally {
        global.window = originalWindow;
      }
    });
  });
});
