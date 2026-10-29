import { useCallback, useRef } from 'react';
import type {
  CasePublic,
  SessionState,
  ScoreResult,
  Reveal,
  BoardState,
  Submission,
  ClueUnlock,
} from '@lastlie/case-engine';
import { useSessionStore } from './sessionStore';
import { getGameService, type GameService } from '../services';
import { GameServiceError } from '../services/local/errors';

export type CaseSessionStatus = 'loading' | 'active' | 'submitted' | 'error';

export interface UseCaseSessionReturn {
  casePublic: CasePublic | undefined;
  session: SessionState | undefined;
  status: CaseSessionStatus;
  error?: GameServiceError;
  result?: ScoreResult;
  reveal?: Reveal;
  unlockClue: (clueId: string, via: ClueUnlock) => Promise<void>;
  saveBoard: (board: BoardState) => void;
  markClueRead: (clueId: string) => void;
  submit: (submission: Omit<Submission, 'sessionId'> | Submission) => Promise<void>;
}

export function useGameService(): GameService {
  return getGameService();
}

export function useCaseSession(sessionId: string): UseCaseSessionReturn {
  const service = useGameService();
  const session = useSessionStore((state) => state.sessions[sessionId]);
  const casePublic = useSessionStore((state) => state.cases[sessionId]);
  const outcome = useSessionStore((state) => state.results[sessionId]);
  const error = useSessionStore((state) => state.errors[sessionId]);

  const saveBoardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  let status: CaseSessionStatus;
  if (error) {
    status = 'error';
  } else if (!session || !casePublic) {
    status = 'loading';
  } else if (session.status === 'submitted' || outcome) {
    status = 'submitted';
  } else {
    status = 'active';
  }

  const unlockClue = useCallback(
    async (clueId: string, via: ClueUnlock): Promise<void> => {
      try {
        useSessionStore.getState().setError(sessionId, undefined);
        const unlockedClue = await service.unlockClue(sessionId, clueId, via);

        const currentCase = useSessionStore.getState().getCasePublic(sessionId);
        if (currentCase) {
          const updatedClues = currentCase.clues.map((c) => (c.id === clueId ? unlockedClue : c));
          const updatedLockedIds = currentCase.lockedClueIds.filter((id) => id !== clueId);
          useSessionStore.getState().setCasePublic(sessionId, {
            ...currentCase,
            clues: updatedClues,
            lockedClueIds: updatedLockedIds,
          });
        }
      } catch (err: unknown) {
        const serviceError =
          err instanceof GameServiceError
            ? err
            : new GameServiceError(
                'CANNOT_UNLOCK',
                err instanceof Error ? err.message : String(err),
              );
        useSessionStore.getState().setError(sessionId, serviceError);
        throw serviceError;
      }
    },
    [sessionId, service],
  );

  const saveBoard = useCallback(
    (board: BoardState): void => {
      // 1. Optimistic update to Zustand store
      useSessionStore.getState().updateSession(sessionId, { board });

      // 2. Debounce call to GameService (500ms)
      if (saveBoardTimeoutRef.current) {
        clearTimeout(saveBoardTimeoutRef.current);
      }

      saveBoardTimeoutRef.current = setTimeout(async () => {
        try {
          await service.saveBoard(sessionId, board);
        } catch (err: unknown) {
          const serviceError =
            err instanceof GameServiceError
              ? err
              : new GameServiceError(
                  'UNKNOWN_ERROR',
                  err instanceof Error ? err.message : String(err),
                );
          useSessionStore.getState().setError(sessionId, serviceError);
        }
      }, 500);
    },
    [sessionId, service],
  );

  const markClueRead = useCallback(
    (clueId: string): void => {
      useSessionStore.getState().markClueRead(sessionId, clueId);
    },
    [sessionId],
  );

  const submit = useCallback(
    async (submissionInput: Omit<Submission, 'sessionId'> | Submission): Promise<void> => {
      if (isSubmittingRef.current) return;

      const currentSession = useSessionStore.getState().getSession(sessionId);
      if (!currentSession || currentSession.status === 'submitted') return;

      isSubmittingRef.current = true;
      try {
        if (saveBoardTimeoutRef.current) {
          clearTimeout(saveBoardTimeoutRef.current);
          saveBoardTimeoutRef.current = null;
        }

        const fullSubmission: Submission = {
          ...submissionInput,
          sessionId,
        };

        const resultOutcome = await service.submit(fullSubmission);
        useSessionStore.getState().setResult(sessionId, resultOutcome);
        useSessionStore.getState().setError(sessionId, undefined);
      } catch (err: unknown) {
        const serviceError =
          err instanceof GameServiceError
            ? err
            : new GameServiceError(
                'INVALID_SUBMISSION',
                err instanceof Error ? err.message : String(err),
              );
        useSessionStore.getState().setError(sessionId, serviceError);
        throw serviceError;
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [sessionId, service],
  );

  return {
    casePublic,
    session,
    status,
    error,
    result: outcome?.result,
    reveal: outcome?.reveal,
    unlockClue,
    saveBoard,
    markClueRead,
    submit,
  };
}
