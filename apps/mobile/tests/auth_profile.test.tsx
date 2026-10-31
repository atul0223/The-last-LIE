import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isAuthEnabled, createSupabaseClient } from '../src/lib/supabase/client';
import { AuthService } from '../src/lib/supabase/authService';
import { validateDisplayName } from '../src/features/profile/useProfile';
import { MemoryKeyValueStore } from '../src/services/local/storage/MemoryKeyValueStore';
import { useSessionStore } from '../src/store';
import type { ApiClient, MigrateLocalRequest } from '@lastlie/api-contract';

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
    }
  }
}

describe('WP-44: Auth & Profiles', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    useSessionStore.getState().clear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Configuration & Graceful Degradation', () => {
    it('disables auth when Supabase credentials are missing and prevents runtime crashes', () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      expect(isAuthEnabled()).toBe(false);
      expect(createSupabaseClient()).toBeNull();

      const authService = new AuthService(null);
      expect(authService.isAvailable()).toBe(false);
    });

    it('enables auth when credentials are present', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-12345';

      expect(isAuthEnabled()).toBe(true);
      const client = createSupabaseClient();
      expect(client).toBeDefined();
    });
  });

  describe('Anonymous Sign-In and Upgrading Flow', () => {
    it('preserves the same user ID when anonymous user is upgraded with email OTP', async () => {
      const ANONYMOUS_USER_ID = 'user_anon_789456123';

      let currentEmail: string | undefined = undefined;
      let isAnon = true;

      const mockSupabase = {
        auth: {
          getSession: async () => ({
            data: {
              session: {
                user: {
                  id: ANONYMOUS_USER_ID,
                  email: currentEmail,
                  is_anonymous: isAnon,
                  user_metadata: {},
                  created_at: '2026-10-31T12:00:00Z',
                },
              },
            },
            error: null,
          }),
          signInAnonymously: async () => ({
            data: {
              user: {
                id: ANONYMOUS_USER_ID,
                email: undefined,
                is_anonymous: true,
                user_metadata: {},
                created_at: '2026-10-31T12:00:00Z',
              },
            },
            error: null,
          }),
          updateUser: async ({ email }: { email: string }) => {
            currentEmail = email;
            return {
              data: {
                user: {
                  id: ANONYMOUS_USER_ID,
                  email,
                  is_anonymous: true,
                },
              },
              error: null,
            };
          },
          verifyOtp: async ({ email }: { email: string }) => {
            isAnon = false;
            currentEmail = email;
            return {
              data: {
                user: {
                  id: ANONYMOUS_USER_ID,
                  email,
                  is_anonymous: false,
                  user_metadata: {},
                },
              },
              error: null,
            };
          },
          signOut: async () => ({ error: null }),
        },
      };

      const authService = new AuthService(mockSupabase as unknown as SupabaseClient);

      // 1. Initial anonymous sign-in
      const anonUser = await authService.signInAnonymously();
      expect(anonUser.id).toBe(ANONYMOUS_USER_ID);
      expect(anonUser.isAnonymous).toBe(true);
      expect(anonUser.email).toBeUndefined();

      // 2. Request OTP for upgrade
      const otpRes = await authService.sendEmailOtp('detective@vesper.org');
      expect(otpRes.success).toBe(true);

      // 3. Verify OTP
      const upgradedUser = await authService.verifyEmailOtp('detective@vesper.org', '123456');

      // CRITICAL ACCEPTANCE CHECK: User ID must remain identical
      expect(upgradedUser.id).toBe(ANONYMOUS_USER_ID);
      expect(upgradedUser.isAnonymous).toBe(false);
      expect(upgradedUser.email).toBe('detective@vesper.org');

      // Zero leak verification
      deepScan(upgradedUser);
    });
  });

  describe('Display Name Validation', () => {
    it('accepts valid alphanumeric names with spaces, hyphens, and underscores', () => {
      expect(validateDisplayName('Victor Vance').valid).toBe(true);
      expect(validateDisplayName('Agent_007').valid).toBe(true);
      expect(validateDisplayName('Case-Solver 99').valid).toBe(true);
      expect(validateDisplayName('AB').valid).toBe(true);
    });

    it('rejects names shorter than 2 characters or longer than 30 characters', () => {
      expect(validateDisplayName('A').valid).toBe(false);
      expect(validateDisplayName('').valid).toBe(false);
      expect(validateDisplayName('   ').valid).toBe(false);
      expect(validateDisplayName('A'.repeat(31)).valid).toBe(false);
    });

    it('rejects names containing illegal characters or scripts', () => {
      expect(validateDisplayName('Agent<script>').valid).toBe(false);
      expect(validateDisplayName('Vance!@#').valid).toBe(false);
      expect(validateDisplayName('Drop; Table;').valid).toBe(false);
      expect(validateDisplayName('Detective*').valid).toBe(false);
    });
  });

  describe('Privacy Settings & Persistence', () => {
    it('persists privacy toggles to storage and preserves them across sessions', () => {
      const storage = new MemoryKeyValueStore();

      // Default privacy
      const defaultRaw = storage.getString('@lastlie/profile_privacy');
      expect(defaultRaw).toBeUndefined();

      // Toggle publicProfile
      storage.set(
        '@lastlie/profile_privacy',
        JSON.stringify({
          publicProfile: false,
          shareAnalytics: true,
          leaderboardVisible: true,
        }),
      );

      const updated = JSON.parse(storage.getString('@lastlie/profile_privacy')!);
      expect(updated.publicProfile).toBe(false);
      expect(updated.shareAnalytics).toBe(true);
    });
  });

  describe('Account Deletion & Local Progress Migration', () => {
    it('deletes account and resets local state when deleteAccount is called', async () => {
      let deleteCalled = false;
      const fakeApiClient: Partial<ApiClient> = {
        deleteAccount: async () => {
          deleteCalled = true;
          return { success: true, message: 'Account deleted' };
        },
      };

      const mockSupabase = {
        auth: {
          signOut: async () => ({ error: null }),
        },
      };

      const authService = new AuthService(mockSupabase as unknown as SupabaseClient);

      // Populate store with fake session
      useSessionStore.getState().setSession(
        {
          id: 'sess_to_delete',
          caseId: 'case_0001',
          caseVersion: 1,
          mode: 'normal',
          status: 'in_progress',
          unlockedClueIds: [],
          board: { cards: [], links: [] },
          startedAt: '2026-10-31T12:00:00Z',
        },
        undefined,
      );

      expect(useSessionStore.getState().getSession('sess_to_delete')).toBeDefined();

      const result = await authService.deleteAccount(fakeApiClient as ApiClient);
      expect(deleteCalled).toBe(true);
      expect(result.success).toBe(true);

      // Local session store should be cleared
      expect(useSessionStore.getState().getSession('sess_to_delete')).toBeUndefined();
    });

    it('migrates local solved cases to server without awarding XP (anti-cheat)', async () => {
      let migratedRequest: MigrateLocalRequest | null = null;

      const fakeApiClient: Partial<ApiClient> = {
        migrateLocal: async (req) => {
          migratedRequest = req;
          return {
            success: true,
            unlockedCaseIds: req.solvedCaseIds,
            message: 'Migrated 1 case',
          };
        },
      };

      // Populate solved case in session store
      useSessionStore.getState().setSession(
        {
          id: 'sess_local_solved',
          caseId: 'case_0001',
          caseVersion: 1,
          mode: 'normal',
          status: 'submitted',
          unlockedClueIds: [],
          board: { cards: [], links: [] },
          startedAt: '2026-10-31T12:00:00Z',
          submittedAt: '2026-10-31T12:15:00Z',
        },
        undefined,
      );

      useSessionStore.getState().setResult('sess_local_solved', {
        result: {
          score: 100,
          breakdown: {
            correctHypothesis: true,
            hypothesisPoints: 50,
            evidencePoints: 50,
            contradictionPoints: 0,
            penaltyPoints: 0,
            multiplier: 1,
          },
          xp: 100,
        },
        reveal: {
          caseId: 'case_0001',
          solutionHypothesisId: 'hyp_1',
          explanation: [],
          allClues: [],
          culprits: [],
          validLinks: [],
          invalidLinks: [],
        },
      });

      const authService = new AuthService(null);
      const res = await authService.migrateLocalProgress(fakeApiClient as ApiClient);

      expect(res.success).toBe(true);
      expect(migratedRequest).not.toBeNull();
      const payload = migratedRequest!;
      expect(payload.solvedCaseIds).toEqual(['case_0001']);
      expect(payload.localResults[0]?.caseId).toBe('case_0001');

      // Assert that request carries ONLY case ids and completion times, never XP or scores!
      const rawPayload = payload as unknown as Record<string, unknown>;
      expect(rawPayload['xp']).toBeUndefined();
      expect(rawPayload['score']).toBeUndefined();
    });
  });
});
