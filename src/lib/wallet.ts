import { HDKey } from '@scure/bip32'
import { hex } from '@scure/base'
import { IWallet } from '@arkade-os/sdk'

const DERIVATION_PATH = "m/44/1237/0'"

export const deriveKeyFromSeed = (seed: Uint8Array): Uint8Array => {
  const masterNode = HDKey.fromMasterSeed(seed)
  const key = masterNode.derive(DERIVATION_PATH).deriveChild(0).deriveChild(0)
  return key.privateKey!
}

export const getPrivateKeyFromSeed = (seed: Uint8Array): string => {
  return hex.encode(deriveKeyFromSeed(seed))
}

export const calcNextRollover = (vtxoTreeExpiry: number, vtxos: Awaited<ReturnType<IWallet['getVtxos']>>): number => {
  return vtxos
    ? vtxos.reduce((acc: number, cur) => {
        const unixtimestamp = Math.floor(new Date(cur.createdAt).getTime() / 1000 + vtxoTreeExpiry)
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
