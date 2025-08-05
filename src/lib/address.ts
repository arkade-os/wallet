import { bech32m, hex } from '@scure/base'
import { decode } from 'light-bolt11-decoder'

export const decodeArkAddress = (addr: string) => {
  const decoded = bech32m.decodeUnsafe(addr, 300)
  if (!decoded) throw 'Error'
  const buf = bech32m.fromWords(decoded.words)
  return {
    aspKey: hex.encode(buf.slice(0, 32)),
    usrKey: hex.encode(buf.slice(32)),
  }
}

export const isArkAddress = (data: string): boolean => {
  return /^t*ark1/.test(data)
}

export const isBTCAddress = (data: string): boolean => {
  return data.startsWith('bc1') || data.startsWith('tb1') || data.startsWith('bcrt1')
}

export const isLightningInvoice = (data: string): boolean => {
  try {
    decode(data)
    return true
  } catch {
    return false
  }
}

export const isURLWithLightningQueryString = (data: string): boolean => {
  try {
    if (!data.startsWith('http://') && !data.startsWith('https://')) return false
    // Check if the URL has a 'lightning' query parameter
    const url = new URL(data)
    return url.searchParams.has('lightning')
  } catch (e) {
    return false
  }
}
