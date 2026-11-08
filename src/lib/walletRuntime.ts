import { ServiceWorkerWallet, Wallet } from '@arkade-os/sdk'
import { consoleError } from './logs'

export class ForegroundWallet extends Wallet {
  hardwareSigner = false
  clearNativeStorage?: () => Promise<void>
  private closed = false

  async getStatus(): Promise<{ walletInitialized: boolean }> {
    return { walletInitialized: !this.closed }
  }

  async reload(): Promise<void> {
    if (this.closed) throw new Error('Wallet is locked')
    await Promise.all([this.getSpendableVtxos({ maxSyncAgeMs: 0, requireSynced: true }), this.getBoardingUtxos()])
  }

  override async clear(): Promise<void> {
    if (this.closed) return
    this.closed = true
    await this.dispose()
  }
}

export type WalletRuntime = ServiceWorkerWallet | ForegroundWallet

export function watchWalletPayments(wallet: WalletRuntime, callback: (event: MessageEvent) => void): () => void {
  if (!(wallet instanceof ForegroundWallet)) {
    navigator.serviceWorker.addEventListener('message', callback)
    return () => navigator.serviceWorker.removeEventListener('message', callback)
  }
  let active = true
  let stop: (() => void) | undefined
  wallet
    .notifyIncomingFunds((funds) => {
      if (!active) return
      callback(
        new MessageEvent('message', {
          data:
            funds.type === 'vtxo'
              ? { type: 'VTXO_UPDATE', payload: { newVtxos: funds.newVtxos, spentVtxos: funds.spentVtxos } }
              : { type: 'UTXO_UPDATE', payload: { coins: funds.coins } },
        }),
      )
    })
    .then((unsubscribe) => {
      if (active) stop = unsubscribe
      else unsubscribe()
    })
    .catch((error) => consoleError(error, 'Unable to watch incoming payments'))
  return () => {
    active = false
    stop?.()
  }
}
