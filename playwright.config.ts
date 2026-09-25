import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/test/e2e',
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 5 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3002',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
    permissions: ['clipboard-read', 'clipboard-write'],
    // The e2e relay is reached as wss://localhost:10548 through a TLS proxy
    // with a self-signed cert, because a solver card's relays must be wss://
    // (see relay-tls.nginx.conf). Nothing here talks to anything but the local
    // regtest stack, so trusting its cert costs nothing.
    ignoreHTTPSErrors: true,
    actionTimeout: 30000,
    navigationTimeout: 30000,
    contextOptions: { reducedMotion: 'reduce' },
  },
  webServer: {
    // Nothing listens on the Taxi URL: receiverTaxi.test.ts serves it through page.route, and no
    // other spec opens the asset receive screen, the only place the wallet reads it.
    command:
      'VITE_NOSTR_RELAY_URL=ws://localhost:10547 VITE_DELEGATE_ENABLED=false VITE_TAXI_URL=http://localhost:7400 pnpm start',
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
