import { hex } from '@scure/base'
import { isValidInvoice } from './bolt11'
import { ArkAddress, DefaultVtxo } from '@arkade-os/sdk'
import { AspInfo } from '../providers/asp'
import { isValidLnUrl } from './lnurl'

export const decodeArkAddress = (addr: string) => {
  const decoded = ArkAddress.decode(addr)
  return {
    serverPubKey: hex.encode(decoded.serverPubKey),
    vtxoTaprootKey: hex.encode(decoded.vtxoTaprootKey),
  }
}

export const getDefaultAddress = (pubKey: string, aspInfo: AspInfo) => {
  const toXonly = (key: string) => {
    const length = key.length
    const xOnly = length > 64 ? key.slice(length - 64, length) : key
    if (xOnly.length !== 64) throw new Error('Invalid public key length')
    return xOnly
  }
  try {
    const xOnlyPubKey = toXonly(pubKey)
    const xOnlySignerPubKey = toXonly(aspInfo.signerPubkey)
    const hrp = aspInfo.network === 'bitcoin' ? 'ark' : 'tark'

    return new DefaultVtxo.Script({
      pubKey: hex.decode(xOnlyPubKey),
      serverPubKey: hex.decode(xOnlySignerPubKey),
      csvTimelock: { value: aspInfo.unilateralExitDelay, type: 'seconds' },
    })
      .address(hrp, hex.decode(xOnlySignerPubKey))
      .encode()
  } catch (err) {
    console.error('Error encoding default Arkade address:', err)
    throw err
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
  const segwit = new RegExp('^(bc1|tb1|bcrt1)[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{39,87}$', 'i')
  const legacy = new RegExp('^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$', 'i')
  return segwit.test(data) || legacy.test(data)
}

export const isLightningInvoice = (data: string): boolean => {
  return isValidInvoice(data)
}

export const isURLWithLightningQueryString = (data: string): boolean => {
  try {
    if (!data.match(/^https?:\/\//i)) return false
    const url = new URL(data)
    const val = url.searchParams.get('lightning') ?? ''
    return isValidInvoice(val) || isValidLnUrl(val)
  } catch {
    return false
  }
}

export const isEmailAddress = (data: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
  return emailRegex.test(data)
}
