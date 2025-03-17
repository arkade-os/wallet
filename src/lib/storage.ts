import { Config, Wallet } from '../lib/types'

export const clearStorage = () => {
  return localStorage.clear()
}

export const getStorageItem = <T>(key: string, fallback: T, parser: (val: string) => T): T => {
  try {
    const item = localStorage.getItem(key)
    return item !== null ? parser(item) : fallback
  } catch (e) {
    return fallback
  }
}

export const setStorageItem = (key: string, value: string): void => {
  localStorage.setItem(key, value)
}

export const removeStorageItem = (key: string): void => {
  localStorage.removeItem(key)
}

export const saveConfigToStorage = (config: Config): void => {
  setStorageItem('config', JSON.stringify(config))
}

export const readConfigFromStorage = (): Config | undefined => {
  return getStorageItem('config', undefined, (val) => JSON.parse(val))
}

export const saveWalletToStorage = (wallet: Wallet): void => {
  setStorageItem('wallet', JSON.stringify(wallet))
}

export const readWalletFromStorage = (): Wallet | undefined => {
  return getStorageItem('wallet', undefined, (val) => JSON.parse(val))
}
