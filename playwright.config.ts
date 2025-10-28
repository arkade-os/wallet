import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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
  },
  webServer: {
    command: 'pnpm start',
    port: 3002,
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    }
  ],
});
