/**
 * qr-scanner reports every start failure as 'Camera not found.', so a camera the
 * user blocked is indistinguishable from a missing one unless we ask the permission.
 */
export const queryCameraPermission = async (): Promise<PermissionState> => {
  try {
    // Chromium browsers and Safari answer this
    return (await navigator.permissions.query({ name: 'camera' as PermissionName })).state
  } catch {
    // Firefox lands here because 'camera' is unsupported in query(), which is
    // routine and not worth logging: we assume 'prompt' and say the less of the two
    return 'prompt'
  }
}

export const cameraErrorText = (permission: PermissionState): string =>
  permission === 'denied'
    ? 'Camera access is blocked. Allow it for this site in your browser settings, then try again.'
    : 'Camera not available'
