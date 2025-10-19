import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import eslint from 'vite-plugin-eslint'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    eslint({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/test/**/*.ts', 'src/test/**/*.tsx'],
      cache: false,
    }),
  ],
  server: {
    port: 3003,
  },
  build: {
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: ['fs'],
    },
  },
  worker: {
    format: 'es',
  },
})
