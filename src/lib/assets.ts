const MAX_DECIMALS = 8 // Arbitrary value to allow at least 1 sat/asset

export function isValidAssetId(id: string) {
  return /^[0-9a-fA-F]{68}$/.test(id)
}

export const isValidDecimals = (d: number): boolean => Number.isInteger(d) && d >= 0 && d <= MAX_DECIMALS

export function txtValueToCents(str: string, decimals: number): bigint {
  const [integer, fraction = ''] = str.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  return BigInt(integer + paddedFraction) // string + string
}

export function centsToTxtValue(cents: bigint, decimals = 8): string {
  if (!isValidDecimals(decimals)) return cents.toString()
  return (cents / BigInt(10) ** BigInt(decimals)).toString()
}

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

export const prettyAssetAmount = (amount: bigint, decimals: number, tidy = false): string => {
  const realDecimals = isValidDecimals(decimals) ? decimals : 0

  console.log({ amount, decimals, realDecimals })
  if (!tidy) return prettyAssetNumber(centsToUnits(amount, realDecimals), realDecimals)

  const million = BigInt(10 ** 6)
  const thousand = BigInt(10 ** 3)
  const units = centsToUnits(amount, realDecimals)
  const absoluteUnits = units < BigInt(0) ? -units : units

  if (absoluteUnits >= million) {
    return `${prettyAssetNumber(units / million, 2)}M`
  } else if (absoluteUnits >= thousand) {
    return `${prettyAssetNumber(units / thousand, 2)}K`
  } else if (absoluteUnits >= BigInt(1)) {
    return `${prettyAssetNumber(units, 2)}`
  } else {
    return `${prettyAssetNumber(amount, realDecimals)}`
  }
}
