import { stableStringify, type Card, type Network, type TransportCardFetcher } from '@arkade-os/solver-discovery'
import { nostrCardFetcher } from '@arkade-os/swap/nostr'
import { SimplePool } from 'nostr-tools'

export interface CardRendezvous {
  pubkey: string
  relays: string[]
}

/** The Nostr rendezvous a pinned card advertises, when it advertises one. */
export const getCardRendezvous = (card: Card): CardRendezvous | null => {
  const pubkey = card.discovery_pubkey
  const relays = card.transports?.nostr?.relays
  if (!pubkey || !Array.isArray(relays) || relays.length === 0) return null
  return { pubkey, relays: [...relays] }
}

/** Byte-identical content check: what discovery itself uses to dedupe markets. */
export const isSameCardContent = (a: unknown, b: unknown): boolean => {
  try {
    return stableStringify(a) === stableStringify(b)
  } catch {
    return false
  }
}

// One pool for the app lifetime, lent to every transport-card read: the market
// watcher, one-shot discovery, and the card detail view. The fetcher tears down
// what it opened: with a fresh pool per check it nukes the whole relay
// connection each time, and that CLOSE races the socket lifecycle — the send
// it triggers rejects detached and lands in the console on every open. A lent
// pool is never closed, only the subscription on it.
let sharedPool: SimplePool | undefined

const poolForCards = (): SimplePool => {
  if (!sharedPool) sharedPool = new SimplePool({})
  return sharedPool
}

/** Live solver cards over the shared pool, for discovery and the detail view. */
export const sharedTransportCards = (): TransportCardFetcher => nostrCardFetcher({ pool: poolForCards() })

export interface RemoteSolverCard {
  card: unknown
  createdAt: number
}

/**
 * Latest Nostr kind-38859 card for this pinned card's solver, or null when the
 * relays hold none. Throws on transport failure so the caller can report
 * "could not check" rather than "no update". Cards without a rendezvous never
 * reach the network: they resolve to null without a fetch.
 */
export const fetchRemoteSolverCard = async (card: Card, network: Network): Promise<RemoteSolverCard | null> => {
  const rendezvous = getCardRendezvous(card)
  if (!rendezvous) return null
  const fetcher = sharedTransportCards()
  const solvers = [
    {
      name: card.name,
      discovery_pubkey: rendezvous.pubkey,
      transports: card.transports,
    },
  ]
  const cards = await fetcher.fetch(solvers as never, network)
  if (!cards || cards.length === 0) return null
  const match = cards.find((c) => c.pubkey === rendezvous.pubkey) ?? cards[0]
  if (!match) return null
  return { card: match.card, createdAt: match.createdAt }
}
