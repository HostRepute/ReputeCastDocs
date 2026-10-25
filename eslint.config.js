import js from '@eslint/js'
import astro from 'eslint-plugin-astro'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      'dist',
      '.astro',
      'src/data/openapi',
      'test-results',
      'playwright-report',
      '.lighthouseci',
      'tests/fixtures',
      '.shots-tmp',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  astro.configs['jsx-a11y-strict'],
  {
    languageOptions: { ecmaVersion: 2024, globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      // Scrollable table regions must be focusable for keyboard users (WCAG 2.1.1, axe scrollable-region-focusable).
      'astro/jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['tabpanel', 'region'] }],
    },
  },
)
