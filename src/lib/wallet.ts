import { HDKey } from '@scure/bip32'
import { hex } from '@scure/base'
import { Vtxo } from './types'
import { AspInfo } from '../providers/asp'
import { getConfirmedAndNotExpiredUtxos } from './utxo'
import { IWallet } from '@arkade-os/sdk'
import { Indexer } from './indexer'

const DERIVATION_PATH = "m/44/1237/0'"

export const deriveKeyFromSeed = (seed: Uint8Array): Uint8Array => {
  const masterNode = HDKey.fromMasterSeed(seed)
  const key = masterNode.derive(DERIVATION_PATH).deriveChild(0).deriveChild(0)
  return key.privateKey!
}

export const getPrivateKeyFromSeed = (seed: Uint8Array): string => {
  return hex.encode(deriveKeyFromSeed(seed))
}

export const calcNextRollover = async (vtxos: Vtxo[], wallet: IWallet, aspInfo: AspInfo): Promise<number> => {
  if (vtxos.length === 0) {
    const utxos = await getConfirmedAndNotExpiredUtxos(wallet)
    if (utxos.length === 0) return 0
    const minBlockTime = Math.min(...utxos.map((u) => u.status.block_time || 0))
    if (minBlockTime === 0) return 0
    const expiration = Number(aspInfo.boardingExitDelay)
    return minBlockTime + expiration
  }
  return vtxos.reduce((acc: number, cur) => {
    const expiryMs = cur.expiresAt?.getTime()
    if (!expiryMs) return acc
    const unixtimestamp = Math.floor(expiryMs / 1000)
    return unixtimestamp < acc || acc === 0 ? unixtimestamp : acc
  }, 0)
}

export const calcBatchLifetimeMs = async (vtxos: Vtxo[], indexer: Indexer): Promise<number> => {
  const sampleVtxo = vtxos.find((vtxo) => vtxo.expiresAt && vtxo.commitmentTxIds?.length)
  if (!sampleVtxo?.expiresAt || !sampleVtxo.commitmentTxIds?.[0]) return 0

  const batchStart = await indexer.getAndUpdateCommitmentTxCreatedAt(sampleVtxo.commitmentTxIds[0])
  if (!batchStart) return 0
  const batchStartMs = batchStart * 1000

  const batchExpiryMs = sampleVtxo.expiresAt.getTime()
  return batchExpiryMs - batchStartMs
}
