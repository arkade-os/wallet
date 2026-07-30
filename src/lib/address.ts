import { hex } from '@scure/base'
import { isValidInvoice } from './bolt11'
import { ArkAddress, DefaultVtxo, toXOnlySignerHex } from '@arkade-os/sdk'
import { AspInfo } from '../providers/asp'

export const decodeArkAddress = (addr: string) => {
  const decoded = ArkAddress.decode(addr)
  return {
    serverPubKey: hex.encode(decoded.serverPubKey),
    vtxoTaprootKey: hex.encode(decoded.vtxoTaprootKey),
  }
}

export const getDefaultAddress = (pubKey: string, aspInfo: AspInfo) => {
  try {
    const xOnlyPubKey = toXOnlySignerHex(pubKey)
    const xOnlySignerPubKey = toXOnlySignerHex(aspInfo.signerPubkey)
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
    if (!data.startsWith('http://') && !data.startsWith('https://')) return false
    // Check if the URL has a 'lightning' query parameter
    const url = new URL(data)
    return url.searchParams.has('lightning')
  } catch {
    return false
  }
}

export const isEmailAddress = (data: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
  return emailRegex.test(data)
}
