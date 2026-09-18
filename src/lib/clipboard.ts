import { consoleError } from './logs'

// Legacy copy path for in-app browsers and embedded webviews where the
// navigator.clipboard API is missing or rejects writes.
const copyViaExecCommand = (text: string): boolean => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)

  const selection = document.getSelection()
  const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  textarea.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch (err) {
    consoleError(err, 'error using legacy copy fallback')
  }

  if (previousRange) {
    selection?.removeAllRanges()
    selection?.addRange(previousRange)
  }
  document.body.removeChild(textarea)
  return ok
}

export const copyToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch (err) {
      consoleError(err, 'error writing to clipboard')
    }
  }
  if (!copyViaExecCommand(text)) {
    consoleError(new Error('execCommand("copy") was rejected'), 'error copying via legacy fallback')
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
