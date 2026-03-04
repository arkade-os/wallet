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

/**
 * Convert a compressed secp256k1 public key (33-byte, 02/03 prefix) or an already
 * x-only key into a 32-byte x-only Uint8Array.
 */
export const toXOnlyBytes = (pubkey: Uint8Array): Uint8Array => {
  if (pubkey.length === 33 && (pubkey[0] === 0x02 || pubkey[0] === 0x03)) {
    return pubkey.slice(1)
  }
  return pubkey
}
