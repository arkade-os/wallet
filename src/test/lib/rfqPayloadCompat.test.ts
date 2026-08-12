// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { lightningSendRequest } from '@arkade-os/swap'

/**
 * Wire-compatibility guard for the `arkade:BTC -> lightning:BTC` rfq_request.
 *
 * This corridor failed in production as `solver refused: unsupported_payload`,
 * and that refusal is worth understanding precisely, because its name invites
 * exactly the wrong fix. The solver validates the request with a Zod schema
 * that is `.strict()` at BOTH levels — envelope and profile — so ANY key it
 * does not know is refused, and every such refusal collapses onto that one
 * reason string. `unsupported_payload` therefore does not mean "this field is
 * forbidden"; it means "our two field sets differ", with no indication of which
 * side is behind. The failure is symmetric and the reason string cannot break
 * the tie.
 *
 * Here the tie is broken by the solver's own source: `client_refund_pubkey` is
 * REQUIRED on `main` (arkade-os/lightning-swap-service, `src/wire/payloads.ts`),
 * added 2026-08-06 with the covenant work that consumes it. A wallet that
 * dropped the field to appease the deployed build would not become compatible —
 * it would swap a refusal for a refusal, and be refused by every solver running
 * current code. The deployed instance is simply older than its own repo.
 *
 * So the tests below pin the field IN, and pin the key sets to exactly what the
 * schema admits. They fail on drift in either direction: dropping a required
 * key, or adding one a strict schema would refuse.
 */

/** The profile keys `RfqRequest.profile` admits — all three required. */
const SOLVER_PROFILE_KEYS = ['invoice', 'refund_address', 'client_refund_pubkey'].sort()

/** The envelope keys `RfqRequest` admits; `amount` is its only optional one. */
const SOLVER_ENVELOPE_KEYS = ['v', 'type', 'rfq_id', 'pair', 'amount_side', 'profile'].sort()

// A regtest-shaped placeholder. Never a real invoice: these tests must stay
// safe to run and safe to paste into a failure report.
const INVOICE = 'lnbcrt1u1pexampleplaceholderinvoicenotreal'
const REFUND_ADDRESS = 'tark1qexamplerefundaddressnotreal'
const SENDER_PUBKEY = new Uint8Array(32).fill(0xab)

const request = () =>
  lightningSendRequest({
    rfqId: 'a'.repeat(64),
    invoice: INVOICE,
    refundAddress: REFUND_ADDRESS,
    senderPubkey: SENDER_PUBKEY,
  })

describe('lightning-send rfq_request wire compatibility', () => {
  it('sends exactly the envelope keys the solver schema admits', () => {
    // Exact, not superset: the schema is strict, so an extra key is refused
    // just as hard as a missing one is.
    expect(Object.keys(request()).sort()).toEqual(SOLVER_ENVELOPE_KEYS)
  })

  it('sends exactly the profile keys the solver schema admits', () => {
    const profile = request().profile as Record<string, unknown>
    expect(Object.keys(profile).sort()).toEqual(SOLVER_PROFILE_KEYS)
  })

  it('keeps client_refund_pubkey, which current solvers require', () => {
    // The regression this file exists for. Removing it to satisfy the
    // deployed build would break against the solver's own main branch.
    const profile = request().profile as Record<string, unknown>
    expect(profile.client_refund_pubkey).toBe('ab'.repeat(32))
  })

  it('encodes client_refund_pubkey as 64 lowercase hex, x-only', () => {
    // The solver's field is `z.string().length(64).regex(/^[0-9a-f]{64}$/)`:
    // a compressed 33-byte key or uppercase hex is refused as the same
    // `unsupported_payload`, so the encoding is part of the contract.
    const profile = request().profile as Record<string, unknown>
    expect(profile.client_refund_pubkey).toMatch(/^[0-9a-f]{64}$/)
  })

  it('quotes exact-out and restates no amount, since the invoice fixes it', () => {
    // `amount` is optional on the envelope, but when present the solver checks
    // it against the decoded invoice — so omitting it is one fewer way to be
    // refused, and BOLT11 is always exact-out.
    const payload = request()
    expect(payload.amount_side).toBe('to')
    expect(payload).not.toHaveProperty('amount')
    // Directional `->`, not the card's `/`-joined display pair: the request
    // names a leg, and the solver matches this string to decide it serves it.
    expect(payload.pair).toBe('arkade:BTC->lightning:BTC')
  })

  it('survives a JSON round-trip unchanged, which is what the relay carries', () => {
    // The transport NIP-44-encrypts `JSON.stringify(payload)`; the solver
    // validates what comes back out. Anything non-JSON-representable would
    // reach the schema as a different shape than asserted above.
    const payload = request()
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload)
  })
})
