import { HDKey } from '@scure/bip32'
import { hex } from '@scure/base'
import { Vtxo } from './types'

const DERIVATION_PATH = "m/44/1237/0'"

export const deriveKeyFromSeed = (seed: Uint8Array): Uint8Array => {
  const masterNode = HDKey.fromMasterSeed(seed)
  const key = masterNode.derive(DERIVATION_PATH).deriveChild(0).deriveChild(0)
  return key.privateKey!
}

export const getPrivateKeyFromSeed = (seed: Uint8Array): string => {
  return hex.encode(deriveKeyFromSeed(seed))
}

export const calcNextRollover = (vtxos: Vtxo[]): number => {
  return vtxos.length
    ? vtxos.reduce((acc: number, cur) => {
        if (!cur.virtualStatus.batchExpiry) return acc
        const unixtimestamp = Math.floor(cur.virtualStatus.batchExpiry / 1000)
        return unixtimestamp < acc || acc === 0 ? unixtimestamp : acc
      }, 0)
    : 0
}

export const vtxosExpiringSoon = (nextRollOver: number): boolean => {
  if (!nextRollOver) return false
  const now = Math.floor(new Date().getTime() / 1000)
  const threshold = 60 * 60 * 24 // one day in seconds
  return now + threshold > nextRollOver
}
