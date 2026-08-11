// @vitest-environment node
// nostr-tools pins its own @noble/hashes 1.3.1, whose concatBytes does an
// `instanceof Uint8Array` check; under jsdom the encoder's output comes from
// another realm and fails it ("Uint8Array expected"). The transport itself is
// environment-agnostic, so the test runs under node where realms agree.
import { describe, it, expect } from 'vitest'
import { generateSecretKey, getPublicKey } from 'nostr-tools'
import { RFQ_AD_KIND, RFQ_DIRECTED_KIND, nostrRfqTransport } from '@arkade-os/swap/nostr'

/**
 * The transport itself moved into `@arkade-os/swap`, where its behaviour —
 * quotes, refusals, reply correlation, relay loss, timeouts — is covered by the
 * package's own suite. Duplicating those assertions here would only test the
 * vendored copy of somebody else's tested code.
 *
 * What is still THIS repo's problem is the wiring, and it has a failure mode
 * that nothing upstream can catch: the wallet pins `@arkade-os/swap` as a
 * vendored tarball, so a re-vendor that packs an older build, drops the
 * `./nostr` subpath from `exports`, or lands without `nostr-tools` resolvable
 * breaks the import at runtime while every SDK test stays green. These are the
 * assertions that fail loudly when the tarball is wrong.
 */
describe('vendored @arkade-os/swap/nostr', () => {
  it('exposes the transport through the subpath export', () => {
    expect(typeof nostrRfqTransport).toBe('function')
  })

  it('publishes on a kind inside the NIP-01 ephemeral range', () => {
    // Not a restatement of the package's own range test: this asserts the
    // TARBALL currently vendored carries a post-ephemeral build. A stale
    // vendor would still export a working transport, on kind 4859, and
    // simply never see the solver.
    expect(RFQ_DIRECTED_KIND).toBeGreaterThanOrEqual(20_000)
    expect(RFQ_DIRECTED_KIND).toBeLessThan(30_000)
  })

  it('keeps the solver ad addressable, not ephemeral', () => {
    expect(RFQ_AD_KIND).toBeGreaterThanOrEqual(30_000)
    expect(RFQ_AD_KIND).toBeLessThan(40_000)
  })

  it('constructs against an injected pool without touching the network', () => {
    // Proves the optional peer (`nostr-tools`) actually resolves from this
    // repo — the subpath imports it directly, so a missing or mismatched
    // peer fails here rather than the first time a user sends.
    const subscribed: unknown[] = []
    const pool = {
      subscribeMany(_relays: string[], filter: unknown) {
        subscribed.push(filter)
        return { close: () => {} }
      },
      publish: () => [Promise.resolve('ok')],
      close() {},
    }
    const secretKey = generateSecretKey()
    const transport = nostrRfqTransport({
      relays: ['wss://example.invalid'],
      solverPubkey: getPublicKey(generateSecretKey()),
      secretKey,
      pool: pool as never,
    })

    expect(subscribed).toHaveLength(1)
    expect(subscribed[0]).toMatchObject({
      kinds: [RFQ_DIRECTED_KIND],
      '#p': [getPublicKey(secretKey)],
    })
    return transport.close()
  })
})
