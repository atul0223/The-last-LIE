import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { ApiClient } from '@lastlie/api-contract';
import { getSupabaseClient, isAuthEnabled } from './client';
import { useSessionStore } from '../../store';
import type { SocialAuthFlags, SupabaseUser } from './types';

export function socialAuthEnabled(): SocialAuthFlags {
  return {
    apple: process.env.EXPO_PUBLIC_ENABLE_APPLE_AUTH === 'true',
    google: process.env.EXPO_PUBLIC_ENABLE_GOOGLE_AUTH === 'true',
  };
}

export function mapSupabaseUser(user: User): SupabaseUser {
  return {
    id: user.id,
    email: user.email,
    isAnonymous: user.is_anonymous ?? user.app_metadata?.provider === 'anonymous',
    userMetadata: user.user_metadata,
    createdAt: user.created_at,
  };
}

export class AuthService {
  private client: SupabaseClient | null;

  constructor(clientOverride?: SupabaseClient | null) {
    this.client = clientOverride !== undefined ? clientOverride : getSupabaseClient();
  }

  isAvailable(): boolean {
    return isAuthEnabled() && this.client !== null;
  }

  async getSessionUser(): Promise<SupabaseUser | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.auth.getSession();
    if (error || !data.session?.user) return null;
    return mapSupabaseUser(data.session.user);
  }

  /**
   * Signs in anonymously on first launch.
   */
  async signInAnonymously(): Promise<SupabaseUser> {
    if (!this.client) {
      throw new Error('[AuthService] Supabase credentials not configured. Auth is offline.');
    }

    const { data, error } = await this.client.auth.signInAnonymously();
    if (error || !data.user) {
      throw new Error(`Anonymous sign-in failed: ${error?.message || 'No user returned'}`);
    }

    return mapSupabaseUser(data.user);
  }

  /**
   * Upgrades an anonymous user with email OTP.
   * Sends an OTP verification token to the provided email.
   */
  async sendEmailOtp(email: string): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      throw new Error('[AuthService] Supabase credentials not configured. Auth is offline.');
    }

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new Error('Please enter a valid email address.');
    }

    const { data: sessionData } = await this.client.auth.getSession();
    const currentUser = sessionData?.session?.user;

    if (currentUser?.is_anonymous) {
      // Link email to existing anonymous user so user.id does not change
      const { error } = await this.client.auth.updateUser({ email: trimmed });
      if (error) {
        throw new Error(`Failed to send upgrade email: ${error.message}`);
      }
    } else {
      // Direct sign in with OTP
      const { error } = await this.client.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) {
        throw new Error(`Failed to send email verification: ${error.message}`);
      }
    }

    return {
      success: true,
      message: 'Verification code sent to your email.',
    };
  }

  /**
   * Verifies OTP token, completing the account upgrade while preserving the user ID.
   */
  async verifyEmailOtp(email: string, token: string): Promise<SupabaseUser> {
    if (!this.client) {
      throw new Error('[AuthService] Supabase credentials not configured. Auth is offline.');
    }

    const trimmedEmail = email.trim();
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      throw new Error('Verification code cannot be empty.');
    }

    const { data, error } = await this.client.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'email',
    });

    if (error || !data.user) {
      throw new Error(`Verification failed: ${error?.message || 'Invalid or expired code'}`);
    }

    return mapSupabaseUser(data.user);
  }

  /**
   * Updates display name and metadata on the active user profile.
   */
  async updateProfile(updates: { displayName?: string; title?: string }): Promise<SupabaseUser> {
    if (!this.client) {
      throw new Error('[AuthService] Supabase credentials not configured.');
    }

    const { data, error } = await this.client.auth.updateUser({
      data: updates,
    });

    if (error || !data.user) {
      throw new Error(`Failed to update profile: ${error?.message || 'Update failed'}`);
    }

    return mapSupabaseUser(data.user);
  }

  /**
   * Signs out the current user and clears session credentials.
   */
  async signOut(): Promise<void> {
    if (this.client) {
      await this.client.auth.signOut();
    }
  }

  /**
   * Deletes the user account by calling backend DELETE /account,
   * then signs out and resets local session stores.
   */
  async deleteAccount(apiClient: ApiClient): Promise<{ success: boolean; message: string }> {
    // 1. Call server account deletion endpoint
    const res = await apiClient.deleteAccount();

    // 2. Sign out from Supabase auth
    await this.signOut();

    // 3. Clear local session store
    useSessionStore.getState().clear();

    return res;
  }

  /**
   * Migrates local P2 progress to the server on first remote launch.
   * The server re-scores nothing and grants archive unlocks only, never XP.
   */
  async migrateLocalProgress(apiClient: ApiClient): Promise<{
    success: boolean;
    unlockedCaseIds: string[];
    message: string;
  }> {
    const results = useSessionStore.getState().results;
    const solvedCaseIds: string[] = [];
    const localResults: Array<{ caseId: string; completedAt: string }> = [];

    for (const [sessionId, outcome] of Object.entries(results)) {
      const session = useSessionStore.getState().getSession(sessionId);
      if (session && outcome) {
        if (!solvedCaseIds.includes(session.caseId)) {
          solvedCaseIds.push(session.caseId);
        }
        localResults.push({
          caseId: session.caseId,
          completedAt: session.submittedAt ?? session.startedAt,
        });
      }
    }

    const res = await apiClient.migrateLocal({
      solvedCaseIds,
      localResults,
    });

    return res;
  }
}

export const defaultAuthService = new AuthService();
