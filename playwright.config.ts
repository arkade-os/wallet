import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/test/e2e',
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // 5 retries × 2 projects turns a handful of broken specs into a 45-minute
  // job-timeout with no signal. Keep 2 retries for regtest flakiness, and bail
  // after a few genuine failures so CI reports WHICH specs failed in minutes.
  retries: process.env.CI ? 2 : 0,
  maxFailures: process.env.CI ? 6 : undefined,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3002',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
    permissions: ['clipboard-read', 'clipboard-write'],
    actionTimeout: 30000,
    navigationTimeout: 30000,
    contextOptions: { reducedMotion: 'reduce' },
  },
  webServer: {
    command:
      'VITE_NOSTR_RELAY_URL=ws://localhost:10547 VITE_DELEGATE_ENABLED=false VITE_LNURL_SERVER_URL=http://localhost:9090 pnpm start',
    port: 3002,
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1920, height: 1080 } },
    },
  ],
})
