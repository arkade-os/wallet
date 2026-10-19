import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card, Network } from '@arkade-os/solver-discovery'
import { fetchRemoteSolverCard, getCardRendezvous, isSameCardContent } from '../../lib/solverCardRemote'

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

  it('compares card content independent of key order', () => {
    const a = { version: 0, name: 'Pinned', markets: [{ fee_bps: 30, min: '1' }] }
    const b = { markets: [{ min: '1', fee_bps: 30 }], name: 'Pinned', version: 0 }
    expect(isSameCardContent(a, b)).toBe(true)
    expect(isSameCardContent(a, { ...a, name: 'Other' })).toBe(false)
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
