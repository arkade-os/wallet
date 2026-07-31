import { WebHaptics } from 'web-haptics'
import { consoleError } from '../lib/logs'
import { DeviceRuntimeAdapter } from './types'

/**
 * Device-capability adapters (clipboard, paste, share, haptics, external
 * links, QR scanning).
 *
 * Both runtimes implement the same {@link DeviceRuntimeAdapter}; the active
 * shell injects its adapter into the seam in `src/lib/device.ts` at boot, so
 * the ~40 existing call sites in `src/lib/{clipboard,haptics,share,explorers}`
 * keep their current signatures (see CAPACITOR.plan.md § Settings Parity
 * Inventory items 1, 4, 5).
 *
 * The browser adapter is the default in the seam, so the PWA, unit tests, and
 * any code running before a shell mounts keep the original behavior.
 */

// --- Browser / PWA ----------------------------------------------------------

let webHaptics: WebHaptics | null = null

const getWebHaptics = (): WebHaptics | null => {
  if (webHaptics) return webHaptics
  if (typeof window === 'undefined') return null
  webHaptics = new WebHaptics()
  return webHaptics
}

export const browserDevice: DeviceRuntimeAdapter = {
  copyToClipboard: async (value) => {
    if (!navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(value)
    } catch (err) {
      consoleError(err, 'error writing to clipboard')
    }
  },

  pasteFromClipboard: async () => {
    if (!navigator.clipboard) return ''
    // Chrome and Edge answer this properly; Safari and Firefox throw because
    // 'clipboard-read' is unsupported in query(), so we assume 'prompt' and
    // let the read itself surface the decision.
    let state: PermissionState = 'prompt'
    try {
      state = (await navigator.permissions.query({ name: 'clipboard-read' as PermissionName })).state
    } catch (err) {
      consoleError(err, 'error querying clipboard-read permission')
    }
    if (state === 'denied') return ''
    try {
      return await navigator.clipboard.readText()
    } catch (err) {
      consoleError(err, 'error pasting from clipboard')
      return ''
    }
  },

  canShare: (data) => {
    if (!navigator.share || !navigator.canShare) return false
    return navigator.canShare(data)
  },

  share: async (data) => {
    await navigator.share(data)
  },

  haptic: async (kind) => {
    await getWebHaptics()?.trigger(kind)
  },

  openExternal: async (url) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  },
}

// --- Native / Capacitor -----------------------------------------------------

/**
 * Plugins are loaded through memoized dynamic imports so they stay out of the
 * PWA bundle's eager graph (this module is reachable from both shells) and so
 * each native chunk loads on first use rather than at boot.
 *
 * As in `secretStorage.ts`, we memoize the *module namespace* and dereference
 * the plugin proxy inline on each call: a Capacitor plugin proxy returns a
 * callable for any property, so letting one become a promise's resolution
 * value makes the Promise machinery probe `.then` and invoke a non-existent
 * native `then` method.
 */
let clipboardModule: Promise<typeof import('@capacitor/clipboard')> | undefined
const clipboardPlugin = () => (clipboardModule ??= import('@capacitor/clipboard'))

let hapticsModule: Promise<typeof import('@capacitor/haptics')> | undefined
const hapticsPlugin = () => (hapticsModule ??= import('@capacitor/haptics'))

let shareModule: Promise<typeof import('@capacitor/share')> | undefined
const sharePlugin = () => (shareModule ??= import('@capacitor/share'))

let browserModule: Promise<typeof import('@capacitor/browser')> | undefined
const browserPlugin = () => (browserModule ??= import('@capacitor/browser'))

let scannerModule: Promise<typeof import('@capacitor/barcode-scanner')> | undefined
const scannerPlugin = () => (scannerModule ??= import('@capacitor/barcode-scanner'))

export const nativeDevice: DeviceRuntimeAdapter = {
  /**
   * Native QR scan through the system barcode scanner (full-screen modal), in
   * place of the WebView `getUserMedia` scanner. Resolves to `undefined` when
   * the user cancels, which call sites treat as "no input".
   */
  scanQrCode: async () => {
    const { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } = await scannerPlugin()
    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
      scanInstructions: 'Point the camera at a QR code',
    })
    return result.ScanResult || undefined
  },

  copyToClipboard: async (value) => {
    try {
      await (await clipboardPlugin()).Clipboard.write({ string: value })
    } catch (err) {
      consoleError(err, 'error writing to clipboard')
    }
  },

  // No permission prompt on native: the OS clipboard is readable directly.
  pasteFromClipboard: async () => {
    try {
      const { value, type } = await (await clipboardPlugin()).Clipboard.read()
      return type === 'text/plain' ? value : ''
    } catch (err) {
      consoleError(err, 'error pasting from clipboard')
      return ''
    }
  },

  // The native share sheet is always available, so unlike the browser there is
  // nothing to feature-detect.
  canShare: () => true,

  share: async (data) => {
    await (
      await sharePlugin()
    ).Share.share({
      title: data.title,
      text: data.text,
      url: data.url,
      dialogTitle: data.title,
    })
  },

  haptic: async (kind) => {
    const { Haptics, ImpactStyle } = await hapticsPlugin()
    if (kind === 'selection') return Haptics.selectionStart().then(() => Haptics.selectionEnd())
    await Haptics.impact({ style: kind === 'light' ? ImpactStyle.Light : ImpactStyle.Medium })
  },

  /**
   * Opens outside the wallet WebView. `window.open`/`target=_blank` would
   * otherwise either navigate the app's own WebView away from the wallet or be
   * swallowed entirely.
   */
  openExternal: async (url) => {
    await (await browserPlugin()).Browser.open({ url })
  },
}
