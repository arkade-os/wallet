import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'money.arkade.app',
  appName: 'Arkade Wallet',
  // Built by `pnpm build:capacitor` (vite.capacitor.config.ts). Kept separate
  // from the PWA `dist/` output so the hosted build stays untouched.
  webDir: 'dist-capacitor',
}

export default config
