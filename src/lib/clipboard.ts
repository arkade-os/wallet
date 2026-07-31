import { getDeviceRuntime } from './device'

/**
 * Clipboard access, routed through the active runtime's device adapter:
 * `navigator.clipboard` on the PWA, `@capacitor/clipboard` on native (see
 * `src/runtime/device.ts`). Permission handling and error swallowing live in
 * the adapters because they differ per platform — the browser adapter keeps
 * the original `clipboard-read` permission query, native needs none.
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  await getDeviceRuntime().copyToClipboard(text)
}

export const pasteFromClipboard = async (): Promise<string> => {
  return getDeviceRuntime().pasteFromClipboard()
}
