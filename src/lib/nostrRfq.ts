/**
 * Wallet-side lifecycle around `@arkade-os/swap`'s Nostr RFQ transport.
 *
 * The transport itself no longer lives here. arkade-os/ts-sdk#718 moved it into
 * `@arkade-os/swap/nostr`, beside `httpTransport` and `relayTransport`, and this
 * repo's local copy was deleted with it — the kind constant now has exactly one
 * definition on this side of the wire. What remains is the part that is this
 * wallet's problem rather than the package's: owning the transport's lifetime,
 * and translating one error into something a user can act on.
 */
import type { RfqTransport } from '@arkade-os/swap'
import { nostrRfqTransport } from '@arkade-os/swap/nostr'

/** The package's own default; mirrored so the timeout message can name it. */
const DEFAULT_TIMEOUT_MS = 30_000

/**
 * The shape both corridors' rendezvous share — a solver's card reduced to who
 * to address and where to meet. `LnSendRendezvous` and `LnReceiveRendezvous`
 * both satisfy it structurally, which is why this takes neither by name.
 */
export interface RfqRendezvous {
  solverPubkey: string
  transports: { nostr: { relays: string[] } }
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
const friendlier = (error: unknown, timeoutMs: number): unknown => {
  if (error instanceof Error && /^no solver reply within \d+ms$/.test(error.message)) {
    // RelayUnavailable already covers a dead relay, so reaching here means the
    // relay took our request and the solver did not answer it.
    return new Error(`Lightning solver is not responding (waited ${timeoutMs / 1000}s) — try again later`)
  }
  return error
}

/**
 * Run one negotiation over a transport that is disposed either way.
 *
 * Every caller builds a transport from a rendezvous, uses it once, and must
 * close it — and a missed `close()` leaks a relay connection and its
 * subscription for the tab's lifetime. Owning that lifecycle here means a new
 * call site cannot forget it, and the `catch` on close is deliberate: a
 * teardown failure must not mask the negotiation's own result.
 */
export const withRfqTransport = async <T>(
  rendezvous: RfqRendezvous,
  fn: (transport: RfqTransport) => Promise<T>,
  options: { timeoutMs?: number } = {},
): Promise<T> => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const transport = nostrRfqTransport({
    relays: rendezvous.transports.nostr.relays,
    solverPubkey: rendezvous.solverPubkey,
    timeoutMs,
  })
  try {
    return await fn(transport)
  } catch (error) {
    throw friendlier(error, timeoutMs)
  }
}
