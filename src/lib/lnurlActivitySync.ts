import type { PaymentSyncStore } from '@arkade-os/lnurl-client'
import type { ArkadeSigner } from '@arkade-os/lnurl-client/arkade'
import { lnurlReceiver } from './receive/lnurlRail'
import { lnurlPaymentSyncStore } from './lnurlPaymentRepository'

export interface LnurlSyncOutcome {
  synced: number
  failures: unknown[]
}

/**
 * Pulls payment activity for the identity's address owned at the configured
 * lnurl-server, writing through `store`. Resolves to zero rather than
 * throwing when there is no configured server or no owned address — the
 * caller (startup) must never be blocked by this. Writes stop once `signal`
 * aborts: a reset clears the store while a sync may still be in flight.
 */
export async function syncLnurlActivity(
  identity: ArkadeSigner,
  arkadeAddress: string,
  opts: { boardingAddress?: string; store?: PaymentSyncStore; signal?: AbortSignal } = {},
): Promise<LnurlSyncOutcome> {
  const store = opts.store ?? lnurlPaymentSyncStore
  const { signal } = opts
  const receiver = await lnurlReceiver({
    identity,
    arkadeAddress,
    boardingAddress: opts.boardingAddress,
    store: signal
      ? {
          ...store,
          upsert: async (records) => {
            if (!signal.aborted) await store.upsert(records)
          },
          writeWatermark: async (baseUrl, lightningAddress, since) => {
            if (!signal.aborted) await store.writeWatermark(baseUrl, lightningAddress, since)
          },
        }
      : store,
  })?.owned()
  return (await receiver?.sync()) ?? { synced: 0, failures: [] }
}
