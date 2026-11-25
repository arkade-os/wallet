export function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, '0')
  }
  return out
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase()
  if (clean.length % 2 !== 0 || !/^[0-9a-f]*$/.test(clean)) {
    throw new Error('Invalid hex string')
  }
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export function xOnly(key: Uint8Array): Uint8Array {
  if (key.length === 32) return key
  if (key.length === 33 && (key[0] === 0x02 || key[0] === 0x03)) return key.subarray(1)
  throw new Error(`Expected 32-byte or 33-byte pubkey, got ${key.length} bytes`)
}
