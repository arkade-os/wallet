import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import type { RfqTransport } from '@arkade-os/swap'

/**
 * The transport is the package's; the lifetime and the error text are ours.
 * Mocking the factory keeps this about the cache — no relay, no sockets, and
 * no re-testing behaviour that `vendored @arkade-os/swap/nostr` already covers.
 */
const nostrRfqTransport = vi.hoisted(() => vi.fn())
vi.mock('@arkade-os/swap/nostr', () => ({ nostrRfqTransport }))

const { friendlyRfqError, rfqTransportCache } = await import('../../lib/nostrRfq')

const market = (overrides: Record<string, unknown> = {}): DiscoveredMarket =>
  ({
    discovery_pubkey: 'aa'.repeat(32),
    transports: { nostr: { relays: ['wss://relay.test', 'wss://relay.two'] } },
    ...overrides,
  }) as unknown as DiscoveredMarket

let close: ReturnType<typeof vi.fn>

beforeEach(() => {
  close = vi.fn().mockResolvedValue(undefined)
  nostrRfqTransport.mockReset().mockImplementation(() => ({ close }) as unknown as RfqTransport)
})

describe('rfqTransportCache', () => {
  it('flattens the market rendezvous into the package options', () => {
    rfqTransportCache(5_000).transportFor(market())
    // The card nests relays under `transports.nostr`; the package takes a flat
    // list. A regression here reads as "no solver available", not as a type error.
    expect(nostrRfqTransport).toHaveBeenCalledWith({
      relays: ['wss://relay.test', 'wss://relay.two'],
      solverPubkey: 'aa'.repeat(32),
      timeoutMs: 5_000,
    })
  })

  it('opens one transport per rendezvous, however many quotes ask for it', () => {
    // The reason the cache exists: the client asks per quote, and the receive
    // screen re-quotes on every keystroke-debounced amount change. A transport
    // per call would open and abandon a relay subscription each time.
    const cache = rfqTransportCache()
    const first = cache.transportFor(market())
    expect(cache.transportFor(market())).toBe(first)
    // A reordered relay list is the same rendezvous, not a second one.
    expect(
      cache.transportFor(market({ transports: { nostr: { relays: ['wss://relay.two', 'wss://relay.test'] } } })),
    ).toBe(first)
    expect(nostrRfqTransport).toHaveBeenCalledOnce()
  })

  it('keeps a second solver on its own transport', () => {
    const cache = rfqTransportCache()
    const first = cache.transportFor(market())
    expect(cache.transportFor(market({ discovery_pubkey: 'bb'.repeat(32) }))).not.toBe(first)
  })

  it('refuses a market with no rendezvous rather than building a transport to nowhere', () => {
    const cache = rfqTransportCache()
    expect(() => cache.transportFor(market({ discovery_pubkey: undefined }))).toThrow(/no Nostr rendezvous/)
    expect(() => cache.transportFor(market({ transports: undefined }))).toThrow(/no Nostr rendezvous/)
    expect(() => cache.transportFor(market({ transports: { nostr: { relays: [] } } }))).toThrow(/no Nostr rendezvous/)
  })

  it('closes every transport it opened, once', async () => {
    // The whole point of holding them: nothing else would, and the client never
    // closes what `transportFor` hands it. Draining the map means a second
    // teardown is a no-op rather than a second CLOSE frame (ts-sdk#736).
    const cache = rfqTransportCache()
    cache.transportFor(market())
    cache.transportFor(market({ discovery_pubkey: 'bb'.repeat(32) }))

    await cache.closeAll()
    await cache.closeAll()

    expect(close).toHaveBeenCalledTimes(2)
  })

  it('survives a transport that fails to close', async () => {
    // A teardown failure must not strand the others, nor reject the client's
    // own stop.
    close.mockRejectedValue(new Error('socket already gone'))
    const cache = rfqTransportCache()
    cache.transportFor(market())

    await expect(cache.closeAll()).resolves.toBeUndefined()
  })
})

describe('friendlyRfqError', () => {
  it('rewrites the package timeout into something a user can act on', () => {
    expect(friendlyRfqError(new Error('no solver reply within 30000ms'))).toMatchObject({
      message: 'Lightning solver is not responding (waited 30s) — try again later',
    })
  })

  it('names the caller-supplied timeout, not the package default', () => {
    expect(friendlyRfqError(new Error('no solver reply within 5000ms'), 5_000)).toMatchObject({
      message: expect.stringContaining('waited 5s'),
    })
  })

  it('leaves every other failure untouched', () => {
    // A refusal or a bad quote carries its own message; widening the rewrite to
    // catch those would replace a specific cause with a misleading one.
    const refused = new Error('solver refused: insufficient_liquidity')
    expect(friendlyRfqError(refused)).toBe(refused)
  })
})
