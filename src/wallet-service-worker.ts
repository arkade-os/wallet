import { ExtendedVirtualCoin, Worker } from '@arklabs/wallet-sdk'
import { vtxosExpiringSoon } from './lib/wallet'
import { prettyAgo } from './lib/format'
import { vtxosRepository } from './lib/db'

// service worker global scope
declare const self: ServiceWorkerGlobalScope

const worker = new Worker(vtxosRepository)
worker.start().catch(console.error)

function notify(title: string, body: string): void {
  self.registration.showNotification(title, { body, icon: '/arkade-icon-220.png' })
}

// notify user of expiring vtxos
function notifyUser(nextRollOver: number): void {
  const title = `Virtual coins expiring ${prettyAgo(nextRollOver)}`
  const body = 'Open wallet to renew virtual coins'
  notify(title, body)
}

// we can't use ./lib/wallet/calcNextRollover because vtxos have different types
function calcNextRollover(vtxos: ExtendedVirtualCoin[]): number {
  return vtxos
    ? vtxos.reduce((acc: number, cur: ExtendedVirtualCoin) => {
        const expiry = cur.virtualStatus.batchExpiry
        if (!expiry) return acc
        const unixtimestamp = expiry
        return unixtimestamp < acc || acc === 0 ? unixtimestamp : acc
      }, 0)
    : 0
}

// check for expiring vtxos
async function checkExpiringVtxos(): Promise<void> {
  const vtxos = await vtxosRepository.getSpendableVtxos()
  const nextRollOver = calcNextRollover(vtxos)
  if (vtxosExpiringSoon(nextRollOver)) notifyUser(nextRollOver)
}

// This allows the web app to trigger actions on the service worker
self.addEventListener('message', (event: any) => {
  let intervalId: number | undefined
  if (!event.data) return
  const { type } = event.data as { type: string }
  // This allows the web app to trigger skipWaiting via
  // registration.waiting.postMessage({type: 'SKIP_WAITING'})
  if (type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  // This allows the web app to trigger the vtxo expiration check via
  // registration.active.postMessage({type: 'START_CHECK', data: {arkAddress, serverUrl}})
  if (type === 'START_CHECK') {
    intervalId = window.setInterval(() => {
      checkExpiringVtxos()
    }, 4 * 60 * 60 * 1000) // every 4 hours
  }
  // This allows the web app to stop the vtxo expiration check via
  // registration.active.postMessage({type: 'STOP_CHECK'})
  if (type === 'STOP_CHECK') {
    if (intervalId) clearInterval(intervalId)
  }
})
