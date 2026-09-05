/**
 * Wallet-side lifecycle around `@arkade-os/swap`'s Nostr RFQ transport.
 *
 * The transport itself lives in `@arkade-os/swap/nostr`. What v2 changed is who
 * decides to build one: `createSwapClient` takes a `transportFor(market)` and
 * calls it per quote, reading the rendezvous off the market card rather than off
 * a hand-assembled config. What it does NOT do is close what it asked for — so
 * the lifetime is still this wallet's problem.
 *
 * It is a cache rather than the old `try/finally`, because the call shape moved.
 * `withRfqTransport` wrapped ONE negotiation and could close on the way out; the
 * client asks per quote, and the receive screen re-quotes on every
 * keystroke-debounced amount change. A transport per call would open and abandon
 * a relay subscription each time. One per solver, closed when the client stops,
 * is the same number of sockets the old wrapper held at its peak and far fewer
 * over a session.
 */
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import type { RfqTransport } from '@arkade-os/swap'
import { nostrRfqTransport } from '@arkade-os/swap/nostr'
import { consoleError } from './logs'

/** The package's own default; mirrored so the timeout message can name it. */
export const RFQ_TIMEOUT_MS = 30_000

export interface RfqTransportCache {
  /** `SwapClientDeps['transportFor']`: one transport per solver rendezvous. */
  transportFor: (market: DiscoveredMarket) => RfqTransport
  /** Close every transport this cache opened. Safe to call twice. */
  closeAll: () => Promise<void>
}

/**
 * A market that reaches us without a rendezvous is malformed rather than
 * unreachable, and saying so here is what keeps the failure at the market
 * instead of inside a transport with no relays to talk to.
 *
 * The relays sit under `transports.nostr` rather than at the card's top level:
 * the registry schema moved them there so a second transport is a new key in
 * that map instead of a breaking change. Nostr is the only protocol defined in
 * v0, and it is the one this wallet speaks, so it is read by name.
 */
export const rfqRendezvousOf = (market: DiscoveredMarket): { solverPubkey: string; relays: string[] } | undefined => {
  const solverPubkey = market.discovery_pubkey
  const relays = market.transports?.nostr?.relays ?? []
  if (!solverPubkey || relays.length === 0) return undefined
  return { solverPubkey, relays }
}

export const rfqTransportCache = (timeoutMs = RFQ_TIMEOUT_MS): RfqTransportCache => {
  const open = new Map<string, RfqTransport>()
  return {
    transportFor: (market) => {
      const rendezvous = rfqRendezvousOf(market)
      if (!rendezvous) throw new Error('this market carries no Nostr rendezvous to negotiate over')
      // Keyed on the rendezvous, not the market: two cards for one solver on
      // one relay set are one conversation, and re-sorting the relays keeps a
      // reordered card from opening a second socket to the same places.
      const key = `${rendezvous.solverPubkey}:${[...rendezvous.relays].sort().join(',')}`
      const cached = open.get(key)
      if (cached) return cached
      const transport = nostrRfqTransport({ ...rendezvous, timeoutMs })
      open.set(key, transport)
      return transport
    },
    closeAll: async () => {
      const transports = [...open.values()]
      open.clear()
      await Promise.all(
        transports.map((transport) =>
          transport.close().catch((err) => consoleError(err, 'error closing rfq transport')),
        ),
      )
    },
  }
}

/**
 * The package rejects a timed-out request with `no solver reply within 30000ms`,
 * which `handleError` puts in front of a user verbatim. Rewrite it: the number
 * of milliseconds is not the point, and the string does not say what to do next.
 *
 * Matched rather than typed because the package throws a plain `Error` here —
 * `RelayUnavailable` is the only failure it gives a class to. A miss is
 * survivable (the original message still surfaces), so this must not widen into
 * catching errors it cannot identify: a refusal or a bad quote has to keep its
 * own message.
 *
 * TODO: drop this once the package carries a user-facing message or a typed
 * timeout of its own.
 */
export const friendlyRfqError = (error: unknown, timeoutMs = RFQ_TIMEOUT_MS): unknown => {
  if (error instanceof Error && /^no solver reply within \d+ms$/.test(error.message)) {
    // RelayUnavailable already covers a dead relay, so reaching here means the
    // relay took our request and the solver did not answer it.
    return new Error(`Lightning solver is not responding (waited ${timeoutMs / 1000}s) — try again later`)
  }
  return error
}
