import { isValidAssetId } from './assets'

export function normalizeAssetId(value: string): string {
  return value.trim().toLowerCase()
}

export function trackedAssetIds(ids: readonly string[]): string[] {
  return [
    ...new Set(
      ids
        .filter((id) => typeof id === 'string')
        .map(normalizeAssetId)
        .filter(isValidAssetId),
    ),
  ]
}

export function assetVisibleOnHome(
  assetId: string,
  held: boolean,
  verified: boolean,
  overrides?: Record<string, boolean>,
): boolean {
  return verified && (overrides?.[normalizeAssetId(assetId)] ?? held)
}

export function registryAssetMatches(
  query: string,
  assetId: string,
  metadata?: { name?: string; ticker?: string },
): boolean {
  const needle = normalizeAssetId(query)
  if (isValidAssetId(needle)) return needle === assetId
  return !needle || [metadata?.name, metadata?.ticker].some((text) => text?.toLowerCase().includes(needle))
}
