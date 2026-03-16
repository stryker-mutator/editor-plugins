import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import { importX } from 'eslint-plugin-import-x';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-deprecated': 'error',

      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',

      'import-x/newline-after-import': 'error',
      'import-x/default': 'off',
      'import-x/no-named-as-default-member': 'off',

      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',

      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],

      eqeqeq: 'error',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
  },
  {
    files: ['*.js', '*.config.{js,ts}', 'packages/*/*.{js,ts,mjs,mts,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['*.js', '*.config.{js,ts}', 'packages/*/*.{js,ts,mjs,mts,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // Test-specific rules
    files: [
      'packages/*/src/test/**/*.ts',
      'packages/*/src/**/*.test.ts',
      'packages/*/src/**/*.spec.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  globalIgnores([
    'node_modules',
    'packages/*/out',
    'packages/*/dist',
    'packages/*/.vscode-test',
    '.nx',
    '.stryker-tmp',
    'packages/*/reports',
    'test-results',
  ]),
);
