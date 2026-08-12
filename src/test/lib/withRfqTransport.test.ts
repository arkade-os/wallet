import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RfqTransport } from '@arkade-os/swap'

/**
 * The transport is the package's; the lifecycle and the error text are ours.
 * Mocking the factory keeps this about the wrapper — no relay, no sockets, and
 * no re-testing behaviour that `vendored @arkade-os/swap/nostr` already covers.
 */
const nostrRfqTransport = vi.hoisted(() => vi.fn())
vi.mock('@arkade-os/swap/nostr', () => ({ nostrRfqTransport }))

const { withRfqTransport } = await import('../../lib/nostrRfq')

const rendezvous = {
  solverPubkey: 'aa'.repeat(32),
  transports: { nostr: { relays: ['wss://relay.test'] } },
}

let close: ReturnType<typeof vi.fn>

beforeEach(() => {
  close = vi.fn().mockResolvedValue(undefined)
  nostrRfqTransport.mockReset().mockReturnValue({ close } as unknown as RfqTransport)
})

describe('withRfqTransport', () => {
  it('flattens the rendezvous into the package options', async () => {
    await withRfqTransport(rendezvous, async () => 'ok', { timeoutMs: 5_000 })
    // The card nests relays under `transports.nostr`; the package takes a flat
    // list. A regression here reads as "no solver available", not as a type error.
    expect(nostrRfqTransport).toHaveBeenCalledWith({
      relays: ['wss://relay.test'],
      solverPubkey: rendezvous.solverPubkey,
      timeoutMs: 5_000,
    })
  })

  it('closes the transport on success and on failure', async () => {
    await withRfqTransport(rendezvous, async () => 'ok')
    expect(close).toHaveBeenCalledTimes(1)

    await expect(withRfqTransport(rendezvous, async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(close).toHaveBeenCalledTimes(2)
  })

  it('does not let a teardown failure mask the result', async () => {
    close.mockRejectedValue(new Error('relay already gone'))
    await expect(withRfqTransport(rendezvous, async () => 'ok')).resolves.toBe('ok')
  })

  it('rewrites the package timeout into something a user can act on', async () => {
    const timedOut = () => Promise.reject(new Error('no solver reply within 30000ms'))
    await expect(withRfqTransport(rendezvous, timedOut)).rejects.toThrow(
      'Lightning solver is not responding (waited 30s) — try again later',
    )
  })

  it('names the caller-supplied timeout, not the package default', async () => {
    const timedOut = () => Promise.reject(new Error('no solver reply within 5000ms'))
    await expect(withRfqTransport(rendezvous, timedOut, { timeoutMs: 5_000 })).rejects.toThrow('waited 5s')
  })

  it('leaves every other failure untouched', async () => {
    // A refusal or a bad quote carries its own message; widening the rewrite to
    // catch those would replace a specific cause with a misleading one.
    const refused = () => Promise.reject(new Error('solver refused: insufficient_liquidity'))
    await expect(withRfqTransport(rendezvous, refused)).rejects.toThrow('solver refused: insufficient_liquidity')
  })
})
