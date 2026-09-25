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
    exclude: ['**/e2e/**', '**/node_modules/**'],
    // The 5 s default is what the slowest React-flow tests run against under
    // full-suite contention, not in isolation: the two in `swap.test.tsx` take
    // ~2.2 s and ~1.0 s alone and cross 5 s under load. Margin, not masking — a
    // genuinely hung test still fails here.
    testTimeout: 15_000,
  },
})
