import { Config, Wallet } from '../lib/types'
import { vtxosRepository } from './db'
import { stringifyWithBigInt, parseWithBigInt } from './json'

// clear localStorage but persist config
export async function clearStorage(): Promise<void> {
  const config = readConfigFromStorage()
  localStorage.clear()
  await vtxosRepository.deleteAll()
  await vtxosRepository.close()
  if (config) saveConfigToStorage(config)
}

export const getStorageItem = <T>(key: string, fallback: T, parser: (val: string) => T): T => {
  try {
    const item = localStorage.getItem(key)
    return item !== null ? parser(item) : fallback
  } catch (e) {
    return fallback
  }
}

const setStorageItem = (key: string, value: string): void => {
  localStorage.setItem(key, value)
}

export const saveConfigToStorage = (config: Config): void => {
  setStorageItem('config', stringifyWithBigInt(config))
}

export const readConfigFromStorage = (): Config | undefined => {
  return getStorageItem('config', undefined, (val) => parseWithBigInt(val))
}

export const saveWalletToStorage = (wallet: Wallet): void => {
  setStorageItem('wallet', stringifyWithBigInt(wallet))
}

export const readWalletFromStorage = (): Wallet | undefined => {
  return getStorageItem('wallet', undefined, (val) => parseWithBigInt(val))
}
