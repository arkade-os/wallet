import { getConfig } from './runtime-config'

export const arknoteHRP = 'arknote'
export const defaultFee = 0
export const testDomains = ['dev.arkade.money', 'next.arkade.money', 'pages.dev', 'localhost']
export const devServer = 'http://localhost:7070'
export const testServer = 'https://bitcoin-beta-v8.arkade.sh'
export const mainServer = 'https://bitcoin-beta-v8.arkade.sh'
export const defaultPassword = 'noah'
export const minSatsToNudge = 10_000

// Use runtime config with fallback to build-time env var
export const maxPercentage = () => {
  const value = getConfig('MAX_PERCENTAGE', 'VITE_MAX_PERCENTAGE', 10)
  return typeof value === 'string' ? parseInt(value, 10) : value
}

export const defaultArkServer = () => {
  // Check runtime config first, then build-time env var
  const runtimeServer = getConfig('ARK_SERVER', 'VITE_ARK_SERVER')
  if (runtimeServer) return runtimeServer

  for (const domain of testDomains) {
    if (window.location.hostname.includes(domain)) {
      return window.location.hostname.includes('localhost') ? devServer : testServer
    }
  }
  return mainServer
}
