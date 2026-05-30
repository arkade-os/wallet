export function isValidAssetId(id: string) {
  return /^[0-9a-fA-F]{68}$/.test(id)
}

// Accepts `bigint` because SDK `Asset.amount` is bigint; we render in number-space.
export function unitsToCents(units: number | bigint, decimals?: number): number {
  decimals = decimals ?? 8
  return Math.round(Number(units) * 10 ** decimals)
}

export function centsToUnits(cents: number | bigint, decimals?: number): number {
  decimals = decimals ?? 8
  return Number((Number(cents) / 10 ** decimals).toFixed(decimals))
}

export const truncatedAssetId = (id: string): string => {
  if (!id || id.length < 24) return ''
  return `${id.slice(0, 12)}...${id.slice(-12)}`
}
