import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import eslint from 'vite-plugin-eslint'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    eslint({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      cache: false,
    }),
  ],
  server: {
    port: 3002,
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
  resolve: {
    alias: {
      // Ensure Vite resolves the local package correctly
      '@arkade-os/boltz-swap': '/Users/bordalix/WIP/Vulpem/arkade-os/boltz-swap/dist',
    },
  },
  optimizeDeps: {
    include: ['@arkade-os/boltz-swap'], // Force Vite to pre-bundle the package
  },
})
