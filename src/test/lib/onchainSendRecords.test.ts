// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { hex } from '@scure/base'
import { rfqClaimSecretOf, rfqSignerOf, rfqSwapOriginOf } from '@arkade-os/swap'
import { onchainSendSwap, onchainSendSwapRecord, type OnchainSendRecordInput } from '../../lib/onchainSendRecords'
import { claimPayoutScript } from '../../lib/onchainPayout'

/**
 * The onchain-send record, read back through the package's OWN readers.
 *
 * This corridor is the one whose contract parameters live nowhere else: the
 * Arkade lockup has a contract row `rebuildRfqSwap` can restore from, but the
 * L1 HTLC is a Bitcoin output — `OnchainHtlc` exposes only derived values and
 * never the keys it was built from. A field dropped on the way into the profile
 * is therefore not recoverable, and it does not fail loudly: the swap restores,
 * derives a different (perfectly valid) HTLC, and watches an address nobody
 * funded until the claim window shuts.
 *
 * So the assertions go through `onchainSendProfile`, `rfqSignerOf` and
 * `rfqClaimSecretOf` rather than reading the object literally — the point is
 * that the package can find what this file wrote, not that the keys are spelled
 * the way this file expects.
 */
const PAYMENT_HASH = 'ab'.repeat(32)
const LOCKUP_PKSCRIPT = '5120eb8a98f2d02e6fc0ea1a8802a4510dde5cafcabf1abeb0bf9cc3a568466f669a'
const CLAIM_KEY = Uint8Array.from({ length: 32 }, (_, i) => i + 1)
const REFUND_KEY = Uint8Array.from({ length: 32 }, (_, i) => i + 100)

const input: OnchainSendRecordInput = {
  rfqId: 'rfq-onchain-1',
  lockupAddress:
    'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
    'h6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen',
  amount: 50_000,
  paymentHash: PAYMENT_HASH,
  refundLocktime: 1_800_000_000,
  secrets: {
    descriptor: 'tr(deadbeef)',
    pubkey: new Uint8Array(32),
    preimage: new Uint8Array(32),
    paymentHash: new Uint8Array(32),
    mustPersistPreimage: false,
  } as unknown as OnchainSendRecordInput['secrets'],
  // Must be the address's OWN script: `createRfqSwapRecord` cross-checks the
  // two and refuses a record whose covenant does not derive the address it
  // claims to have funded.
  script: { pkScript: hex.decode(LOCKUP_PKSCRIPT) } as unknown as OnchainSendRecordInput['script'],
  htlc: { address: 'bcrt1htlcaddress' } as unknown as OnchainSendRecordInput['htlc'],
  htlcParams: {
    paymentHash: PAYMENT_HASH,
    claimKey: CLAIM_KEY,
    refundKey: REFUND_KEY,
    // The L1 deadline, which must land under a DIFFERENT key than the Arkade
    // lockup's `refundLocktime` — they are different clocks.
    refundLocktime: 1_700_000_000,
  },
  l1Network: 'regtest',
  minConfirmations: 2,
  payoutPkScript: hex.decode('0014610928cd26e42a6d1801e9d4718b16d67cd954b1'),
}

describe('onchainSendSwapRecord', () => {
  const profile = () => onchainSendSwapRecord(input).profile as Record<string, unknown>

  it('carries every L1 parameter the HTLC cannot be rebuilt without', () => {
    expect(profile()).toMatchObject({
      claimKey: Buffer.from(CLAIM_KEY).toString('hex'),
      refundKey: Buffer.from(REFUND_KEY).toString('hex'),
      network: 'regtest',
      htlcAddress: 'bcrt1htlcaddress',
      minConfirmations: 2,
    })
  })

  it('keeps the two deadlines apart', () => {
    // `htlcParams.refundLocktime` becomes `htlcLocktime` because the record
    // already has a `refundLocktime` and it is the ARKADE lockup's. Collapsing
    // them would arm the wrong clock on whichever leg lost.
    const record = onchainSendSwapRecord(input)
    expect(record.profile.htlcLocktime).toBe(1_700_000_000)
    expect(onchainSendSwap(input).refundLocktime).toBe(1_800_000_000)
  })

  it('stores the address the rebuild checks its own derivation against', () => {
    // The only check available on a leg with no second copy of its covenant.
    expect(profile().htlcAddress).toBe('bcrt1htlcaddress')
  })

  it('lets the package find the signer and the claim secret it wrote', () => {
    const record = onchainSendSwapRecord(input)
    expect(rfqSignerOf(record)?.signingDescriptor).toBe('tr(deadbeef)')
    expect(rfqClaimSecretOf(record)?.paymentHash).toBe(PAYMENT_HASH)
  })

  it('names the funding transaction only once there is one', () => {
    // The record written BEFORE funding has no txid to name, and inventing an
    // empty one would group the activity against a transaction that is not a
    // transaction.
    expect(onchainSendSwapRecord(input).fundingArkTxid).toBeUndefined()
    const funded = onchainSendSwapRecord({ ...input, fundingTxid: 'funding-txid' })
    expect(funded.fundingArkTxid).toBe('funding-txid')
    expect(rfqSwapOriginOf(funded).fundingArkTxid).toBe('funding-txid')
  })

  it('carries the recipient script the claim must pay to', () => {
    // Not on `OnchainSendProfile`: the claim transaction's output is the
    // spender's own choice and the package records it nowhere, so a swap
    // restored without this key has no destination but this wallet's own.
    expect(profile().payout_pkscript).toBe('0014610928cd26e42a6d1801e9d4718b16d67cd954b1')
    expect(claimPayoutScript(onchainSendSwapRecord(input).profile)).toEqual(input.payoutPkScript)
  })

  it('refuses to claim a record that lost its payout script', () => {
    // Paying somewhere else is not reversible; losing the fill is. The solver
    // takes its L1 refund and the Arkade lockup returns to the user.
    expect(() => claimPayoutScript({})).toThrow(/refusing to claim/)
  })

  it('is an onchain_send from the first write, so the right handler drives it', () => {
    expect(onchainSendSwapRecord(input).kind).toBe('onchain_send')
    expect(onchainSendSwap(input).kind).toBe('onchain_send')
  })
})
