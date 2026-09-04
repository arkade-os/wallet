import { hex } from '@scure/base'
import { isValidInvoice } from './bolt11'
import { ArkAddress, DefaultVtxo, isBtcAddress, toXOnlySignerHex } from '@arkade-os/sdk'
import { l1ScriptForAddress } from '@arkade-os/swap'
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

/**
 * The SDK's predicate — so the form classifies as `btcTarget` does — AND
 * decodable on one of the three L1s. The decode is the strictness the predicate
 * deliberately lacks (it is format-only, because a rail's `match()` runs before
 * anything is known), and the form can afford one round of real parsing rather
 * than failing at the moment of signing.
 */
export const isBTCAddress = (data: string): boolean =>
  isBtcAddress(data) &&
  (['bitcoin', 'testnet', 'regtest'] as const).some((network) => {
    try {
      l1ScriptForAddress(data, network)
      return true
    } catch {
      return false
    }
  })

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
