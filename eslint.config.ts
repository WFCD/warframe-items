import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  // Base configs for all files
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  // TypeScript strict rules only for .ts files
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  // Disable type checking for all JS files
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  // Test files get Mocha globals
  {
    files: ['test/**/*.mjs', 'test/**/*.spec.mjs', 'test/**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },
  // Index files - allow CommonJS patterns
  {
    files: ['index.js', 'index.mjs'],
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-delete-var': 'off', // Allow delete for dynamic properties
    },
  },
  // Ignore patterns
  {
    ignores: ['node_modules/', 'data/', '.git/', 'coverage/', '*.config.js', '*.config.mjs', '.*.js', '.*.mjs'],
  }
);
