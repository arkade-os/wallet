// @vitest-environment node
import { describe, it, expect } from 'vitest'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import { sealClaimPacket } from '@arkade-os/swap'
import { lnReceiveRendezvous, lnSendRendezvous } from '../../lib/lnSwap'
import { sealingKey } from '../../lib/lnReceive'

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

describe('sealingKey', () => {
  it('is a 33-byte compressed point, the only form ECIES can seal to', async () => {
    const key = sealingKey()
    expect(key).toHaveLength(33)
    expect([0x02, 0x03]).toContain(key[0])
    // The check is the seal itself: sealClaimPacket ECDHs against this key, so
    // a merely well-shaped non-point would fail at request time instead.
    await expect(sealClaimPacket({ preimage: new Uint8Array(32).fill(7), covclaimdPubkey: key })).resolves.toBeDefined()
  })

  it('is fresh per receive, so two lockups are not linkable by their packet', () => {
    // Not an AEAD concern — sealClaimPacket draws its own ephemeral key and
    // nonce each call — but a reused recipient key would tag every receive of
    // this wallet as one payee to anyone collecting RFQ requests.
    expect(sealingKey()).not.toEqual(sealingKey())
  })
})
