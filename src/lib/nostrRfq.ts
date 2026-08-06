/**
 * Nostr transport for the Arkade RFQ maker side.
 *
 * The swap client is the MAKER — it posts and funds the intent; the solver is
 * the TAKER that fills it. This module carries that negotiation over Nostr,
 * which is the production transport: `docs/rfq-protocol.md` § 3.1 in
 * arkade-os/lightning-swap-service.
 *
 * **Kind 4859, directed.** One kind for the whole message family. `content` is
 * the NIP-44-encrypted payload; a `p` tag names the recipient. Both sides are
 * outbound-only — each dials relays, neither listens — which is what lets a
 * solver sit behind NAT with no public endpoint. No URL for the solver appears
 * anywhere: it is addressed purely by x-only pubkey.
 *
 * Not to be confused with the discovery spec's kind 38173 appendix, which is a
 * dormant *broadcast pricing* layer for spot markets. The RFQ message family is
 * specified separately, and this implements that.
 *
 * Everything above the codec is unchanged from the HTTP transport: this
 * satisfies the same `RfqTransport` interface, so the maker flow
 * (`requestLightningSend`) is identical whichever transport it is handed.
 */
import { finalizeEvent, generateSecretKey, getPublicKey, nip44, SimplePool, type Event } from 'nostr-tools'
import { SwapRefusal, type RfqQuote, type RfqStatus, type RfqTransport } from './arkadeSwap/rfq'

/** Directed RFQ traffic. Provisional in the spec; kept in one place. */
export const RFQ_DIRECTED_KIND = 4859

/** Indicative solver advertisement — never binding; only a quote binds. */
export const RFQ_AD_KIND = 38859

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Discriminate a decrypted reply, mirroring the client's own rule: a refusal
 * carries a closed-set reason and is thrown as `SwapRefusal`; anything that is
 * not a quote for THIS negotiation is an error rather than a value.
 *
 * The `rfq_id` check is what stops a reply to one negotiation being accepted as
 * the answer to another — on a shared relay the solver's events all arrive on
 * the same subscription.
 */
const asQuote = (payload: unknown, rfqId: string): RfqQuote => {
  const p = payload as { type?: string; reason?: string; rfq_id?: string } | null
  if (p?.type === 'rfq_refusal') throw new SwapRefusal(p.reason ?? 'unknown', p.rfq_id ?? rfqId)
  if (p?.type !== 'rfq_quote' || p.rfq_id !== rfqId) {
    throw new Error(`unexpected reply: ${p?.type ?? 'no payload'}`)
  }
  return payload as RfqQuote
}

export interface NostrRfqOptions {
  /** Relay URLs from the solver's card. The rendezvous, not solver endpoints. */
  relays: string[]
  /** The card's `discovery_pubkey`, x-only hex — who we address. */
  solverPubkey: string
  /**
   * Transport key. Defaults to a FRESH key per transport, deliberately: the
   * negotiation should not be linkable to the wallet's long-term identity, and
   * nothing in the protocol needs a stable client key — the quote binds to the
   * covenant, not to who asked for it.
   */
  secretKey?: Uint8Array
  /** Injectable for tests; a caller may also share one pool across swaps. */
  pool?: SimplePool
  timeoutMs?: number
}

/**
 * Build an `RfqTransport` speaking kind-4859 directed traffic.
 *
 * Sends are fire-and-forget publishes; replies arrive on a single long-lived
 * subscription filtered to this transport key, so a reply that arrives before
 * the publish promise settles is not missed.
 */
export const nostrRfqTransport = (options: NostrRfqOptions): RfqTransport => {
  const relays = options.relays
  const solverPubkey = options.solverPubkey
  const secretKey = options.secretKey ?? generateSecretKey()
  const pubkey = getPublicKey(secretKey)
  const pool = options.pool ?? new SimplePool()
  const ownsPool = !options.pool
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const conversationKey = nip44.v2.utils.getConversationKey(secretKey, solverPubkey)

  /** Waiters keyed by rfq_id, resolved by whichever reply type arrives first. */
  const waiters = new Map<string, (payload: unknown) => void>()

  // One subscription for the whole transport. Opened eagerly so a fast solver
  // cannot answer into a subscription that does not exist yet.
  const subscription = pool.subscribeMany(
    relays,
    { kinds: [RFQ_DIRECTED_KIND], '#p': [pubkey], authors: [solverPubkey] },
    {
      onevent(event: Event) {
        let payload: unknown
        try {
          payload = JSON.parse(nip44.v2.decrypt(event.content, conversationKey))
        } catch {
          return // not for us, or malformed: silence, never a throw on the socket
        }
        const rfqId = (payload as { rfq_id?: string } | null)?.rfq_id
        if (!rfqId) return
        waiters.get(rfqId)?.(payload)
      },
    },
  )

  const send = async (payload: Record<string, unknown>): Promise<void> => {
    const event = finalizeEvent(
      {
        kind: RFQ_DIRECTED_KIND,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', solverPubkey]],
        content: nip44.v2.encrypt(JSON.stringify(payload), conversationKey),
      },
      secretKey,
    )
    // Publishing to several relays: one accepting is enough, so a single
    // rejecting relay must not fail the negotiation.
    const results = await Promise.allSettled(pool.publish(relays, event))
    if (!results.some((r) => r.status === 'fulfilled')) {
      throw new Error('no relay accepted the RFQ message')
    }
  }

  /** Await the reply for one rfq_id, with a timeout and guaranteed cleanup. */
  const awaitReply = (rfqId: string): Promise<unknown> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters.delete(rfqId)
        reject(new Error(`no solver reply within ${timeoutMs}ms`))
      }, timeoutMs)
      waiters.set(rfqId, (payload) => {
        clearTimeout(timer)
        waiters.delete(rfqId)
        resolve(payload)
      })
    })

  return {
    async requestQuote(payload) {
      const rfqId = String(payload.rfq_id)
      // Register the waiter BEFORE publishing: the reply can land while the
      // publish promise is still settling.
      const reply = awaitReply(rfqId)
      await send(payload)
      return asQuote(await reply, rfqId)
    },

    async status(rfqId) {
      const reply = awaitReply(rfqId)
      await send({ v: 1, type: 'rfq_status_request', rfq_id: rfqId })
      const payload = (await reply) as { type?: string } | null
      // A solver that has forgotten the negotiation answers nothing useful;
      // null means "no status", matching the HTTP transport's 404.
      if (payload?.type !== 'rfq_status') return null
      return payload as RfqStatus
    },

    async close() {
      subscription.close()
      waiters.clear()
      // Only tear down a pool this transport created; a shared one belongs to
      // the caller and may still be serving other swaps.
      if (ownsPool) pool.close(relays)
    },
  }
}
