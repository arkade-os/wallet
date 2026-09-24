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
 * caller (startup) must never be blocked by this.
 */
export async function syncLnurlActivity(
  identity: ArkadeSigner,
  arkadeAddress: string,
  opts: { boardingAddress?: string; store?: PaymentSyncStore } = {},
): Promise<LnurlSyncOutcome> {
  const receiver = await lnurlReceiver({
    identity,
    arkadeAddress,
    boardingAddress: opts.boardingAddress,
    store: opts.store ?? lnurlPaymentSyncStore,
  })?.owned()
  return (await receiver?.sync()) ?? { synced: 0, failures: [] }
}
