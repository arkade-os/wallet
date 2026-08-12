// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import { lnReceiveRendezvous, lnSendRendezvous } from '../../lib/lnSwap'
import { covclaimdPubkey } from '../../lib/lnReceive'

/**
 * The two Lightning directions ride the two SIDES of one market: a side bounds
 * what the SOLVER pays out on it, so quote (Lightning) is the send leg and base
 * (arkade) the receive leg. Both selectors otherwise apply identical gates.
 */
const market = (overrides: Record<string, unknown> = {}): DiscoveredMarket =>
  ({
    quote_corridor: 'lightning',
    discovery_pubkey: 'aa'.repeat(32),
    emulator_pubkey: 'cc'.repeat(32),
    transports: { nostr: { relays: ['wss://relay.test'] } },
    min_quote_amount: '500',
    max_quote_amount: '1000',
    min_base_amount: '2000',
    max_base_amount: '9000',
    ...overrides,
  }) as unknown as DiscoveredMarket

describe('lnReceiveRendezvous', () => {
  it('reads the base side, where the solver pays out arkade', () => {
    const rendezvous = lnReceiveRendezvous([market()])
    expect(rendezvous?.minSats).toBe(2000)
    expect(rendezvous?.maxSats).toBe(9000)
    // Same rendezvous data as the send leg — one solver, one relay, one covenant
    // co-signer; only the bounds differ.
    expect(rendezvous?.solverPubkey).toBe(lnSendRendezvous([market()])?.solverPubkey)
    expect(rendezvous?.emulatorPubkey).toBe('cc'.repeat(32))
  })

  it('offers no receive corridor when the base side is disabled', () => {
    // The published card's current state: max "0" means the solver does not pay
    // out arkade, so the direction that receives it must not be offered.
    expect(lnReceiveRendezvous([market({ min_base_amount: '0', max_base_amount: '0' })])).toBeUndefined()
    // ...while the send leg on the very same market stays available.
    expect(lnSendRendezvous([market({ min_base_amount: '0', max_base_amount: '0' })])).toBeDefined()
  })

  it('applies the same rendezvous gates as the send leg', () => {
    expect(lnReceiveRendezvous([market({ emulator_pubkey: undefined })])).toBeUndefined()
    expect(lnReceiveRendezvous([market({ discovery_pubkey: undefined })])).toBeUndefined()
    expect(lnReceiveRendezvous([market({ transports: undefined })])).toBeUndefined()
    expect(lnReceiveRendezvous([market({ quote_corridor: 'onchain' })])).toBeUndefined()
  })
})

describe('covclaimdPubkey', () => {
  const respond = (body: unknown, ok = true) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok,
      status: ok ? 200 : 503,
      json: async () => body,
    } as Response)

  afterEach(() => vi.restoreAllMocks())

  it('returns the compressed key the claim packet seals to', async () => {
    const key = `02${'ab'.repeat(32)}`
    respond({ covclaimd_pub_key: key, emulator_pub_key: `03${'cd'.repeat(32)}` })
    expect(await covclaimdPubkey('http://covclaimd.test/')).toEqual(Uint8Array.from(Buffer.from(key, 'hex')))
  })

  it('rejects an x-only key, which ECIES cannot seal to', async () => {
    // The covenant keys ARE x-only, so the wrong one of the two is easy to
    // wire up and would fail much later, inside the seal.
    respond({ covclaimd_pub_key: 'ab'.repeat(32) })
    await expect(covclaimdPubkey('http://covclaimd.test')).rejects.toThrow(/malformed/)
  })

  it('fails loudly when covclaimd is unreachable', async () => {
    respond({}, false)
    await expect(covclaimdPubkey('http://covclaimd.test')).rejects.toThrow(/unreachable/)
  })
})
