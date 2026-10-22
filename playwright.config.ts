import { defineConfig, devices } from '@playwright/test'

// End-to-end checks against the built site (`pnpm build` first): SEO head, accessibility, reflow and search.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: 'http://localhost:4321', trace: 'retain-on-failure' },
  webServer: { command: 'pnpm preview --port 4321', port: 4321, reuseExistingServer: false, timeout: 60_000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
