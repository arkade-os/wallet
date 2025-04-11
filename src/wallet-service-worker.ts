import { Worker } from '@arklabs/wallet-sdk'
import { vtxosExpiringSoon } from './lib/wallet'
import { prettyAgo } from './lib/format'

// service worker global scope
declare const self: ServiceWorkerGlobalScope

const worker = new Worker()
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

interface Vtxo {
  expireAt: string
}

interface VtxosResponse {
  spendableVtxos?: Vtxo[]
}

// we can't use ./lib/wallet/calcNextRollover because vtxos have different types
function calcNextRollover(vtxos: VtxosResponse): number {
  return vtxos.spendableVtxos
    ? vtxos.spendableVtxos.reduce((acc: number, cur: Vtxo) => {
        const unixtimestamp = parseInt(cur.expireAt)
        return unixtimestamp < acc || acc === 0 ? unixtimestamp : acc
      }, 0)
    : 0
}

// get vtxos from server
async function getVtxos(arkAddress: string, serverUrl: string): Promise<VtxosResponse> {
  try {
    const headers = { 'Content-Type': 'application/json' }
    const response = await fetch(`${serverUrl}/v1/vtxos/${arkAddress}`, { headers })
    return await response.json()
  } catch {
    return {}
  }
}

// check for expiring vtxos
async function checkExpiringVtxos(arkAddress: string, serverUrl: string): Promise<void> {
  const vtxos = await getVtxos(arkAddress, serverUrl)
  const nextRollOver = calcNextRollover(vtxos)
  if (vtxosExpiringSoon(nextRollOver)) notifyUser(nextRollOver)
}

// This allows the web app to trigger actions on the service worker
self.addEventListener('message', (event: any) => {
  let intervalId: number | undefined
  if (!event.data) return
  const { data, type } = event.data as { data?: { arkAddress: string; serverUrl: string }; type: string }
  // This allows the web app to trigger skipWaiting via
  // registration.waiting.postMessage({type: 'SKIP_WAITING'})
  if (type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  // This allows the web app to trigger the vtxo expiration check via
  // registration.active.postMessage({type: 'START_CHECK', data: {arkAddress, serverUrl}})
  if (type === 'START_CHECK' && data) {
    intervalId = window.setInterval(() => {
      checkExpiringVtxos(data.arkAddress, data.serverUrl)
    }, 4 * 60 * 60 * 1000) // every 4 hours
  }
  // This allows the web app to stop the vtxo expiration check via
  // registration.active.postMessage({type: 'STOP_CHECK'})
  if (type === 'STOP_CHECK') {
    if (intervalId) clearInterval(intervalId)
  }
})
