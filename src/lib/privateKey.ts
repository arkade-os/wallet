import { getPublicKey, nip19 } from 'nostr-tools'
import { hex } from '@scure/base'

export const invalidPrivateKey = (key: string): string => {
  if (key.length === 0) return ''
  if (key.length !== 64) return 'Invalid length: private key must be 64 characters'
  if (!/^[0-9A-Fa-f]+$/.test(key)) return 'Unable to validate private key format: must be hexadecimal'
  return ''
}

export const invalidNpub = (npub: string): string => {
  if (!npub) return 'Please enter a npub'
  if (!/^npub/.test(npub)) return 'Invalid prefix: must start with npub'
  if (npub.length !== 63) return 'Invalid length: npub must be 63 characters'
  try {
    nip19.decode(npub)
  } catch {
    return 'Unable to validate npub format'
  }
  return ''
}

export const nsecToSeed = (nsec: string): string => {
  const { type, data } = nip19.decode(nsec)
  if (type !== 'nsec') throw 'Invalid nsec format'
  return hex.encode(data)
}

export const seedToNsec = (seed: string | Uint8Array): string => {
  const sk = typeof seed === 'string' ? hex.decode(seed) : seed
  return nip19.nsecEncode(sk)
}

export const seedToNpub = (seed: string | Uint8Array): string => {
  const sk = typeof seed === 'string' ? hex.decode(seed) : seed
  return nip19.npubEncode(getPublicKey(sk))
}
