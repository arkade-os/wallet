// @vitest-environment node
// nostr-tools pins its own @noble/hashes 1.3.1, whose concatBytes does an
// `instanceof Uint8Array` check; under jsdom the encoder's output comes from
// another realm and fails it ("Uint8Array expected"). The transport itself is
// environment-agnostic, so the test runs under node where realms agree.
import { SwapRefusal } from '@arkade-os/swap'
import { describe, it, expect } from 'vitest'
import { generateSecretKey, getPublicKey, nip44, type Event } from 'nostr-tools'
import { RFQ_AD_KIND, RFQ_DIRECTED_KIND, RelayUnavailable, nostrRfqTransport } from '../../lib/nostrRfq'

/**
 * A stand-in for SimplePool that behaves like a relay the solver is also on:
 * it decrypts what the client publishes and lets the test answer as the solver.
 */
const fakePool = (solverSecret: Uint8Array, clientPubkeyOf: (e: Event) => string) => {
  let onevent: ((e: Event) => void) | undefined
  let onclose: ((reasons: string[]) => void) | undefined
  const published: unknown[] = []
  const pool = {
    subscribeMany(
      _relays: string[],
      _filter: unknown,
      params: { onevent: (e: Event) => void; onclose?: (reasons: string[]) => void },
    ) {
      onevent = params.onevent
      onclose = params.onclose
      return { close: () => {} }
    },
    publish(_relays: string[], event: Event) {
      const key = nip44.v2.utils.getConversationKey(solverSecret, event.pubkey)
      published.push(JSON.parse(nip44.v2.decrypt(event.content, key)))
      return [Promise.resolve('ok')]
    },
    close() {},
  }
  /** Answer as the solver, encrypted to the client that published last. */
  const solverReplies = (clientPubkey: string, payload: unknown) => {
    const key = nip44.v2.utils.getConversationKey(solverSecret, clientPubkey)
    onevent?.({
      kind: RFQ_DIRECTED_KIND,
      pubkey: getPublicKey(solverSecret),
      content: nip44.v2.encrypt(JSON.stringify(payload), key),
      tags: [['p', clientPubkey]],
      created_at: Math.floor(Date.now() / 1000),
      id: 'x',
      sig: 'x',
    } as unknown as Event)
  }
  /** The relay drops every connection, as the live relay was observed to do. */
  const relaysDrop = (reasons: string[] = ['connection failed']) => onclose?.(reasons)
  return { pool, published, solverReplies, relaysDrop, clientPubkeyOf }
}

describe('RFQ kinds', () => {
  /**
   * The RANGE, not the digits.
   *
   * The exact numbers are provisional in the RFQ spec and may still move by
   * agreement. The range may not: NIP-01 makes 20000–29999 ephemeral, and that
   * is what stops a relay retaining a negotiation. Drifting back into a stored
   * range breaks nothing an eye would catch — every other test in this file
   * goes through the constant and would follow it anywhere — while quietly
   * reinstating a permanent record of who negotiated what with whom.
   */
  it('keeps directed traffic inside the NIP-01 ephemeral range', () => {
    expect(RFQ_DIRECTED_KIND).toBeGreaterThanOrEqual(20_000)
    expect(RFQ_DIRECTED_KIND).toBeLessThan(30_000)
  })

  /**
   * The ad is standing state rather than a message, so it belongs in the
   * addressable range where a relay keeps the current version per solver.
   * Asserted beside the one above so the contrast is on the record: these two
   * kinds want OPPOSITE retention, and neither is a typo of the other.
   */
  it('keeps the solver ad addressable, not ephemeral', () => {
    expect(RFQ_AD_KIND).toBeGreaterThanOrEqual(30_000)
    expect(RFQ_AD_KIND).toBeLessThan(40_000)
  })
})

describe('nostrRfqTransport', () => {
  const solverSecret = generateSecretKey()
  const solverPubkey = getPublicKey(solverSecret)

  const build = () => {
    const clientSecret = generateSecretKey()
    const clientPubkey = getPublicKey(clientSecret)
    const f = fakePool(solverSecret, (e) => e.pubkey)
    const transport = nostrRfqTransport({
      relays: ['wss://relay.test'],
      solverPubkey,
      secretKey: clientSecret,
      pool: f.pool as never,
      timeoutMs: 500,
    })
    return { transport, clientPubkey, ...f }
  }

  it('encrypts the request to the solver and returns the matching quote', async () => {
    const { transport, clientPubkey, published, solverReplies } = build()
    const pending = transport.requestQuote({ v: 1, type: 'rfq_request', rfq_id: 'abc' })
    // The solver could only read this if NIP-44 addressed it correctly.
    expect(published[0]).toMatchObject({ type: 'rfq_request', rfq_id: 'abc' })
    solverReplies(clientPubkey, { v: 1, type: 'rfq_quote', rfq_id: 'abc', solver_pubkey: solverPubkey })
    await expect(pending).resolves.toMatchObject({ type: 'rfq_quote', rfq_id: 'abc' })
    await transport.close()
  })

  it('throws SwapRefusal carrying the closed-set reason', async () => {
    const { transport, clientPubkey, solverReplies } = build()
    const pending = transport.requestQuote({ v: 1, type: 'rfq_request', rfq_id: 'abc' })
    solverReplies(clientPubkey, { v: 1, type: 'rfq_refusal', rfq_id: 'abc', reason: 'amount_out_of_range' })
    await expect(pending).rejects.toBeInstanceOf(SwapRefusal)
    await transport.close()
  })

  it('ignores a reply for a different negotiation', async () => {
    // On a shared relay every solver event lands on the same subscription;
    // accepting one by type alone would answer the wrong swap.
    const { transport, clientPubkey, solverReplies } = build()
    const pending = transport.requestQuote({ v: 1, type: 'rfq_request', rfq_id: 'mine' })
    solverReplies(clientPubkey, { v: 1, type: 'rfq_quote', rfq_id: 'someone-else' })
    await expect(pending).rejects.toThrow(/no solver reply/)
    await transport.close()
  })

  it('times out rather than hanging when the solver never answers', async () => {
    const { transport } = build()
    await expect(transport.requestQuote({ v: 1, type: 'rfq_request', rfq_id: 'abc' })).rejects.toThrow(
      /no solver reply/,
    )
    await transport.close()
  })

  it('blames the relay, not the solver, when every connection drops', async () => {
    // A dropped subscription is silent: nothing will ever arrive on it. Waiting
    // out the timeout would report this as solver silence, which sends whoever
    // debugs the failed payment after the wrong party.
    const { transport, relaysDrop } = build()
    const pending = transport.requestQuote({ v: 1, type: 'rfq_request', rfq_id: 'abc' })
    relaysDrop(['wss://relay.test: connection failed'])
    await expect(pending).rejects.toBeInstanceOf(RelayUnavailable)
    await transport.close()
  })

  it('does not reject in-flight work when the caller closes the transport', async () => {
    // close() closes the subscription, which fires the same onclose. A
    // deliberate teardown must not masquerade as a lost relay.
    const { transport, relaysDrop } = build()
    await transport.close()
    expect(() => relaysDrop()).not.toThrow()
  })

  it('reports no status when the solver has forgotten the negotiation', async () => {
    const { transport, clientPubkey, solverReplies } = build()
    const pending = transport.status('abc')
    solverReplies(clientPubkey, { v: 1, type: 'rfq_refusal', rfq_id: 'abc', reason: 'unknown' })
    await expect(pending).resolves.toBeNull()
    await transport.close()
  })
})
