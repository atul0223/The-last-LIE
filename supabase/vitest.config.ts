import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@lastlie/api-contract': path.resolve(__dirname, '../packages/api-contract/src/index.ts'),
      '@lastlie/case-engine': path.resolve(__dirname, '../packages/case-engine/src/index.ts'),
    },
  },
  test: {
    name: 'backend',
    include: ['supabase/tests/**/*.test.ts'],
    environment: 'node',
  },
});
