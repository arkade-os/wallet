/**
 * Build-time runtime selection.
 *
 * The top-level app shell is chosen at build time, not by user-agent or
 * runtime guessing (see CAPACITOR.plan.md § Architecture). The Capacitor
 * Vite build (`vite.capacitor.config.ts`) defines
 * `import.meta.env.VITE_RUNTIME = 'native-capacitor'`; the PWA build leaves it
 * unset and defaults to `web-pwa`.
 *
 * These helpers are pure (no React, no side effects) so they can be imported
 * from low-level lib modules without creating provider/context coupling.
 */

export type RuntimeKind = 'web-pwa' | 'native-capacitor'

export const RUNTIME_KIND: RuntimeKind =
  import.meta.env.VITE_RUNTIME === 'native-capacitor' ? 'native-capacitor' : 'web-pwa'

/** True when running inside the native Capacitor shell (iOS/Android). */
export const isNativeRuntime = (): boolean => RUNTIME_KIND === 'native-capacitor'

/** True when running as the hosted browser/PWA. */
export const isPwaRuntime = (): boolean => RUNTIME_KIND === 'web-pwa'
