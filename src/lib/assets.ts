export function isValidAssetId(id: string) {
  return /^[0-9a-fA-F]{68}$/.test(id)
}

export function unitsToCents(units: bigint, decimals = 8): bigint {
  return units * BigInt(10 ** decimals)
}

export function centsToUnits(cents: bigint, decimals = 8): bigint {
  return cents / BigInt(10 ** decimals)
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

export const prettyAssetAmount = (amount: bigint, decimals: number): string => {
  if (decimals === 0) return prettyAssetNumber(amount, 0)
  return prettyAssetNumber(centsToUnits(amount, decimals), decimals)
}
