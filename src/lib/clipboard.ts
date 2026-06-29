import { consoleError } from './logs'

export const copyToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard) {
    try {
      return await navigator.clipboard.writeText(text)
    } catch (err) {
      consoleError(err, 'error writing to clipboard')
    }
  }
}

export const pasteFromClipboard = async (): Promise<string> => {
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
