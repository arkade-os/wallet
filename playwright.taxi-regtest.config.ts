import { defineConfig, devices } from '@playwright/test'

const walletPort = Number(process.env.TAXI_REGTEST_WALLET_PORT ?? '3002')
if (!Number.isInteger(walletPort) || walletPort < 1 || walletPort > 65535)
  throw new Error('Invalid TAXI_REGTEST_WALLET_PORT')

export default defineConfig({
  testDir: './src/test/e2e/taxi',
  timeout: 240_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${walletPort}`,
    headless: true,
    ignoreHTTPSErrors: true,
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: `pnpm start --port ${walletPort} --strictPort`,
    port: walletPort,
    reuseExistingServer: false,
    env: {
      VITE_ARK_SERVER: process.env.TAXI_REGTEST_ARKD_URL ?? 'http://localhost:7070',
      VITE_TAXI_URL: process.env.TAXI_REGTEST_URL ?? 'http://localhost:7400',
      VITE_ESPLORA_URL: process.env.TAXI_REGTEST_ESPLORA_URL ?? 'http://localhost:3000/api',
      VITE_DELEGATE_ENABLED: 'false',
    },
  },
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } },
    { name: 'Google Chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
})
