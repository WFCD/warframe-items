import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import jsonc from 'eslint-plugin-jsonc';
import yml from 'eslint-plugin-yml';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // Base configs for all files
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    extends: [
      stylistic.configs.customize({
        indent: 2, // number = spaces; never pass 'tab'
        quotes: 'single',
        semi: true,
        jsx: false,
        arrowParens: true,
        // Prettier trailingComma: 'es5' — no 'es5' string in @stylistic schema
        commaDangle: {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'never',
          enums: 'always-multiline',
          generics: 'always-multiline',
          tuples: 'always-multiline',
        },
        quoteProps: 'as-needed',
        blockSpacing: true,
        braceStyle: '1tbs',
      }),
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/max-len': [
        'error',
        {
          code: 120,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
          ignoreComments: true,
        },
      ],
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
      '@typescript-eslint/no-non-null-assertion': 'off',
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
  // JSON
  ...jsonc.configs['recommended-with-json'],
  {
    files: ['**/*.json'],
    rules: {
      'jsonc/indent': ['error', 2],
      'jsonc/quotes': ['error', 'double'],
      'jsonc/comma-dangle': ['error', 'never'],
      'jsonc/object-curly-spacing': ['error', 'always'],
      'jsonc/array-bracket-spacing': ['error', 'never'],
    },
  },
  // YAML
  ...yml.configs.recommended,
  ...yml.configs.standard,
  {
    files: ['**/*.{yml,yaml}'],
    rules: {
      'yml/indent': ['error', 2],
    },
  },
  // Ignore patterns
  {
    ignores: [
      'node_modules/',
      'data/json/**',
      'data/cache/**',
      'data/img/**',
      '.git/',
      'coverage/',
      '.nyc_output/',
      'package-lock.json',
      '*.config.js',
      '*.config.mjs',
      '.*.js',
      '.*.mjs',
    ],
  }
);
