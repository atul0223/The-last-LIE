import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ApiClient } from '@lastlie/api-contract';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getStorage } from '../../services/local/storage/factory';
import {
  type NotificationSettings,
  DAILY_DISPATCH_TEMPLATES,
} from './types';

export const STORAGE_KEY_NOTIFICATIONS = 'lastlie_notification_settings_v1';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  dailyReminderTime: {
    hour: 9,
    minute: 0,
  },
  hasPromptedForPush: false,
};

// Configure foreground notification behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Handled in environments where Notifications is mocked or unsupported
}

/**
 * Pure helper to determine whether the opt-in permission prompt should be shown.
 * Rule: Ask only after the player finishes their 2nd case, never on first launch.
 */
export function shouldPromptForPush(
  solvedCasesCount: number,
  settings: NotificationSettings,
): boolean {
  if (solvedCasesCount < 2) {
    return false;
  }
  if (settings.enabled || settings.hasPromptedForPush) {
    return false;
  }
  return true;
}

/**
 * Loads notification settings from local storage.
 */
export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const storage = getStorage();
    const raw = storage.getString(STORAGE_KEY_NOTIFICATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.enabled === 'boolean') {
        return {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...parsed,
        };
      }
    }
  } catch {
    // Fallback
  }
  return { ...DEFAULT_NOTIFICATION_SETTINGS };
}

/**
 * Saves notification settings to local storage.
 */
export async function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<void> {
  try {
    const storage = getStorage();
    storage.set(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(settings));
  } catch {
    // Fallback
  }
}

/**
 * Requests push notification permissions and obtains the Expo push token.
 */
export async function requestPushPermissionsAndToken(): Promise<{
  granted: boolean;
  token?: string;
}> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return { granted: false };
    }

    let token: string | undefined;
    try {
      const pushTokenData = await Notifications.getExpoPushTokenAsync();
      token = pushTokenData.data;
    } catch {
      // In simulator, web, or when Expo project ID is unset, token may not resolve
      token = 'ExponentPushToken[local-simulated-token]';
    }

    return { granted: true, token };
  } catch {
    return { granted: false };
  }
}

/**
 * Schedules a daily reminder notification at the user's local time window.
 * Uses spoiler-free bureau templates.
 */
export async function scheduleDailyReminder(
  hour = 9,
  minute = 0,
): Promise<string | null> {
  try {
    // First clear existing scheduled notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    const template = DAILY_DISPATCH_TEMPLATES[0]!;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: template.title,
        body: template.body,
        data: { route: '/(tabs)/index' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    return id;
  } catch {
    return null;
  }
}

/**
 * Cancels all scheduled local notifications.
 */
export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Graceful fallback
  }
}

/**
 * Syncs the push token with backend server (API client and/or Supabase RLS table).
 */
export async function syncPushTokenWithBackend(
  token: string,
  apiClient?: ApiClient | null,
  supabase?: SupabaseClient | null,
): Promise<boolean> {
  let synced = false;
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  // 1. Sync with ApiClient route (POST /push/token) if available
  if (apiClient && typeof apiClient.registerPushToken === 'function') {
    try {
      const res = await apiClient.registerPushToken({
        token,
        platform,
      });
      if (res?.success) {
        synced = true;
      }
    } catch {
      // Continue to Supabase sync
    }
  }

  // 2. Sync directly with Supabase table public.push_tokens if user is authenticated
  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { error } = await supabase.from('push_tokens').upsert(
          {
            user_id: authData.user.id,
            token,
            platform,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id, token' },
        );
        if (!error) {
          synced = true;
        }
      }
    } catch {
      // Handled
    }
  }

  return synced;
}

/**
 * Enables push notifications and local daily reminder.
 */
export async function enablePushNotifications(
  options?: {
    apiClient?: ApiClient | null;
    supabase?: SupabaseClient | null;
    hour?: number;
    minute?: number;
  },
): Promise<{ success: boolean; token?: string }> {
  const { granted, token } = await requestPushPermissionsAndToken();
  if (!granted) {
    return { success: false };
  }

  const hour = options?.hour ?? 9;
  const minute = options?.minute ?? 0;

  await scheduleDailyReminder(hour, minute);

  if (token) {
    await syncPushTokenWithBackend(token, options?.apiClient, options?.supabase);
  }

  const newSettings: NotificationSettings = {
    enabled: true,
    dailyReminderTime: { hour, minute },
    hasPromptedForPush: true,
    expoPushToken: token,
    lastRegisteredAt: new Date().toISOString(),
  };

  await saveNotificationSettings(newSettings);
  return { success: true, token };
}

/**
 * Disables push notifications and cancels all scheduled reminders (One-tap opt-out).
 */
export async function disablePushNotifications(
  options?: {
    apiClient?: ApiClient | null;
    supabase?: SupabaseClient | null;
  },
): Promise<void> {
  await cancelAllReminders();

  const current = await loadNotificationSettings();

  // If we have a token and Supabase authenticated user, delete from push_tokens
  if (current.expoPushToken && options?.supabase) {
    try {
      const { data: authData } = await options.supabase.auth.getUser();
      if (authData?.user) {
        await options.supabase
          .from('push_tokens')
          .delete()
          .match({ user_id: authData.user.id, token: current.expoPushToken });
      }
    } catch {
      // Ignored
    }
  }

  const newSettings: NotificationSettings = {
    ...current,
    enabled: false,
    expoPushToken: undefined,
  };

  await saveNotificationSettings(newSettings);
}

/**
 * Marks that the player has dismissed the permission prompt, so they are not asked again.
 */
export async function markPromptDismissed(): Promise<void> {
  const current = await loadNotificationSettings();
  const updated: NotificationSettings = {
    ...current,
    hasPromptedForPush: true,
  };
  await saveNotificationSettings(updated);
}
