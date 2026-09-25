import type { PaymentSyncStore } from '@arkade-os/lnurl-client'
import type { ArkadeSigner } from '@arkade-os/lnurl-client/arkade'
import { lnurlReceiver } from './receive/lnurlRail'
import { lnurlPaymentSyncStore } from './lnurlPaymentRepository'

export interface LnurlSyncOutcome {
  synced: number
  failures: unknown[]
}

const inFlightWrites = new Set<Promise<void>>()

const tracked = async (write: Promise<void>): Promise<void> => {
  inFlightWrites.add(write)
  try {
    await write
  } finally {
    inFlightWrites.delete(write)
  }
}

/** Resolves once every store write a sync started has landed. After the
 *  signal aborts no new one starts, so a reset that awaits this clears last. */
export const lnurlSyncWritesSettled = async (): Promise<void> => {
  await Promise.allSettled([...inFlightWrites])
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
            if (!signal.aborted) await tracked(store.upsert(records))
          },
          writeWatermark: async (baseUrl, lightningAddress, since) => {
            if (!signal.aborted) await tracked(store.writeWatermark(baseUrl, lightningAddress, since))
          },
        }
      : store,
  })?.owned()
  return (await receiver?.sync()) ?? { synced: 0, failures: [] }
}
