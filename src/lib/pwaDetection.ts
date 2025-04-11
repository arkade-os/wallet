interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

export const isPWAInstalled = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

export const canInstallPWA = (): boolean => {
  return 'serviceWorker' in navigator && 'storage' in navigator && 'permissions' in navigator
}
