import { ExtendedVirtualCoin, IWallet, ServiceWorkerWallet, VtxoManager } from '@arkade-os/sdk'
import { maxPercentage } from './constants'
import { getVtxos } from './asp'

// this should never happen, but just in case
const getOrphanVtxos = async (wallet: IWallet): Promise<ExtendedVirtualCoin[]> => {
  const now = Date.now()
  const { spendable } = await getVtxos(wallet as ServiceWorkerWallet)
  const orphanVtxos = spendable.filter((vtxo) => {
    if (!vtxo.virtualStatus.batchExpiry) return false
    const unspent = vtxo.isSpent === false
    const expired = vtxo.virtualStatus.batchExpiry < now
    const notSwept = vtxo.virtualStatus.state !== 'swept'
    return expired && unspent && notSwept
  })
  return orphanVtxos
}

export const getExpiringAndRecoverableVtxos = async (wallet: IWallet): Promise<ExtendedVirtualCoin[]> => {
  const manager = new VtxoManager(wallet, { thresholdPercentage: maxPercentage })
  return [...(await manager.getExpiringVtxos()), ...(await getOrphanVtxos(wallet))]
}
