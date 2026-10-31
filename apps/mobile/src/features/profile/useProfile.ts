import { useState, useCallback, useEffect } from 'react';
import type { ApiClient } from '@lastlie/api-contract';
import { useAuth } from '../auth/useAuth';
import { defaultAuthService } from '../../lib/supabase';
import { getStorage } from '../../services/local/storage/factory';
import type { KeyValueStore } from '../../services/local/storage/types';

export const PROFILE_PRIVACY_STORAGE_KEY = '@lastlie/profile_privacy';
export const DISPLAY_NAME_REGEX = /^[a-zA-Z0-9 _-]{2,30}$/;

export interface PrivacySettings {
  publicProfile: boolean;
  shareAnalytics: boolean;
  leaderboardVisible: boolean;
}

const DEFAULT_PRIVACY: PrivacySettings = {
  publicProfile: true,
  shareAnalytics: true,
  leaderboardVisible: true,
};

export interface UseProfileReturn {
  displayName: string;
  title: string;
  earnedTitles: string[];
  privacy: PrivacySettings;
  isAnonymous: boolean;
  email?: string;
  isSaving: boolean;
  validationError: string | null;
  statusMessage: string | null;
  setDisplayName: (name: string) => void;
  saveDisplayName: (name: string) => Promise<boolean>;
  selectTitle: (newTitle: string) => Promise<void>;
  togglePrivacy: (key: keyof PrivacySettings) => void;
  deleteAccount: (apiClient: ApiClient) => Promise<boolean>;
  migrateLocal: (apiClient: ApiClient) => Promise<string>;
}

export function validateDisplayName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Agent name must be at least 2 characters long.' };
  }
  if (trimmed.length > 30) {
    return { valid: false, error: 'Agent name cannot exceed 30 characters.' };
  }
  if (!DISPLAY_NAME_REGEX.test(trimmed)) {
    return { valid: false, error: 'Agent name may only contain letters, numbers, spaces, hyphens, and underscores.' };
  }
  return { valid: true };
}

export function useProfile(storageOverride?: KeyValueStore): UseProfileReturn {
  const { user, isAnonymous, signOut } = useAuth();
  const storage = storageOverride ?? getStorage();

  const [displayName, setDisplayName] = useState<string>(
    (user?.userMetadata?.displayName as string) || (user?.email ? user.email.split('@')[0]! : 'Agent Victor Vance'),
  );
  const [title, setTitle] = useState<string>(
    (user?.userMetadata?.title as string) || 'Trainee',
  );
  const [earnedTitles] = useState<string[]>([
    'Trainee',
    'Investigator',
    'Specialist',
    'Senior Detective',
    'Master Detective',
  ]);

  const [privacy, setPrivacy] = useState<PrivacySettings>(() => {
    try {
      const raw = storage.getString(PROFILE_PRIVACY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_PRIVACY;
    } catch {
      return DEFAULT_PRIVACY;
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.userMetadata?.displayName) {
      setDisplayName(user.userMetadata.displayName as string);
    }
    if (user?.userMetadata?.title) {
      setTitle(user.userMetadata.title as string);
    }
  }, [user]);

  const saveDisplayName = useCallback(
    async (nameToSave: string): Promise<boolean> => {
      const check = validateDisplayName(nameToSave);
      if (!check.valid) {
        setValidationError(check.error || 'Invalid name');
        return false;
      }

      setValidationError(null);
      setIsSaving(true);
      setStatusMessage(null);

      try {
        const trimmed = nameToSave.trim();
        setDisplayName(trimmed);
        if (defaultAuthService.isAvailable()) {
          await defaultAuthService.updateProfile({ displayName: trimmed });
        }
        setStatusMessage('Callsign updated in Bureau records.');
        return true;
      } catch (err: unknown) {
        setValidationError(err instanceof Error ? err.message : 'Failed to update name');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const selectTitle = useCallback(
    async (newTitle: string): Promise<void> => {
      setTitle(newTitle);
      if (defaultAuthService.isAvailable()) {
        try {
          await defaultAuthService.updateProfile({ title: newTitle });
        } catch {
          // Fallback to local state
        }
      }
    },
    [],
  );

  const togglePrivacy = useCallback(
    (key: keyof PrivacySettings) => {
      setPrivacy((prev) => {
        const updated = { ...prev, [key]: !prev[key] };
        try {
          storage.set(PROFILE_PRIVACY_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Storage non-fatal
        }
        return updated;
      });
    },
    [storage],
  );

  const deleteAccount = useCallback(
    async (apiClient: ApiClient): Promise<boolean> => {
      setIsSaving(true);
      try {
        await defaultAuthService.deleteAccount(apiClient);
        await signOut();
        return true;
      } catch (err: unknown) {
        setValidationError(err instanceof Error ? err.message : 'Account deletion failed');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [signOut],
  );

  const migrateLocal = useCallback(
    async (apiClient: ApiClient): Promise<string> => {
      setIsSaving(true);
      setStatusMessage(null);
      try {
        const res = await defaultAuthService.migrateLocalProgress(apiClient);
        const msg = `${res.message} (${res.unlockedCaseIds.length} archive cases unlocked).`;
        setStatusMessage(msg);
        return msg;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Local migration failed';
        setValidationError(msg);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  return {
    displayName,
    title,
    earnedTitles,
    privacy,
    isAnonymous,
    email: user?.email,
    isSaving,
    validationError,
    statusMessage,
    setDisplayName,
    saveDisplayName,
    selectTitle,
    togglePrivacy,
    deleteAccount,
    migrateLocal,
  };
}
