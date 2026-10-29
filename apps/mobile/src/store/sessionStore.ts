import { create } from 'zustand';
import type { SessionState, CasePublic, ScoreResult, Reveal } from '@lastlie/case-engine';
import type { GameServiceError } from '../services/local/errors';

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

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  sessions: {},
  cases: {},
  results: {},
  readClueIds: {},
  errors: {},
  activeSessionId: null,

  setSession: (session, casePublic) =>
    set((state) => ({
      sessions: { ...state.sessions, [session.id]: session },
      cases: casePublic ? { ...state.cases, [session.id]: casePublic } : state.cases,
      activeSessionId: session.id,
      errors: { ...state.errors, [session.id]: undefined },
    })),

  setCasePublic: (sessionId, casePublic) =>
    set((state) => ({
      cases: { ...state.cases, [sessionId]: casePublic },
    })),

  updateSession: (sessionId, patch) =>
    set((state) => {
      const existing = state.sessions[sessionId];
      if (!existing) return state;
      return {
        sessions: {
          ...state.sessions,
          [sessionId]: { ...existing, ...patch },
        },
      };
    }),

  setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),

  setResult: (sessionId, outcome) =>
    set((state) => ({
      results: { ...state.results, [sessionId]: outcome },
      sessions: state.sessions[sessionId]
        ? {
            ...state.sessions,
            [sessionId]: {
              ...state.sessions[sessionId]!,
              status: 'submitted',
            },
          }
        : state.sessions,
    })),

  setError: (sessionId, error) =>
    set((state) => ({
      errors: { ...state.errors, [sessionId]: error },
    })),

  markClueRead: (sessionId, clueId) =>
    set((state) => {
      const list = state.readClueIds[sessionId] ?? [];
      if (list.includes(clueId)) return state;
      return {
        readClueIds: {
          ...state.readClueIds,
          [sessionId]: [...list, clueId],
        },
      };
    }),

  getSession: (sessionId) => get().sessions[sessionId],

  getCasePublic: (sessionId) => get().cases[sessionId],

  getResult: (sessionId) => get().results[sessionId],

  getReadClues: (sessionId) => get().readClueIds[sessionId] ?? [],

  getError: (sessionId) => get().errors[sessionId],

  clear: () =>
    set({
      sessions: {},
      cases: {},
      results: {},
      readClueIds: {},
      errors: {},
      activeSessionId: null,
    }),
}));
