import { defineConfig, devices } from '@playwright/test'
import { loadNativeEnv } from './scripts/taxi-native-env.mjs'

const env = loadNativeEnv()
Object.assign(process.env, env)
const baseURL = env.TAXI_NATIVE_WALLET_URL ?? 'http://127.0.0.1:3002'

export default defineConfig({
  testDir: './src/test/e2e/taxi',
  testMatch: 'taxi.test.ts',
  timeout: 240_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
    ignoreHTTPSErrors: true,
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
    contextOptions: { reducedMotion: 'reduce' },
  },
  webServer: {
    command: 'node scripts/taxi-native-web-server.mjs',
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1920, height: 1080 } },
    },
  ],
})
