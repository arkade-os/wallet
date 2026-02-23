import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import eslint from 'vite-plugin-eslint'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    eslint({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/test/**/*.ts', 'src/test/**/*.tsx'],
      cache: false,
    }),
    basicSsl(),
  ],
  server: {
    port: 3002,
    host: true,
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
