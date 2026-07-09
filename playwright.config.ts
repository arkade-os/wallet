import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/test/e2e',
  // passkey onboarding + the seed→passkey migration flow add real wall-clock to
  // the heavier specs; 60s left no room for the final wallet boot. Give every
  // spec more headroom (heavy swap/restore specs raise it further below).
  timeout: 90000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // master runs 5 retries to ride out regtest flakiness (swap/restore/boot
  // timing). The old 45-minute job-timeout came from WebAuthn ceremonies
  // HANGING × retries, not from retries themselves — that hang is fixed (virtual
  // authenticator + fast-fail stub), so restore generous retries and keep
  // maxFailures as the belt-and-suspenders so a truly broken spec still reports
  // in minutes rather than burning the whole job.
  retries: process.env.CI ? 5 : 0,
  maxFailures: process.env.CI ? 10 : undefined,
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
