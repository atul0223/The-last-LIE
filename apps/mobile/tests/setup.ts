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
