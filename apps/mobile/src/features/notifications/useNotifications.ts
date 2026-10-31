import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSessionStore } from '../../store';
import { getGameService } from '../../services';
import type { RemoteGameService } from '../../services/remote';
import { getSupabaseClient } from '../../lib/supabase/client';
import {
  loadNotificationSettings,
  enablePushNotifications,
  disablePushNotifications,
  markPromptDismissed,
  shouldPromptForPush,
  DEFAULT_NOTIFICATION_SETTINGS,
} from './service';
import type { NotificationSettings } from './types';

export interface UseNotificationsReturn {
  settings: NotificationSettings;
  isEnabled: boolean;
  shouldShowPrompt: boolean;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  dismiss: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [isReady, setIsReady] = useState(false);

  const sessions = useSessionStore((state) => state.sessions);
  const results = useSessionStore((state) => state.results);

  // Count solved cases
  const solvedCasesCount = useMemo(() => {
    const solved = new Set<string>();
    for (const s of Object.values(sessions)) {
      if (s.status === 'submitted' || results[s.id]) {
        solved.add(s.caseId);
      }
    }
    return solved.size;
  }, [sessions, results]);

  const refresh = useCallback(async () => {
    const current = await loadNotificationSettings();
    setSettings(current);
    setIsReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const shouldShowPrompt = useMemo(() => {
    if (!isReady) return false;
    return shouldPromptForPush(solvedCasesCount, settings);
  }, [isReady, solvedCasesCount, settings]);

  const enable = useCallback(async (): Promise<boolean> => {
    let apiClient = null;
    try {
      const service = getGameService() as RemoteGameService;
      if (typeof service.getApiClient === 'function') {
        apiClient = service.getApiClient();
      }
    } catch {
      // Offline mode
    }

    const supabase = getSupabaseClient();
    const result = await enablePushNotifications({
      apiClient,
      supabase,
      hour: settings.dailyReminderTime.hour,
      minute: settings.dailyReminderTime.minute,
    });

    if (result.success) {
      const updated = await loadNotificationSettings();
      setSettings(updated);
      return true;
    }
    return false;
  }, [settings.dailyReminderTime]);

  const disable = useCallback(async (): Promise<void> => {
    let apiClient = null;
    try {
      const service = getGameService() as RemoteGameService;
      if (typeof service.getApiClient === 'function') {
        apiClient = service.getApiClient();
      }
    } catch {
      // Offline mode
    }

    const supabase = getSupabaseClient();
    await disablePushNotifications({ apiClient, supabase });
    const updated = await loadNotificationSettings();
    setSettings(updated);
  }, []);

  const dismiss = useCallback(async (): Promise<void> => {
    await markPromptDismissed();
    const updated = await loadNotificationSettings();
    setSettings(updated);
  }, []);

  return {
    settings,
    isEnabled: settings.enabled,
    shouldShowPrompt,
    enable,
    disable,
    dismiss,
    refresh,
  };
}
