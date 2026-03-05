export function isValidAssetId(id: string) {
  return /^[0-9a-fA-F]{68}$/.test(id)
}
