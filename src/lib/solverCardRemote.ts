import { type Card, type Network, type TransportCardFetcher } from '@arkade-os/solver-discovery'
import { nostrCardFetcher } from '@arkade-os/swap/nostr'
import { sharedNostrPool } from './nostr'

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

// One fetcher on the shared pool, so its last-known-card memory is shared by
// every reader instead of being thrown away per check.
let sharedFetcher: TransportCardFetcher | undefined

/** Live solver cards over the shared pool, for discovery and the detail view. */
export const sharedTransportCards = (): TransportCardFetcher => {
  if (!sharedFetcher) sharedFetcher = nostrCardFetcher({ pool: sharedNostrPool() })
  return sharedFetcher
}

export interface RemoteSolverCard {
  card: unknown
  createdAt: number
}

// Reads in flight, so concurrent checks for the same solver share one relay
// round-trip instead of each opening its own.
const inflight = new Map<string, Promise<RemoteSolverCard | null>>()

/**
 * Latest Nostr kind-38859 card for this pinned card's solver, or null when the
 * relays hold none. Throws on transport failure so the caller can report
 * "could not check" rather than "no update". Cards without a rendezvous never
 * reach the network: they resolve to null without a fetch.
 */
export const fetchRemoteSolverCard = async (card: Card, network: Network): Promise<RemoteSolverCard | null> => {
  const rendezvous = getCardRendezvous(card)
  if (!rendezvous) return null
  const key = network + ':' + rendezvous.pubkey
  const pending = inflight.get(key)
  if (pending) return pending
  const task = (async (): Promise<RemoteSolverCard | null> => {
    try {
      const cards = await sharedTransportCards().fetch(
        [
          {
            name: card.name,
            discovery_pubkey: rendezvous.pubkey,
            transports: card.transports,
          },
        ] as never,
        network,
      )
      if (!cards || cards.length === 0) return null
      const match = cards.find((c) => c.pubkey === rendezvous.pubkey) ?? cards[0]
      if (!match) return null
      return { card: match.card, createdAt: match.createdAt }
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, task)
  return task
}
