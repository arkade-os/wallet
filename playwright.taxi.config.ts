import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'

const port = Number(process.env.TAXI_E2E_WALLET_PORT || 3102)
const baseURL = `http://127.0.0.1:${port}`
const artifacts = resolve(process.env.TAXI_E2E_WALLET_ARTIFACTS || 'test-results/taxi-live')

for (const name of [
  'TAXI_E2E_ARKD_URL',
  'ARKADE_ESPLORA_URL',
  'TAXI_E2E_BASE_URL',
  'TAXI_E2E_ADMIN_URL',
  'VITE_EMULATOR_PUBKEY',
]) {
  if (!process.env[name]) throw new Error(`${name} is required by the local Taxi regtest harness`)
}

export default defineConfig({
  testDir: './src/test/taxi-live',
  testMatch: '**/*.e2e.ts',
  timeout: 600_000,
  expect: { timeout: 60_000 },
  workers: 1,
  retries: 0,
  forbidOnly: true,
  outputDir: resolve(artifacts, 'browser'),
  reporter: [['list'], ['json', { outputFile: resolve(artifacts, 'wallet-results.json') }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    headless: true,
    permissions: ['clipboard-read', 'clipboard-write'],
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
  },
  webServer: {
    command: `pnpm build:worker && pnpm exec vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_ARK_SERVER: process.env.TAXI_E2E_ARKD_URL!,
      VITE_ESPLORA_URL: process.env.ARKADE_ESPLORA_URL!,
      VITE_TAXI_URL: process.env.TAXI_E2E_BASE_URL!,
      VITE_EMULATOR_PUBKEY: process.env.VITE_EMULATOR_PUBKEY!,
      VITE_DELEGATE_ENABLED: 'false',
    },
  },
})
