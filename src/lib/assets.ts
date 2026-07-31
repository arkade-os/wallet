import Decimal from 'decimal.js'

export const MAX_DECIMALS = 8 // Arbitrary value to allow at least 1 sat/asset

// discovered assets may carry up to 18 decimals (solver-discovery's cap);
// conversions must stay exact for them even though displays default to 8
const MAX_CONVERSION_DECIMALS = 18

export function isValidAssetId(id: string) {
  return /^[0-9a-fA-F]{68}$/.test(id)
}

export const isValidDecimals = (d: number): boolean => Number.isInteger(d) && d >= 0 && d <= MAX_DECIMALS

// garbage decimals (negative, fractional, NaN, beyond the cap) degrade to 0 so
// amounts pass through as integers instead of throwing mid-render
const conversionDecimals = (d: number): number =>
  Number.isInteger(d) && d >= 0 && d <= MAX_CONVERSION_DECIMALS ? d : 0

export function unitsToCents(units: string, decimals = MAX_DECIMALS): bigint {
  if (!units || units === '') return BigInt(0)
  const safeDecimals = conversionDecimals(decimals)
  const negative = units.startsWith('-')
  const [integer, fraction = ''] = (negative ? units.slice(1) : units).split('.')
  const digits = (integer || '0') + fraction.padEnd(safeDecimals, '0').slice(0, safeDecimals)
  return negative ? -BigInt(digits) : BigInt(digits)
}

export function centsToUnits(cents: bigint, decimals = MAX_DECIMALS): string {
  const safeDecimals = conversionDecimals(decimals)
  if (safeDecimals === 0) return cents.toString()
  const negative = cents < BigInt(0)
  const digits = (negative ? -cents : cents).toString().padStart(safeDecimals + 1, '0')
  const fraction = digits.slice(-safeDecimals).replace(/0+$/, '')
  return `${negative ? '-' : ''}${digits.slice(0, -safeDecimals)}${fraction ? `.${fraction}` : ''}`
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

export const prettyAssetNumber = (num?: string | number, maximumFractionDigits = MAX_DECIMALS): string => {
  if (num === undefined || num === null) return '0'
  if (typeof num === 'number') num = num.toString()
  if (/e/i.test(num)) num = new Decimal(num).toFixed()
  let [integer, fraction = ''] = num.split('.')
  integer = integer.replace(/[^0-9-]+/g, '') // remove non-digit and non-negative sign characters
  const negative = integer === '-0'
  const paddedFraction = fraction
    .padEnd(MAX_DECIMALS, '0') // fill with zeros to ensure consistent formatting
    .slice(0, maximumFractionDigits) // slice to the desired number of decimals
    .replace(/0+$/, '') // remove trailing zeros
    .replace(/\.$/, '') // if the number ends with a dot, remove it
  return `${negative ? '-' : ''}${BigInt(integer).toLocaleString()}${paddedFraction ? `.${paddedFraction}` : ''}`
}

export const prettyAssetAmount = (cents: bigint, decimals: number, tidy = false): string => {
  const realDecimals = conversionDecimals(decimals)

  if (!tidy) return prettyAssetNumber(centsToUnits(cents, realDecimals), realDecimals)

  const billion = 10 ** 9
  const million = 10 ** 6
  const thousand = 10 ** 3
  const trillion = 10 ** 12
  const tenthousand = 10 ** 4
  const strUnits = centsToUnits(cents, realDecimals)

  const safeToUseNumber = cents < BigInt(Number.MAX_SAFE_INTEGER) && cents > BigInt(Number.MIN_SAFE_INTEGER)

  if (safeToUseNumber) {
    const units = Number(centsToUnits(cents, realDecimals))
    const absoluteUnits = units < 0 ? -units : units
    if (absoluteUnits >= trillion) {
      return `${prettyAssetNumber(units / trillion, 0)}T`
    } else if (absoluteUnits >= billion) {
      return `${prettyAssetNumber(units / billion, 0)}B`
    } else if (absoluteUnits >= million) {
      return `${prettyAssetNumber(units / million, 0)}M`
    } else if (absoluteUnits >= tenthousand) {
      return `${prettyAssetNumber(units / thousand, 0)}K`
    } else {
      return `${prettyAssetNumber(units, realDecimals)}`
    }
  }

  // For very large numbers that exceed JavaScript's safe integer range, we fall back to bigint
  // Due to truncation in bigint division, we won't get decimal places, but this is a rare edge case
  // and still provides a readable format
  const units = BigInt(Math.trunc(Number(strUnits)))
  const absoluteUnits = units < 0 ? -units : units

  if (absoluteUnits >= trillion) {
    return `${prettyAssetNumber((units / BigInt(trillion)).toString(), 2)}T`
  } else if (absoluteUnits >= billion) {
    return `${prettyAssetNumber((units / BigInt(billion)).toString(), 2)}B`
  } else if (absoluteUnits >= million) {
    return `${prettyAssetNumber((units / BigInt(million)).toString(), 2)}M`
  } else if (absoluteUnits >= tenthousand) {
    return `${prettyAssetNumber((units / BigInt(thousand)).toString(), 2)}K`
  } else {
    return `${prettyAssetNumber(strUnits, 0)}`
  }
}
