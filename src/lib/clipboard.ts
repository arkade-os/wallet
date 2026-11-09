import { consoleError } from './logs'
import { isNativeHost } from './nativeBridge'
import { invokeWalletHost } from './nativePlatform'

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (isNativeHost()) {
    try {
      await invokeWalletHost('clipboard_write', { text })
      return true
    } catch {
      return false
    }
  }
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      consoleError(err, 'error writing to clipboard')
    }
  }
  return false
}

export const pasteFromClipboard = async (): Promise<string> => {
  if (isNativeHost()) {
    try {
      return await invokeWalletHost<string>('clipboard_read')
    } catch {
      return ''
    }
  }
  if (navigator.clipboard) {
    try {
      return await navigator.clipboard.readText()
    } catch (err) {
      consoleError(err, 'error pasting from clipboard')
    }
  }
  return ''
}

export const queryPastePermission = async (): Promise<PermissionState> => {
  if (isNativeHost()) return 'granted'
  try {
    // Chrome and Edge will handle this perfectly
    return (await navigator.permissions.query({ name: 'clipboard-read' as PermissionName })).state
  } catch (err) {
    // Safari and Firefox land here because 'clipboard-read' is unsupported in query()
    consoleError(err, 'error querying clipboard-read permission')
    // we assume 'prompt' status and proceed directly
    return 'prompt'
  }
}
