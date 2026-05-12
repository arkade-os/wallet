const MAX_DECIMALS = 18

export function isValidAssetId(id: string) {
  return /^[0-9a-fA-F]{68}$/.test(id)
}

export const isValidDecimals = (d: number): boolean => Number.isInteger(d) && d >= 0 && d <= MAX_DECIMALS

export function unitsToCents(units: bigint, decimals = 8): bigint {
  if (!isValidDecimals(decimals)) return units
  return units * BigInt(10) ** BigInt(decimals)
}

export function centsToUnits(cents: bigint, decimals = 8): bigint {
  if (!isValidDecimals(decimals)) return cents
  return cents / BigInt(10) ** BigInt(decimals)
}

export const truncatedAssetId = (id: string): string => {
  if (!id || id.length < 24) return ''
  return `${id.slice(0, 12)}...${id.slice(-12)}`
}

const hideDots = (value: bigint): string => {
  const str = value.toString()
  const length = str.length * 2 > 6 ? str.length * 2 : 6
  return '·'.repeat(length)
}

export const prettyAssetAmountHide = (value: bigint, suffix: string): string => {
  if (!value) return ''
  const dots = hideDots(value)
  return suffix ? `${dots} ${suffix}` : dots
}

export const prettyAssetNumber = (
  num?: bigint,
  maximumFractionDigits = 8,
  useGrouping = true,
  minimumFractionDigits?: number,
): string => {
  if (num === undefined || num === null) return '0'
  return new Intl.NumberFormat('en', {
    style: 'decimal',
    maximumFractionDigits,
    minimumFractionDigits,
    useGrouping,
  }).format(num)
}

export const prettyAssetAmount = (amount: bigint, decimals: number, useGrouping = true): string => {
  if (!isValidDecimals(decimals) || decimals === 0) return prettyAssetNumber(amount, 0, useGrouping)

  const divisor = BigInt(10) ** BigInt(decimals)
  const negative = amount < BigInt(0)
  const abs = negative ? -amount : amount
  const whole = abs / divisor
  const frac = abs % divisor
  const sign = negative ? '-' : ''

  if (frac === BigInt(0)) return `${sign}${prettyAssetNumber(whole, 0, useGrouping)}`

  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${sign}${prettyAssetNumber(whole, 0, useGrouping)}.${fracStr}`
}
