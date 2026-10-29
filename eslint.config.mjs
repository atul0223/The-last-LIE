import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.expo/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['packages/case-engine/**/*.{ts,tsx}', '**/packages/case-engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Math.random is forbidden in packages/case-engine. Engine must be deterministic; pass RNG in.',
        },
        {
          object: 'Date',
          property: 'now',
          message:
            'Date.now is forbidden in packages/case-engine. Engine must be deterministic; pass time in.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message:
            'new Date() without arguments is forbidden in packages/case-engine. Pass time in.',
        },
      ],
    },
  },
);
