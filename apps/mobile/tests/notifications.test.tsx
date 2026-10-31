import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import renderer, { act } from 'react-test-renderer';
import * as Notifications from 'expo-notifications';
import type { ApiClient } from '@lastlie/api-contract';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  shouldPromptForPush,
  loadNotificationSettings,
  saveNotificationSettings,
  enablePushNotifications,
  disablePushNotifications,
  markPromptDismissed,
  syncPushTokenWithBackend,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '../src/features/notifications/service';
import {
  DAILY_DISPATCH_TEMPLATES,
  type NotificationSettings,
} from '../src/features/notifications/types';
import { PushPermissionPrompt } from '../src/features/notifications/PushPermissionPrompt';
import { ProfileFeature } from '../src/features/profile';

const FORBIDDEN_LEAK_KEYS = new Set([
  'truth',
  'claims',
  'culpritIds',
  'seed',
  'keyEvidence',
  'liars',
  'solutionHypothesisId',
]);

const FORBIDDEN_SPOILER_TERMS = [
  /culprit/i,
  /liar/i,
  /hyp_\w+/i,
  /clue_\w+/i,
  /maya lin is guilty/i,
  /arjun framed/i,
  /solution/i,
];

function deepScan(value: unknown, path = 'root'): void {
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

describe('WP-54: Push Notifications & Daily Reminders', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await saveNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
  });

  describe('Opt-In Gating Rules', () => {
    it('never prompts on first launch (0 solved cases)', () => {
      const prompt = shouldPromptForPush(0, DEFAULT_NOTIFICATION_SETTINGS);
      expect(prompt).toBe(false);
    });

    it('does not prompt after 1 solved case', () => {
      const prompt = shouldPromptForPush(1, DEFAULT_NOTIFICATION_SETTINGS);
      expect(prompt).toBe(false);
    });

    it('prompts strictly after player finishes their 2nd case', () => {
      const prompt = shouldPromptForPush(2, DEFAULT_NOTIFICATION_SETTINGS);
      expect(prompt).toBe(true);
    });

    it('does not prompt if already enabled or previously dismissed', () => {
      const enabledSettings: NotificationSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: true,
      };
      expect(shouldPromptForPush(3, enabledSettings)).toBe(false);

      const dismissedSettings: NotificationSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        hasPromptedForPush: true,
      };
      expect(shouldPromptForPush(3, dismissedSettings)).toBe(false);
    });
  });

  describe('Notification Service & Registration', () => {
    it('requests permissions, obtains token, and schedules 09:00 local reminder', async () => {
      vi.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({
        status: 'undetermined' as Notifications.PermissionStatus,
        granted: false,
        canAskAgain: true,
        expires: 'never',
      });
      vi.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({
        status: 'granted' as Notifications.PermissionStatus,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      const mockApiClient = {
        registerPushToken: vi.fn().mockResolvedValue({ success: true, registeredAt: '2026-10-31T09:00:00Z' }),
      } as unknown as ApiClient;

      const res = await enablePushNotifications({
        apiClient: mockApiClient,
        hour: 9,
        minute: 0,
      });

      expect(res.success).toBe(true);
      expect(res.token).toContain('ExponentPushToken');
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({
            hour: 9,
            minute: 0,
          }),
        }),
      );
      expect(mockApiClient.registerPushToken).toHaveBeenCalledWith(
        expect.objectContaining({
          token: res.token,
        }),
      );

      const saved = await loadNotificationSettings();
      expect(saved.enabled).toBe(true);
      expect(saved.hasPromptedForPush).toBe(true);
      expect(saved.expoPushToken).toBe(res.token);
    });

    it('syncs push token directly with Supabase RLS table when user is authenticated', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert });
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'usr_uuid_123' } } }),
        },
        from: mockFrom,
      } as unknown as SupabaseClient;

      const synced = await syncPushTokenWithBackend(
        'ExponentPushToken[unit-test]',
        null,
        mockSupabase,
      );

      expect(synced).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('push_tokens');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'usr_uuid_123',
          token: 'ExponentPushToken[unit-test]',
        }),
        expect.anything(),
      );
    });

    it('cancels all scheduled reminders and disables notifications on opt-out', async () => {
      // First enable
      await enablePushNotifications();
      let current = await loadNotificationSettings();
      expect(current.enabled).toBe(true);

      // Now opt out
      await disablePushNotifications();
      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();

      current = await loadNotificationSettings();
      expect(current.enabled).toBe(false);
      expect(current.expoPushToken).toBeUndefined();
    });

    it('marks prompt dismissed', async () => {
      await markPromptDismissed();
      const current = await loadNotificationSettings();
      expect(current.hasPromptedForPush).toBe(true);
      expect(current.enabled).toBe(false);
    });
  });

  describe('Spoiler-Free Verification', () => {
    it('verifies notification templates contain zero spoilers or solution leaks', () => {
      expect(DAILY_DISPATCH_TEMPLATES.length).toBeGreaterThanOrEqual(3);

      for (const template of DAILY_DISPATCH_TEMPLATES) {
        expect(template.title.length).toBeGreaterThan(0);
        expect(template.body.length).toBeGreaterThan(0);

        for (const pattern of FORBIDDEN_SPOILER_TERMS) {
          expect(template.title).not.toMatch(pattern);
          expect(template.body).not.toMatch(pattern);
        }
      }

      expect(() => deepScan(DAILY_DISPATCH_TEMPLATES)).not.toThrow();
    });
  });

  describe('PushPermissionPrompt Component', () => {
    it('renders modal and triggers onEnable when positive CTA is pressed', async () => {
      const onEnable = vi.fn().mockResolvedValue(true);
      const onDismiss = vi.fn().mockResolvedValue(undefined);

      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <PushPermissionPrompt onEnable={onEnable} onDismiss={onDismiss} />,
        );
      });

      const jsonStr = JSON.stringify(tree!.toJSON());
      expect(jsonStr).toContain('ENABLE DAILY MYSTERY DISPATCHES?');
      expect(jsonStr).toContain('OPT-IN ONLY');
      expect(jsonStr).toContain('Zero Spoilers');

      const enableBtn = tree!.root.findByProps({ testID: 'push.prompt.enable' });
      await act(async () => {
        enableBtn.props.onPress();
      });

      expect(onEnable).toHaveBeenCalled();
    });

    it('triggers onDismiss when negative CTA is pressed', async () => {
      const onEnable = vi.fn().mockResolvedValue(true);
      const onDismiss = vi.fn().mockResolvedValue(undefined);

      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <PushPermissionPrompt onEnable={onEnable} onDismiss={onDismiss} />,
        );
      });

      const dismissBtn = tree!.root.findByProps({ testID: 'push.prompt.dismiss' });
      await act(async () => {
        dismissBtn.props.onPress();
      });

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('ProfileFeature One-Tap Opt-Out', () => {
    it('renders notification toggle in Profile settings and toggles state', async () => {
      let tree: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(<ProfileFeature />);
      });

      const toggle = tree!.root.findByProps({
        testID: 'profile.notifications.toggle',
      });
      expect(toggle).toBeDefined();

      const jsonStr = JSON.stringify(tree!.toJSON());
      expect(jsonStr).toContain('Daily Dispatch Alerts');
    });
  });
});
