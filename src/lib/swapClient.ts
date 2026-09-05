/**
 * The wallet's one `@arkade-os/swap` client.
 *
 * v2 replaced three integrations with one object. Where the wallet used to hold
 * two `RfqSwapManager`s (one for the Lightning send leg, one for the receive
 * leg) plus a `watchOfferSwaps` watcher for offers, `createSwapClient` owns a
 * single manager, a single watcher, and the callbacks both used to be wired by
 * hand: `arkadeRefunder` for the send leg's refund push and an internal
 * `claimLockup` reading the stored record for the receive leg's claim.
 *
 * What is left on this side is what the client takes as configuration and
 * cannot infer:
 *
 * - **transports.** The client asks `transportFor(market)` per quote and never
 *   closes what it gets, so the lifetime is a cache here — see `nostrRfq.ts`.
 * - **discovery.** Which registry, which pinned cards. See `swapMarkets.ts`.
 * - **the BOLT11 decoder.** The client verifies the SOLVER's hold invoice with
 *   it on a receive; the wallet decodes the payer's invoice with the same
 *   function on a send, so both directions apply one set of gates.
 * - **the co-signer key.** A fact about the solver's deployment, which no
 *   client can look up; the package's per-network pin is the fallback.
 * - **the sealing key.** See the getter below.
 *
 * No server URL, and no providers built from one: `ServiceWorkerWallet` answers
 * `getArkadeInfo`, `getArkadeReader` and `getArkadeBroadcaster`, so the client's
 * chain reads and broadcasts go through the worker's own connection rather than
 * a second one opened beside it.
 */
import type { NetworkName } from '@arkade-os/sdk'
import { createSwapClient, type SwapClient, type SwapClientDeps } from '@arkade-os/swap'
import { getEmulatorPubkeyOverrideForNetwork } from './constants'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { toInvoiceFacts } from './lnSwap'
import { rfqTransportCache } from './nostrRfq'
import { discoveryOptions } from './swapMarkets'
import { assetSwapRepository } from './swapRepository'

/**
 * A throwaway key for the receive leg's claim packet — its secret is discarded
 * right here.
 *
 * The RFQ profile carries `P` sealed to covclaimd so that a wallet which goes
 * offline after paying can still be claimed for. This wallet does not go
 * offline: it holds the covenant's `receiver` role through its own
 * `payoutPubkey` and the client claims the lockup itself. So there is nothing
 * for covclaimd to do, and reaching a covclaimd deployment to ask for its key
 * would be a network dependency — and a failure mode — bought for nothing.
 *
 * Sealing to a key nobody holds is the honest encoding of that: the field stays
 * well-formed for solvers that expect it, while `P` provably cannot be read
 * early by the solver, by covclaimd, or by us. Nothing derives from this key —
 * `deriveLightningReceive` commits to the payment hash, payout key, server and
 * emulator keys, and never to the packet — so it cannot move the lockup address.
 *
 * Restoring the offline path means sealing to a real covclaimd key here; the
 * wire format does not change.
 */
export const sealingKey = (): Uint8Array => secp256k1.getPublicKey(secp256k1.utils.randomSecretKey(), true)

/**
 * A swap action attempted where the client is not the one driving: another tab
 * holds the lock.
 *
 * Named rather than generic because the screen has to say something true about
 * it. "Lightning unavailable" is what a missing solver or an out-of-bounds
 * amount means, and neither is the case here — nothing is unavailable, another
 * tab owns it, and closing that tab is the one thing that resolves it.
 */
export class SwapsHeldElsewhere extends Error {
  constructor() {
    super('another tab is handling swaps')
    this.name = 'SwapsHeldElsewhere'
  }
}

/** The client plus the teardown for the resources it does not own. */
export interface WalletSwapClient {
  client: SwapClient
  /**
   * Run one `accept` and report the transaction it funded with.
   *
   * `accept` returns the swap, not the funding txid: on a corridor route the
   * client funds internally and the txid reaches the record a pass later, when
   * the manager flushes. The wallet needs it in the same turn — it is the send's
   * receipt, and what the history row is built on — so the funding send is
   * observed as it happens rather than read back out of a record that may not
   * carry it yet.
   *
   * Serialised by construction: one slot, filled by the send inside `fn` and
   * cleared on the way out. Accepts are user-driven and one at a time.
   */
  acceptFunding: <T>(fn: () => Promise<T>) => Promise<{ result: T; fundingTxid?: string }>
  /** `client.stop()` and then close every transport it asked us to open. */
  close: () => Promise<void>
}

export const makeSwapClient = (wallet: SwapClientDeps['wallet'], network: NetworkName): WalletSwapClient => {
  const transports = rfqTransportCache()
  let funding: string | undefined

  /**
   * The wallet, with its funding sends observed.
   *
   * A `Proxy` rather than a spread or a subclass: `ServiceWorkerWallet` is a
   * class instance with private fields, so every other member has to reach the
   * real receiver. `Reflect.get(target, prop)` without the proxy as receiver,
   * and methods bound to the target, is what keeps those fields reachable.
   */
  const observed = new Proxy(wallet, {
    get(target, prop) {
      if (prop === 'send') {
        return async (...args: Parameters<SwapClientDeps['wallet']['send']>) => {
          const txid = await target.send(...args)
          funding = txid
          return txid
        }
      }
      const value = Reflect.get(target, prop) as unknown
      return typeof value === 'function' ? value.bind(target) : value
    },
  })

  const client = createSwapClient({
    wallet: observed,
    repository: assetSwapRepository,
    transportFor: transports.transportFor,
    discovery: discoveryOptions(network),
    // The wallet's own decoder, applied to the SOLVER's invoice inside the
    // package's own gate: it throws `InvoiceRejected` on a wrong network or an
    // already-expired hold invoice, and skipping it is what loses the payment.
    decodeInvoice: (bolt11) => toInvoiceFacts(bolt11, network),
    /**
     * A getter, not a value — and the difference is one lockup's linkability.
     *
     * The client reads this once per receive quote, so a getter keeps the
     * throwaway sealing key fresh per receive the way `requestLnReceive` did
     * when it generated one per call. A single key held for the client's
     * lifetime would seal every receive in the session to the same point, which
     * is a correlation handed out for nothing (see `sealingKey`).
     */
    get covclaimdPubkey() {
      return sealingKey()
    },
    // Compressed hex only: the package cannot re-add an 02/03 prefix to an
    // x-only value, so a configured key in that shape reads as NO override and
    // the package falls back to its own per-network pin.
    emulatorPubkey: getEmulatorPubkeyOverrideForNetwork(network),
  })

  return {
    client,
    acceptFunding: async (fn) => {
      funding = undefined
      try {
        return { result: await fn(), fundingTxid: funding }
      } finally {
        funding = undefined
      }
    },
    close: async () => {
      try {
        await client.stop()
      } finally {
        await transports.closeAll()
      }
    },
  }
}
