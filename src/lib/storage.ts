import { Config, Wallet } from '../lib/types'

export const clearStorage = () => {
  return localStorage.clear()
}

export const saveConfigToStorage = (config: Config): void => {
  localStorage.setItem('config', JSON.stringify(config))
}

export const readConfigFromStorage = (): Config | undefined => {
  const config = localStorage.getItem('config')
  return config ? JSON.parse(config) : undefined
}

export const saveWalletToStorage = (wallet: Wallet): void => {
  localStorage.setItem('wallet', JSON.stringify(wallet))
}

export const readWalletFromStorage = (): Wallet | undefined => {
  const data = localStorage.getItem('wallet')
  if (!data) return undefined
  const wallet = JSON.parse(data)
  return wallet
}
