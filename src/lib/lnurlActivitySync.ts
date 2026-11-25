import type { PaymentSyncStore } from '@arkade-os/lnurl-client'
import type { ArkadeSigner } from '@arkade-os/lnurl-client/arkade'
import { consoleError } from './logs'
import { lnurlReceiver } from './receive/lnurlRail'
import { lnurlPaymentSyncStore } from './lnurlPaymentRepository'

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
  const receiver = await lnurlReceiver({
    identity,
    arkadeAddress,
    boardingAddress: opts.boardingAddress,
    store: opts.store ?? lnurlPaymentSyncStore,
  })?.owned()
  return (await receiver?.sync({ signal })) ?? { synced: 0, failures: [] }
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
