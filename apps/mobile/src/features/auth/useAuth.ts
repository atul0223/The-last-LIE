import { useState, useEffect, useCallback } from 'react';
import { defaultAuthService, mapSupabaseUser, type SupabaseUser } from '../../lib/supabase';
import { getSupabaseClient, isAuthEnabled } from '../../lib/supabase/client';

export interface UseAuthReturn {
  user: SupabaseUser | null;
  isLoading: boolean;
  isAnonymous: boolean;
  isAuthEnabled: boolean;
  error: string | null;
  signInAnonymously: () => Promise<void>;
  sendUpgradeOtp: (email: string) => Promise<string>;
  verifyUpgradeOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const authEnabled = isAuthEnabled();

  const refreshUser = useCallback(async () => {
    if (!authEnabled) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await defaultAuthService.getSessionUser();
      if (!currentUser) {
        // Automatically sign in anonymously on first launch if enabled
        const anon = await defaultAuthService.signInAnonymously();
        setUser(anon);
      } else {
        setUser(currentUser);
      }
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [authEnabled]);

  useEffect(() => {
    refreshUser();

    const client = getSupabaseClient();
    if (!client) return;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const signInAnonymously = useCallback(async () => {
    setIsLoading(true);
    try {
      const anon = await defaultAuthService.signInAnonymously();
      setUser(anon);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Anonymous sign in failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendUpgradeOtp = useCallback(async (email: string): Promise<string> => {
    setIsLoading(true);
    try {
      const res = await defaultAuthService.sendEmailOtp(email);
      setError(null);
      return res.message;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyUpgradeOtp = useCallback(async (email: string, token: string) => {
    setIsLoading(true);
    try {
      const upgraded = await defaultAuthService.verifyEmailOtp(email, token);
      setUser(upgraded);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify code';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await defaultAuthService.signOut();
      setUser(null);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    isLoading,
    isAnonymous: user?.isAnonymous ?? true,
    isAuthEnabled: authEnabled,
    error,
    signInAnonymously,
    sendUpgradeOtp,
    verifyUpgradeOtp,
    signOut,
    refreshUser,
  };
}
