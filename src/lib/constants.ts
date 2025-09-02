export const arknoteHRP = 'arknote'
export const defaultFee = 0
export const testDomains = ['dev.arkade.money', 'next.arkade.money', 'pages.dev', 'localhost']
export const devServer = 'http://localhost:7070'
export const testServer = 'https://mutinynet.arkade.sh'
export const mainServer = 'https://mutinynet.arkade.sh'

export const defaultArkServer = () => {
  if (import.meta.env.VITE_ARK_SERVER) return import.meta.env.VITE_ARK_SERVER
  for (const domain of testDomains) {
    if (window.location.hostname.includes(domain)) {
      if (window.location.hostname.includes('localhost')) {
        return devServer
      }
      return testServer
    }
  }
  return mainServer
}

export const BoltzUrl = (): string | undefined => {
  return import.meta.env.VITE_BOLTZ_URL;
}
