import { hex } from '@scure/base'
import { isValidInvoice } from './bolt11'
import { ArkAddress } from '@arkade-os/sdk'

export const decodeArkAddress = (addr: string) => {
  const decoded = ArkAddress.decode(addr)
  return {
    serverPubKey: hex.encode(decoded.serverPubKey),
    vtxoTaprootKey: hex.encode(decoded.vtxoTaprootKey),
  }
}

export const isArkAddress = (data: string): boolean => {
  try {
    decodeArkAddress(data) // will throw if not valid
  } catch {
    return false
  }
  return true
}

export const isBTCAddress = (data: string): boolean => {
  const segwit = new RegExp('^(bc1|tb1|bcrt1)[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{39,87}$')
  const legacy = new RegExp('^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$')
  return segwit.test(data) || legacy.test(data)
}

export const isLightningInvoice = (data: string): boolean => {
  return isValidInvoice(data)
}

export const isURLWithLightningQueryString = (data: string): boolean => {
  try {
    if (!data.startsWith('http://') && !data.startsWith('https://')) return false
    // Check if the URL has a 'lightning' query parameter
    const url = new URL(data)
    return url.searchParams.has('lightning')
  } catch {
    return false
  }
}

export const isEmailAddress = (data: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(data)
}
