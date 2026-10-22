import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card, Network } from '@arkade-os/solver-discovery'
import { fetchRemoteSolverCard, getCardRendezvous, sharedTransportCards } from '../../lib/solverCardRemote'

const { mockFetchTransportCards } = vi.hoisted(() => ({ mockFetchTransportCards: vi.fn() }))

vi.mock('@arkade-os/swap/nostr', () => ({
  nostrCardFetcher: () => ({ fetch: mockFetchTransportCards }),
}))

const network = 'regtest' as Network

describe('solverCardRemote', () => {
  beforeEach(() => {
    mockFetchTransportCards.mockReset()
  })

  it('reports no rendezvous without a discovery pubkey', () => {
    const card: Card = { version: 0, name: 'NoKey', markets: [] }
    expect(getCardRendezvous(card)).toBeNull()
  })

  it('reports no rendezvous without relays', () => {
    const card: Card = { version: 0, name: 'NoRelays', discovery_pubkey: 'a'.repeat(64), markets: [] }
    expect(getCardRendezvous(card)).toBeNull()
  })

  it('returns the pubkey and relays otherwise', () => {
    const card: Card = {
      version: 0,
      name: 'Pinned',
      discovery_pubkey: 'a'.repeat(64),
      transports: { nostr: { relays: ['wss://example.com'] } },
      markets: [],
    }
    expect(getCardRendezvous(card)).toEqual({ pubkey: 'a'.repeat(64), relays: ['wss://example.com'] })
  })

  it('never reaches the network for a card without rendezvous', async () => {
    const card: Card = { version: 0, name: 'Local', markets: [] }
    await expect(fetchRemoteSolverCard(card, network)).resolves.toBeNull()
    expect(mockFetchTransportCards).not.toHaveBeenCalled()
  })

  it('returns null when relays hold no card', async () => {
    const card: Card = {
      version: 0,
      name: 'Pinned',
      discovery_pubkey: 'b'.repeat(64),
      transports: { nostr: { relays: ['wss://example.com'] } },
      markets: [],
    }
    mockFetchTransportCards.mockResolvedValue([])
    await expect(fetchRemoteSolverCard(card, network)).resolves.toBeNull()
  })

  it('shares one transport reader across callers', () => {
    expect(sharedTransportCards()).toBe(sharedTransportCards())
  })

  it('shares one in-flight read for concurrent checks', async () => {
    const card: Card = {
      version: 0,
      name: 'Pinned',
      discovery_pubkey: 'e'.repeat(64),
      transports: { nostr: { relays: ['wss://example.com'] } },
      markets: [],
    }
    const remoteCard = { version: 0, name: 'Pinned', markets: [] }
    mockFetchTransportCards.mockResolvedValue([{ pubkey: 'e'.repeat(64), createdAt: 1700000000, card: remoteCard }])
    const [first, second] = await Promise.all([
      fetchRemoteSolverCard(card, network),
      fetchRemoteSolverCard(card, network),
    ])
    expect(mockFetchTransportCards).toHaveBeenCalledTimes(1)
    expect(first).toEqual({ card: remoteCard, createdAt: 1700000000 })
    expect(second).toEqual(first)
  })

  it('re-reads after the shared read settles', async () => {
    const card: Card = {
      version: 0,
      name: 'Pinned',
      discovery_pubkey: 'f'.repeat(64),
      transports: { nostr: { relays: ['wss://example.com'] } },
      markets: [],
    }
    mockFetchTransportCards.mockResolvedValue([])
    await fetchRemoteSolverCard(card, network)
    await fetchRemoteSolverCard(card, network)
    expect(mockFetchTransportCards).toHaveBeenCalledTimes(2)
  })

  it('returns the latest remote card with its publish time', async () => {
    const card: Card = {
      version: 0,
      name: 'Pinned',
      discovery_pubkey: 'c'.repeat(64),
      transports: { nostr: { relays: ['wss://example.com'] } },
      markets: [],
    }
    const remoteCard = { version: 0, name: 'Pinned', markets: [] }
    mockFetchTransportCards.mockResolvedValue([{ pubkey: 'c'.repeat(64), createdAt: 1700000000, card: remoteCard }])
    await expect(fetchRemoteSolverCard(card, network)).resolves.toEqual({ card: remoteCard, createdAt: 1700000000 })
  })
})
