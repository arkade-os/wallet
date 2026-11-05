/**
 * Convert a compressed secp256k1 public key (33-byte, 02/03 prefix) or an already
 * x-only key into a 32-byte x-only hex string.
 */
export const toXOnlyHex = (pubkey: string): string => {
  if (!pubkey) return pubkey
  // strip optional 0x prefix
  const normalized = pubkey.startsWith('0x') ? pubkey.slice(2) : pubkey
  if (normalized.length === 66 && (normalized.startsWith('02') || normalized.startsWith('03'))) {
    return normalized.slice(2)
  }
  return normalized
}
