import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/service-worker.ts'),
      formats: ['es'],
      fileName: 'service-worker',
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
  define: {
    'process.env': JSON.stringify(process.env),
  },
});