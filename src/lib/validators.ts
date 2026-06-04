import { MAX_DECIMALS } from './assets'

const onlyHasDigits = (amount: string | number | bigint): boolean => {
  if (!amount || amount === '') return true
  const regex = new RegExp(/^[0-9]+(\.[0-9]+)?$/)
  return regex.test(amount.toString())
}

const isSafeQuantity = (amount: string | number | bigint): boolean => {
  if (amount === undefined || amount === null) return true
  return amount.toString().length < 20
}

const isPositive = (amount: string | number | bigint): boolean => {
  if (amount === undefined || amount === null) return true
  try {
    return BigInt(amount) >= BigInt(0)
  } catch {
    return false
  }
}

export const isInvalidMintAmount = (amount: string | number | bigint): string | void => {
  if (!onlyHasDigits(amount)) return 'Invalid amount format'
  if (!isPositive(amount)) return 'Amount must be positive'
  if (!isSafeQuantity(amount)) return 'Amount too large'
}

export const isValidUrl = (url: string) => {
  if (!url) return true
  if (url.startsWith('localhost') || url.startsWith('http://localhost')) return true
  if (url.startsWith('127.0.0.1') || url.startsWith('http://127.0.0.1')) return true
  const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/
  return urlPattern.test(url)
}

export const isInvalidDecimals = (decimals: string | number): string | void => {
  const decimalsNumber = Number(decimals)
  if (isNaN(decimalsNumber)) return 'Decimals must be a number'
  if (decimalsNumber > MAX_DECIMALS) return `Decimals cannot exceed ${MAX_DECIMALS}`
  if (!Number.isInteger(decimalsNumber)) return 'Decimals must be an integer'
  if (decimalsNumber < 0) return 'Decimals must be positive'
}
