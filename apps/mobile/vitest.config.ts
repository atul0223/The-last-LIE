import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native-view-shot': path.resolve(__dirname, 'tests/mocks/viewShot.tsx'),
    },
  },
});
