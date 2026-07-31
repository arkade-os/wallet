import { DeviceRuntimeAdapter } from '../runtime/types'
import { browserDevice } from '../runtime/device'

/**
 * Injectable seam for device capabilities (clipboard, share, haptics,
 * external links, QR scanning).
 *
 * `src/lib/{clipboard,haptics,share,explorers}.ts` route through the adapter
 * returned by `getDeviceRuntime()`, so their call sites stay unchanged across
 * runtimes. The active app shell injects its adapter once at boot via
 * `setDeviceRuntime(runtime.device)`. The default is the browser adapter, so
 * the PWA, unit tests, and any code running before a shell mounts keep the
 * original behavior.
 */
let current: DeviceRuntimeAdapter = browserDevice

export const setDeviceRuntime = (device: DeviceRuntimeAdapter): void => {
  current = device
}

export const getDeviceRuntime = (): DeviceRuntimeAdapter => current

/**
 * Opens a URL outside the wallet: a new tab on the PWA, the system browser on
 * native. Fire-and-forget so it can replace `window.open(...)` call sites
 * directly; failures are swallowed exactly as a blocked `window.open` would be.
 */
export const openExternal = (url: string): void => {
  current.openExternal(url).catch(() => {})
}

/** Hands a generated file to the user (browser download / native share sheet). */
export const exportFile = (file: { name: string; mimeType: string; content: string }): Promise<void> =>
  current.exportFile(file)

/** Matches the native system bars to the app appearance; no-op on the web. */
export const setSystemBarsStyle = (appearance: 'light' | 'dark'): void => {
  current.setSystemBarsStyle?.(appearance).catch(() => {})
}

/**
 * Restarts the app.
 *
 * Every `window.location.reload()` in the app routes through here. On the web
 * it is exactly that. On native it reloads `capacitor://localhost`, which does
 * work, but going through one helper means the native restart strategy can
 * change in one place rather than in eight call sites — and makes the reload
 * points greppable (see CAPACITOR.plan.md § Settings Parity Inventory item 6).
 */
export const reloadApp = (): void => {
  window.location.reload()
}
