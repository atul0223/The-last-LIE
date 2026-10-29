import { create } from 'zustand';
import type { SessionState, CasePublic, ScoreResult, Reveal } from '@lastlie/case-engine';
import type { GameServiceError } from '../services/local/errors';
import {
  loadPersistedState,
  savePersistedState,
  createEmptyPersistedState,
  type KeyValueStore,
} from './persist';

export interface SessionResultOutcome {
  result: ScoreResult;
  reveal: Reveal;
}

export interface SessionStoreState {
  sessions: Record<string, SessionState>;
  cases: Record<string, CasePublic>;
  results: Record<string, SessionResultOutcome>;
  readClueIds: Record<string, string[]>;
  errors: Record<string, GameServiceError | undefined>;
  activeSessionId: string | null;

  setSession: (session: SessionState, casePublic?: CasePublic) => void;
  setCasePublic: (sessionId: string, casePublic: CasePublic) => void;
  updateSession: (sessionId: string, patch: Partial<SessionState>) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  setResult: (sessionId: string, outcome: SessionResultOutcome) => void;
  setError: (sessionId: string, error?: GameServiceError) => void;
  markClueRead: (sessionId: string, clueId: string) => void;
  getSession: (sessionId: string) => SessionState | undefined;
  getCasePublic: (sessionId: string) => CasePublic | undefined;
  getResult: (sessionId: string) => SessionResultOutcome | undefined;
  getReadClues: (sessionId: string) => string[];
  getError: (sessionId: string) => GameServiceError | undefined;
  clear: () => void;
}

function persistStoreState(state: {
  sessions: Record<string, SessionState>;
  cases: Record<string, CasePublic>;
  results: Record<string, SessionResultOutcome>;
  readClueIds: Record<string, string[]>;
  activeSessionId: string | null;
}) {
  try {
    const existing = loadPersistedState();
    savePersistedState({
      schemaVersion: existing.schemaVersion,
      sessions: state.sessions,
      cases: state.cases,
      results: state.results,
      readClueIds: state.readClueIds,
      activeSessionId: state.activeSessionId,
      awardedSessionIds: existing.awardedSessionIds,
    });
  } catch {
    // Storage persistence errors do not crash the runtime
  }
}

const initialPersisted = loadPersistedState();

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  sessions: initialPersisted.sessions,
  cases: initialPersisted.cases,
  results: initialPersisted.results,
  readClueIds: initialPersisted.readClueIds,
  errors: {},
  activeSessionId: initialPersisted.activeSessionId,

  setSession: (session, casePublic) =>
    set((state) => {
      const nextSessions = { ...state.sessions, [session.id]: session };
      const nextCases = casePublic ? { ...state.cases, [session.id]: casePublic } : state.cases;
      const nextState = {
        sessions: nextSessions,
        cases: nextCases,
        activeSessionId: session.id,
        errors: { ...state.errors, [session.id]: undefined },
      };
      persistStoreState({
        sessions: nextSessions,
        cases: nextCases,
        results: state.results,
        readClueIds: state.readClueIds,
        activeSessionId: session.id,
      });
      return nextState;
    }),

  setCasePublic: (sessionId, casePublic) =>
    set((state) => {
      const nextCases = { ...state.cases, [sessionId]: casePublic };
      persistStoreState({
        sessions: state.sessions,
        cases: nextCases,
        results: state.results,
        readClueIds: state.readClueIds,
        activeSessionId: state.activeSessionId,
      });
      return { cases: nextCases };
    }),

  updateSession: (sessionId, patch) =>
    set((state) => {
      const existing = state.sessions[sessionId];
      if (!existing) return state;
      const nextSessions = {
        ...state.sessions,
        [sessionId]: { ...existing, ...patch },
      };
      persistStoreState({
        sessions: nextSessions,
        cases: state.cases,
        results: state.results,
        readClueIds: state.readClueIds,
        activeSessionId: state.activeSessionId,
      });
      return { sessions: nextSessions };
    }),

  setActiveSessionId: (sessionId) =>
    set((state) => {
      persistStoreState({
        sessions: state.sessions,
        cases: state.cases,
        results: state.results,
        readClueIds: state.readClueIds,
        activeSessionId: sessionId,
      });
      return { activeSessionId: sessionId };
    }),

  setResult: (sessionId, outcome) =>
    set((state) => {
      const nextResults = { ...state.results, [sessionId]: outcome };
      const nextSessions = state.sessions[sessionId]
        ? {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId]!,
              status: 'submitted' as const,
            },
          }
        : state.sessions;

      persistStoreState({
        sessions: nextSessions,
        cases: state.cases,
        results: nextResults,
        readClueIds: state.readClueIds,
        activeSessionId: state.activeSessionId,
      });

      return {
        results: nextResults,
        sessions: nextSessions,
      };
    }),

  setError: (sessionId, error) =>
    set((state) => ({
      errors: { ...state.errors, [sessionId]: error },
    })),

  markClueRead: (sessionId, clueId) =>
    set((state) => {
      const list = state.readClueIds[sessionId] ?? [];
      if (list.includes(clueId)) return state;
      const nextRead = {
        ...state.readClueIds,
        [sessionId]: [...list, clueId],
      };
      persistStoreState({
        sessions: state.sessions,
        cases: state.cases,
        results: state.results,
        readClueIds: nextRead,
        activeSessionId: state.activeSessionId,
      });
      return { readClueIds: nextRead };
    }),

  getSession: (sessionId) => get().sessions[sessionId],

  getCasePublic: (sessionId) => get().cases[sessionId],

  getResult: (sessionId) => get().results[sessionId],

  getReadClues: (sessionId) => get().readClueIds[sessionId] ?? [],

  getError: (sessionId) => get().errors[sessionId],

  clear: () => {
    savePersistedState(createEmptyPersistedState());
    set({
      sessions: {},
      cases: {},
      results: {},
      readClueIds: {},
      errors: {},
      activeSessionId: null,
    });
  },
}));

/**
 * Rehydrates the session store from persistent storage (e.g. after restart or storage switch).
 */
export function hydrateSessionStore(storeOverride?: KeyValueStore): void {
  const loaded = loadPersistedState({ store: storeOverride });
  useSessionStore.setState({
    sessions: loaded.sessions,
    cases: loaded.cases,
    results: loaded.results,
    readClueIds: loaded.readClueIds,
    activeSessionId: loaded.activeSessionId,
    errors: {},
  });
}
