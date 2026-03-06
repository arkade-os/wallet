import { AssetDetails } from '@arkade-os/sdk'

export function isValidAssetId(id: string) {
  return /^[0-9a-fA-F]{68}$/.test(id)
}

export function unitsToCents(units: number, assetMeta: AssetDetails): number {
  const decimals = assetMeta.metadata?.decimals ?? 0
  return Math.round(units * 10 ** decimals)
}

export function centsToUnits(cents: number, assetMeta: AssetDetails): number {
  const decimals = assetMeta.metadata?.decimals ?? 0
  return Number((cents / 10 ** decimals).toFixed(decimals))
}
