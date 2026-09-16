import type { ActivityResolver } from '@arkade-os/sdk'
import type { StoredPayment } from '@arkade-os/lnurl-client'
import { lnurlPaymentRepository } from '../lnurlPaymentRepository'
import { txidOfArkTransaction } from '../transactionHistory'

export const LNURL_RESOLVER_ID = 'arkade-wallet:lnurl-server'
export const LNURL_ACTIVITY_KIND = 'lnurl-receive'

const readByPaymentReference = (): Promise<Map<string, StoredPayment>> => lnurlPaymentRepository.byPaymentReference()

/** Decorates rather than supplies. Chain sync already sees the VTXO arrive; the
 * lnurl-server record adds what chain cannot — that it was a Lightning payment
 * to a named address — so the row reads "received to alice@example.com" instead
 * of showing an unattributed credit. */
export const lnurlResolver = (read = readByPaymentReference): ActivityResolver => {
  let byTxid = new Map<string, StoredPayment>()
  return {
    id: LNURL_RESOLVER_ID,
    async prepare() {
      // re-read on every history load: the sync loop writes after the first
      // one, and an index cached at construction would leave those receives
      // unattributed until the next reconnect
      byTxid = await read()
    },
    resolve(tx) {
      const record = byTxid.get(txidOfArkTransaction(tx))
      if (!record) return undefined
      return [
        {
          groupId: `lnurl:${record.key}`,
          kind: LNURL_ACTIVITY_KIND,
          label: 'Lightning receive',
          metadata: {
            lightningAddress: record.lightningAddress,
            domain: record.domain,
            baseUrl: record.baseUrl,
            identifier: record.identifier,
            swapId: record.swapId,
          },
        },
      ]
    },
  }
}
