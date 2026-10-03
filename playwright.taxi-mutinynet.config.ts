import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'

process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'

const local = process.env.TAXI_LIVE_LOCAL === '1'
const port = Number(process.env.TAXI_LIVE_WALLET_PORT || 3114)
const baseURL = local ? `http://127.0.0.1:${port}` : process.env.TAXI_LIVE_WALLET_URL
const artifacts = resolve('test-results/taxi-mutinynet')

export default defineConfig({
  testDir: './src/test/taxi-mutinynet',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 1_200_000,
  expect: { timeout: 60_000 },
  outputDir: resolve(artifacts, 'browser'),
  reporter: [['list'], ['json', { outputFile: resolve(artifacts, 'results.json') }]],
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL,
    headless: true,
    permissions: ['clipboard-read', 'clipboard-write'],
    locale: 'en-US',
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    actionTimeout: 30_000,
  },
  webServer: local
    ? {
        command: `pnpm build:worker && pnpm exec vite --host 127.0.0.1 --port ${port} --strictPort`,
        url: baseURL!,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          NODE_ENV: 'development',
          VITE_ARK_SERVER: 'https://mutinynet.arkade.sh',
          VITE_ESPLORA_URL: 'https://mutinynet.com/api',
          VITE_TAXI_URL: 'https://taxi.mutinynet.arkade.sh',
          VITE_EMULATOR_PUBKEY: '03f823b9b2febc81f4af967e77aed2f541cbd3397c6d8f5a72e32eb7b471af889a',
          VITE_DELEGATE_ENABLED: 'true',
          VITE_DELEGATOR_URL: 'https://delegator.mutinynet.arkade.sh',
        },
      }
    : undefined,
})
