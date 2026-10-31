import { vi } from 'vitest';
import React from 'react';
import { View } from 'react-native';

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
