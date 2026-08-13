import { consoleError } from './logs'

/**
 * qr-scanner reports every start failure as 'Camera not found.', so a camera the
 * user blocked is indistinguishable from a missing one unless we ask the permission.
 */
export const queryCameraPermission = async (): Promise<PermissionState> => {
  try {
    // Chromium browsers and Safari answer this
    return (await navigator.permissions.query({ name: 'camera' as PermissionName })).state
  } catch (err) {
    // Firefox lands here because 'camera' is unsupported in query()
    consoleError(err, 'error querying camera permission')
    // we assume 'prompt' status, we only know the camera did not start
    return 'prompt'
  }
}

export const cameraErrorText = (permission: PermissionState): string =>
  permission === 'denied'
    ? 'Camera access is blocked. Allow it for this site in your browser settings, then try again.'
    : 'Camera not available'
