import type { CapacitorConfig } from '@capacitor/cli'
import { KeyboardResize } from '@capacitor/keyboard'

const config: CapacitorConfig = {
  appId: 'money.arkade.app',
  appName: 'Arkade Wallet',
  // Built by `pnpm build:capacitor` (vite.capacitor.config.ts). Kept separate
  // from the PWA `dist/` output so the hosted build stays untouched.
  webDir: 'dist-capacitor',
  plugins: {
    Keyboard: {
      // Let the native view resize so `ButtonsOnBottom` and inputs stay above
      // the keyboard, rather than the web view scrolling under it.
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      // The launch theme covers the gap until the web view first paints;
      // hiding automatically avoids it lingering over an already-drawn app.
      launchAutoHide: true,
      launchShowDuration: 500,
      backgroundColor: '#101010',
      androidScaleType: 'CENTER_CROP',
    },
  },
}

export default config
