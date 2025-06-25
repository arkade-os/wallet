const isServer = (): boolean => typeof window === 'undefined'

const isStandalone = () => navigator.standalone || window.matchMedia('(display-mode: standalone)').matches

export const pwaCanInstall = () => 'serviceWorker' in navigator && !isServer() && !isStandalone()

export const pwaIsInstalled = () => !isServer() && isStandalone()
