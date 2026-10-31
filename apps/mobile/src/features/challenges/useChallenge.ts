import { useState, useCallback } from 'react';
import type {
  ApiClient,
  ChallengeCompareResponse,
  CreateChallengeResponse,
  GetChallengeResponse,
} from '@lastlie/api-contract';
import { getStorage } from '../../services/local/storage/factory';
import type { KeyValueStore } from '../../services/local/storage/types';
import { validateChallengeCode } from './codeFormat';

export const GUEST_TOKEN_KEY_PREFIX = '@lastlie/guest_token_';

export interface UseChallengeReturn {
  isLoading: boolean;
  error: string | null;
  createChallenge: (
    apiClient: ApiClient,
    sessionId: string,
  ) => Promise<CreateChallengeResponse | null>;
  getChallenge: (apiClient: ApiClient, code: string) => Promise<GetChallengeResponse | null>;
  getGuestToken: (
    apiClient: ApiClient,
    code: string,
    storageOverride?: KeyValueStore,
  ) => Promise<string | null>;
  getCompare: (
    apiClient: ApiClient,
    code: string,
  ) => Promise<ChallengeCompareResponse | null>;
  clearError: () => void;
}

export function useChallenge(): UseChallengeReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const createChallenge = useCallback(
    async (
      apiClient: ApiClient,
      sessionId: string,
    ): Promise<CreateChallengeResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.createChallenge({ sessionId });
        return response;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create challenge';
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const getChallenge = useCallback(
    async (apiClient: ApiClient, code: string): Promise<GetChallengeResponse | null> => {
      const check = validateChallengeCode(code);
      if (!check.valid || !check.normalized) {
        setError(check.error || 'Invalid challenge code');
        return null;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.getChallenge(check.normalized);
        return response;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch challenge';
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const getGuestToken = useCallback(
    async (
      apiClient: ApiClient,
      code: string,
      storageOverride?: KeyValueStore,
    ): Promise<string | null> => {
      const check = validateChallengeCode(code);
      if (!check.valid || !check.normalized) {
        setError(check.error || 'Invalid challenge code');
        return null;
      }

      const storage = storageOverride ?? getStorage();
      const storageKey = `${GUEST_TOKEN_KEY_PREFIX}${check.normalized}`;

      // Check existing cached token
      const cached = storage.getString(storageKey);
      if (cached) {
        return cached;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.createGuestToken(check.normalized);
        storage.set(storageKey, response.guestToken);
        return response.guestToken;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create guest token';
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const getCompare = useCallback(
    async (apiClient: ApiClient, code: string): Promise<ChallengeCompareResponse | null> => {
      const check = validateChallengeCode(code);
      if (!check.valid || !check.normalized) {
        setError(check.error || 'Invalid challenge code');
        return null;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.getChallengeCompare(check.normalized);
        return response;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load challenge comparison';
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    isLoading,
    error,
    createChallenge,
    getChallenge,
    getGuestToken,
    getCompare,
    clearError,
  };
}
