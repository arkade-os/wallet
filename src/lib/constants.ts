import { Delegator } from './types'

export const arknoteHRP = 'arknote'
export const defaultFee = 0
export const testDomains = ['dev.arkade.money', 'next.arkade.money', 'pages.dev', 'localhost']
export const devServer = 'http://localhost:7070'
export const testServer = 'https://arkade.computer'
export const mainServer = 'https://arkade.computer'
export const defaultPassword = 'noah'
export const minSatsToNudge = 100_000
export const maxPercentage = import.meta.env.VITE_MAX_PERCENTAGE ?? 10
export const psaMessage = import.meta.env.VITE_PSA_MESSAGE ?? ''

export const defaultArkServer = () => {
  if (import.meta.env.VITE_ARK_SERVER) return import.meta.env.VITE_ARK_SERVER
  for (const domain of testDomains) {
    if (window.location.hostname.includes(domain)) {
      return window.location.hostname.includes('localhost') ? devServer : testServer
    }
  }
  return mainServer
}

export const defaultDelegator = (): Delegator => {
  const devServer = 'http://localhost:7004'
  const mainServer = 'https://delegator.arkade.computer'
  const getDefaultUrl = () => {
    if (import.meta.env.VITE_DELEGATOR_URL) return import.meta.env.VITE_DELEGATOR_URL
    for (const domain of testDomains) {
      if (window.location.hostname.includes(domain)) {
        return window.location.hostname.includes('localhost') ? devServer : mainServer
      }
    }
    return mainServer
  }
  return {
    name: 'Arkade Default',
    url: getDefaultUrl(),
  }
}
