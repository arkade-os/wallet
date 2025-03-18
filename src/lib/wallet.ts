import { mnemonicToSeed } from '@scure/bip39'
import { HDKey } from '@scure/bip32'
import { hex } from '@scure/base'
import { Vtxo, Vtxos } from './types'

const DERIVATION_PATH = "m/44/1237/0'"

export const getPrivateKeyFromMnemonic = async (mnemonic: string): Promise<string> => {
  const seed = await mnemonicToSeed(mnemonic)
  if (!seed) throw new Error('Could not get seed from mnemonic')
  const masterNode = HDKey.fromMasterSeed(seed)
  const key = masterNode.derive(DERIVATION_PATH).deriveChild(0).deriveChild(0)
  return hex.encode(key.privateKey!)
}

export const calcNextRollover = (vtxos: Vtxos): number =>
  vtxos.spendable
    ? vtxos.spendable.reduce((acc: number, cur: Vtxo) => {
        const unixtimestamp = Math.floor(new Date(cur.expireAt).getTime() / 1000)
        return unixtimestamp < acc || acc === 0 ? unixtimestamp : acc
      }, 0)
    : 0

export const vtxosExpiringSoon = (nextRollOver: number): boolean => {
  if (!nextRollOver) return false
  const now = Math.floor(new Date().getTime() / 1000)
  const threshold = 60 * 60 * 24 // one day in seconds
  return now + threshold > nextRollOver
}
