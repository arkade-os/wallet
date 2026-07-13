import { mergeConfig } from 'vite'
import baseConfig from './vite.config'

// Network for the native build (CAPACITOR.plan.md § Phase 0 "Network / defaults"
// and Initial Engineering Tasks: derive defaultArkServer() from build config, not
// hostname). Beta/spike builds default to the mutinynet test network; a mainnet
// public build overrides via VITE_ARK_SERVER (+ VITE_BOLTZ_URL). Without this the
// native app falls through to the mainnet hostname default, where no Boltz URL is
// configured and the swap client never initializes.
const arkServer = process.env.VITE_ARK_SERVER ?? 'https://mutinynet.arkade.sh'
const boltzUrl = process.env.VITE_BOLTZ_URL

// Capacitor build target. Mirrors the existing per-target config convention
// (see vite.worker.config.ts) and extends the PWA build with:
//  - VITE_RUNTIME=native-capacitor so src/index.tsx selects CapacitorAppShell
//    at build time (runtime detection stays diagnostic-only).
//  - VITE_ARK_SERVER so defaultArkServer() pins the native app to a real network
//    (defaultArkServer reads VITE_ARK_SERVER first); mutinynet by default.
//  - a separate output dir consumed by capacitor.config.ts `webDir`, so the
//    hosted PWA build (dist/) stays byte-identical.
export default mergeConfig(baseConfig, {
  define: {
    'import.meta.env.VITE_RUNTIME': JSON.stringify('native-capacitor'),
    'import.meta.env.VITE_ARK_SERVER': JSON.stringify(arkServer),
    // mutinynet's Boltz URL is hardcoded in BASE_URLS; only needed when
    // overriding to a network (e.g. mainnet) whose BASE_URLS entry is env-driven.
    ...(boltzUrl ? { 'import.meta.env.VITE_BOLTZ_URL': JSON.stringify(boltzUrl) } : {}),
  },
  build: {
    outDir: 'dist-capacitor',
  },
})
