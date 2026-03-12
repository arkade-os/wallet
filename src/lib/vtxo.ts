import { ExtendedVirtualCoin, IWallet, ServiceWorkerWallet, VtxoManager } from '@arkade-os/sdk'
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

export const getExpiringAndRecoverableVtxos = async (
  manager: VtxoManager,
  thresholdMs: number,
): Promise<ExtendedVirtualCoin[]> => {
  return [...(await manager.getExpiringVtxos(thresholdMs)), ...(await getOrphanVtxos(manager.wallet))]
}
