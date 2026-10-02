import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.MUTINYNET_SMOKE_PORT || 3103)
const baseURL = `http://127.0.0.1:${port}`

// Live mutinynet, read-only: a throwaway unfunded wallet, and every Taxi answer that could move money stubbed.
export default defineConfig({
  testDir: './src/test/mutinynet',
  testMatch: '**/*.e2e.ts',
  timeout: 300_000,
  expect: { timeout: 30_000 },
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: 'list',
  outputDir: 'test-results/mutinynet',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    headless: true,
    locale: 'en-US',
    permissions: ['clipboard-read', 'clipboard-write'],
    contextOptions: { reducedMotion: 'reduce' },
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
  },
  webServer: {
    command: `pnpm build:worker && pnpm exec vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { VITE_ARK_SERVER: 'https://mutinynet.arkade.sh', VITE_DELEGATE_ENABLED: 'false' },
  },
})
