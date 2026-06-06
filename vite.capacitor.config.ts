import { mergeConfig } from 'vite'
import baseConfig from './vite.config'

// Capacitor build target. Mirrors the existing per-target config convention
// (see vite.worker.config.ts) and extends the PWA build with:
//  - VITE_RUNTIME=native-capacitor so src/index.tsx selects CapacitorAppShell
//    at build time (runtime detection stays diagnostic-only).
//  - a separate output dir consumed by capacitor.config.ts `webDir`, so the
//    hosted PWA build (dist/) stays byte-identical.
export default mergeConfig(baseConfig, {
  define: {
    'import.meta.env.VITE_RUNTIME': JSON.stringify('native-capacitor'),
  },
  build: {
    outDir: 'dist-capacitor',
  },
})
