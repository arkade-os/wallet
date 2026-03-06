export function isValidAssetId(id: string) {
  return /^[0-9a-fA-F]{68}$/.test(id)
}

export function unitsToCents(units: number, decimals?: number): number {
  decimals = decimals ?? 8
  return Math.round(units * 10 ** decimals)
}

export function centsToUnits(cents: number, decimals?: number): number {
  decimals = decimals ?? 8
  return Number((cents / 10 ** decimals).toFixed(decimals))
}

export const truncatedAssetId = (id: string): string => {
  if (!id || id.length < 24) return ''
  return `${id.slice(0, 12)}...${id.slice(-12)}`
}
