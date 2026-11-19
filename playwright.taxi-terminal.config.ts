import { defineConfig } from '@playwright/test'
import base from './playwright.taxi-regtest.config'

const server = base.webServer
if (!server || Array.isArray(server)) throw new Error('Native wallet server must be configured')

export default defineConfig({
  ...base,
  testMatch: 'terminal.test.ts',
  timeout: 360_000,
  webServer: { ...server, reuseExistingServer: true },
  outputDir: 'test-results/taxi-terminal',
  reporter: [['list'], ['json', { outputFile: 'test-results/native-terminal-results.json' }]],
})
