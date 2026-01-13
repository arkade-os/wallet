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

  // In Capacitor native apps, always use production server
  // capacitor://localhost is not a real localhost
  if (window.location.protocol === 'capacitor:') {
    return mainServer
  }

  for (const domain of testDomains) {
    if (window.location.hostname.includes(domain)) {
      return window.location.hostname.includes('localhost') ? devServer : testServer
    }
  }
  return mainServer
}
