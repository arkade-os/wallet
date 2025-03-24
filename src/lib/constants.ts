export const arknoteHRP = 'arknote'
export const defaultFee = 0
export const testDomain = 'dev.arkade.money'
export const testServer = 'https://master.mutinynet.arklabs.to'
export const mainServer = 'https://mutinynet.arkade.sh'

export const defaultArkServer = () => {
  return window.location.hostname === testDomain ? testServer : mainServer
}
