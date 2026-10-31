import { vi } from 'vitest';
import React from 'react';
import { View } from 'react-native';

// React 19 test environment setup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Ensure renderer.create mounts synchronously in React 19
vi.mock('react-test-renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-test-renderer')>();
  const customCreate = (...args: Parameters<typeof actual.create>) => {
    let instance: ReturnType<typeof actual.create>;
    actual.act(() => {
      instance = actual.create(...args);
    });
    return instance!;
  };
  return {
    ...actual,
    default: {
      ...(actual as { default?: object }).default,
      create: customCreate,
    },
    create: customCreate,
  };
});

// Vitest setup for React Native Web in Node environment
if (typeof document === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: () => ({
      setAttribute: () => {},
      style: {},
      focus: () => {},
      blur: () => {},
    }),
    activeElement: null,
  };
}

if (typeof window === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { origin: 'https://thelastlie.game' },
  };
}

vi.mock('@shopify/react-native-skia', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Canvas: ({ children, style }: { children?: React.ReactNode; style?: any }) =>
      React.createElement(View, { testID: 'mock-skia-canvas', style }, children),
    Line: (props: unknown) =>
      React.createElement(View, { testID: 'mock-skia-line', ...(props as Record<string, unknown>) }),
    vec: (x: number, y: number) => ({ x, y }),
  };
});

vi.mock('expo-notifications', () => {
  return {
    getPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
    requestPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
    getExpoPushTokenAsync: vi.fn().mockResolvedValue({ data: 'ExponentPushToken[mock-test-token]' }),
    scheduleNotificationAsync: vi.fn().mockResolvedValue('mock-notification-id-123'),
    cancelAllScheduledNotificationsAsync: vi.fn().mockResolvedValue(undefined),
    getAllScheduledNotificationsAsync: vi.fn().mockResolvedValue([]),
    setNotificationHandler: vi.fn(),
    SchedulableTriggerInputTypes: {
      DAILY: 'daily',
    },
  };
});
