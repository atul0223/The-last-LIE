import { create } from 'zustand';
import type { SessionState, ScoreResult, Reveal } from '@lastlie/case-engine';

export interface SessionResultOutcome {
  result: ScoreResult;
  reveal: Reveal;
}

export interface SessionStoreState {
  sessions: Record<string, SessionState>;
  results: Record<string, SessionResultOutcome>;
  activeSessionId: string | null;

  setSession: (session: SessionState) => void;
  updateSession: (sessionId: string, patch: Partial<SessionState>) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  setResult: (sessionId: string, outcome: SessionResultOutcome) => void;
  getSession: (sessionId: string) => SessionState | undefined;
  getResult: (sessionId: string) => SessionResultOutcome | undefined;
  clear: () => void;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  sessions: {},
  results: {},
  activeSessionId: null,

  setSession: (session) =>
    set((state) => ({
      sessions: { ...state.sessions, [session.id]: session },
      activeSessionId: session.id,
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
    })),

  getSession: (sessionId) => get().sessions[sessionId],

  getResult: (sessionId) => get().results[sessionId],

  clear: () => set({ sessions: {}, results: {}, activeSessionId: null }),
}));
