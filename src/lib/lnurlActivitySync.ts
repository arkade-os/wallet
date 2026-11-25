import { createLnurlClient, syncPayments, type FetchImpl, type PaymentSyncStore } from '@arkade-os/lnurl-client'
import type { ArkadeSigner } from '@arkade-os/lnurl-client/arkade'
import { consoleError } from './logs'
import { configuredLnurlServer, lnurlReceiver } from './receive/lnurlRail'
import { lnurlPaymentSyncStore } from './lnurlPaymentRepository'

const SYNC_REQUEST_TIMEOUT_MS = 10_000

const activityFetch =
  (signal?: AbortSignal): FetchImpl =>
  async (input, init) => {
    const controller = new AbortController()
    const abort = () => controller.abort(signal?.reason)
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
    const timer = setTimeout(
      () => controller.abort(new DOMException('LNURL activity request timed out', 'TimeoutError')),
      SYNC_REQUEST_TIMEOUT_MS,
    )
    try {
      const response = await fetch(input, { ...init, signal: controller.signal })
      const body = await response.arrayBuffer()
      return new Response(body.byteLength ? body : null, response)
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
  }

/**
 * Pulls payment activity for the identity's address owned at the configured
 * lnurl-server, writing through `store`. Resolves to zero rather than
 * throwing when there is no configured server or no owned address — the
 * caller (startup) must never be blocked by this. Writes stop once `signal`
 * aborts, which a lock does; a reset instead closes the store itself, so that
 * the writers this module does not own are covered too.
 */
export async function syncLnurlActivity(
  identity: ArkadeSigner,
  arkadeAddress: string,
  opts: { boardingAddress?: string; store?: PaymentSyncStore; signal?: AbortSignal } = {},
) {
  const { signal } = opts
  if (signal?.aborted) return { synced: 0, failures: [] }
  const server = configuredLnurlServer()
  if (!server) return { synced: 0, failures: [] }
  const store = opts.store ?? lnurlPaymentSyncStore
  const client = createLnurlClient({ baseUrl: server.baseUrl, fetchImpl: activityFetch(signal) })
  const facade = lnurlReceiver({
    identity,
    arkadeAddress,
    boardingAddress: opts.boardingAddress,
    store,
    client,
  })
  const receiver = await facade?.owned({ signal, refresh: true }).catch((err) => {
    if (!signal?.aborted) throw err
  })
  if (signal?.aborted || !receiver || !facade) return { synced: 0, failures: [] }
  // Receiver.sync creates an unbounded client instead of retaining the facade's transport.
  return syncPayments([{ ...server, token: await facade.token(), handle: receiver.handle }], {
    client: () => client,
    store,
    signal,
  })
}

const RESYNC_DELAYS_MS = [3_000, 20_000]

/** Startup alone leaves a payment received while the wallet is open unattributed until the
 *  next start. The server records it as it settles, so pull once shortly after it lands and
 *  once more after the server has caught up; `onSynced` reloads the history when either wrote. */
export function lnurlResyncOnPayment(sync: () => Promise<number>, onSynced: () => void) {
  let timers: ReturnType<typeof setTimeout>[] = []
  const cancel = () => {
    timers.forEach(clearTimeout)
    timers = []
  }
  return {
    onPayment() {
      cancel()
      timers = RESYNC_DELAYS_MS.map((ms) =>
        setTimeout(() => {
          sync()
            .then((synced) => {
              if (synced > 0) onSynced()
            })
            .catch((err) => consoleError(err, 'lnurl activity sync failed'))
        }, ms),
      )
    },
    cancel,
  }
}
