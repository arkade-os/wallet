import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // .arkade-sdk-src is the temporary arkade-os/ts-sdk checkout produced by
    // scripts/prepare-arkade-sdk.js; don't run the SDK's own test suite here.
    exclude: ['**/e2e/**', '**/node_modules/**', '**/.arkade-sdk-src/**', '**/vendor/**'],
  },
})
