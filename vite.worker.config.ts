import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/wallet-service-worker.ts'),
      formats: ['es'],
      fileName: 'wallet-service-worker',
    },
    outDir: 'public',
    emptyOutDir: false,
    rollupOptions: {
      external: ['fs'],
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    include: ['@arklabs/wallet-sdk'],
  },
});
