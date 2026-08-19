import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ArkAddress, type ProvisionedKey } from '@arkade-os/sdk'
import { RFQ_SWAP_RETENTION_SECONDS, type LockupContractReader } from '@arkade-os/swap'
import {
  fundingTxidOf,
  graftLnSends,
  lnSendSwap,
  lnSendActivityInputs,
  lnSendSwapRecord,
  lnSendViews,
  recordSpendTxid,
  restoreLnSendSwaps,
  saveRecord,
  saveSwapUpdate,
  spendTxidOf,
  type LnSendRecordInput,
} from '../../lib/lnSendRecords'
import { assetSwapRepository as repository } from '../../lib/swapRepository'
import type { Tx } from '../../lib/types'

// jsdom has no IndexedDB, and these tests are about what the wallet stores,
// not about the backend it stores in
vi.mock('../../lib/swapRepository', async () => {
  const { InMemoryAssetSwapRepository } = await vi.importActual<typeof import('@arkade-os/swap')>('@arkade-os/swap')
  return { assetSwapRepository: new InMemoryAssetSwapRepository() }
})

const LOCKUP =
  'tark1qplnj2gett9j483fchy6chaxn4y52c4g7n5djh9xua3ywdxw0ldatc3e9xcj9xpx0r5tmr0dgvu2f4s352muklg0tcxx0scnnkraajy9jgz4xl'
// Taken from the address rather than written out: `createRfqSwapRecord` refuses
// a record whose funded address and watched script are not the same covenant,
// which is exactly the check being relied on here. The rest of the covenant is
// the contract row's business, not this store's.
const script = {
  pkScript: ArkAddress.decode(LOCKUP).pkScript,
  options: { refundLocktime: BigInt(1_700_000_600) },
} as LnSendRecordInput['script']

const secrets: ProvisionedKey = { pubkey: new Uint8Array(32).fill(0xab), descriptor: 'wpkh(...)/0' }

const RFQ_ID = 'a'.repeat(64)

const input = (over: Partial<LnSendRecordInput> = {}): LnSendRecordInput => ({
  rfqId: RFQ_ID,
  lockupAddress: LOCKUP,
  script,
  paymentHash: 'b'.repeat(64),
  secrets,
  amount: 1_030,
  fundingTxid: 'funding-txid',
  ...over,
})

const store = async (over: Partial<LnSendRecordInput> = {}, patch: Record<string, unknown> = {}) => {
  const record = { ...lnSendSwapRecord(input(over), 1_700_000_000), ...patch }
  await saveRecord(record)
  return record
}

const stored = async () => (await repository.getAllRfqSwaps())[0]

beforeEach(async () => {
  for (const record of await repository.getAllRfqSwaps()) await repository.removeRfqSwap(record.rfqId)
})

describe('lnSendSwapRecord', () => {
  it('takes the refund deadline from the covenant, not from the quote', () => {
    // The covenant binds it, the quote only proposed it and may omit it — and
    // `rebuildRfqSwap` reads it off the covenant after a restart, so a record
    // written from the quote would disagree with its own restored self. A
    // missing value would read as a refund window that opened at the epoch.
    expect(lnSendSwap(input()).refundLocktime).toBe(1_700_000_600)
  })

  it('records the funding txid, the hashlock and the signer', () => {
    const record = lnSendSwapRecord(input(), 1_700_000_000)

    expect(record).toMatchObject({
      rfqId: RFQ_ID,
      kind: 'lightning_send',
      state: 'pending',
      lockupAddress: LOCKUP,
      amount: 1_030,
      createdAt: 1_700_000_000,
    })
    // The funding txid has no field of its own on the record — grouping reads
    // it back off the profile, so it has to survive the corridor handler's own
    // projection.
    expect(fundingTxidOf(record)).toBe('funding-txid')
    expect(record.profile.hashlock).toMatchObject({ paymentHash: 'b'.repeat(64) })
    // What a refund push needs: without it the manager can watch the swap but
    // never take the money back.
    expect(record.profile.signer).toMatchObject({ signingDescriptor: 'wpkh(...)/0' })
  })

  it('refuses a record whose lockup address is not the script it watches', () => {
    const wrong = { ...script, pkScript: new Uint8Array(34).fill(0xcd) } as LnSendRecordInput['script']
    expect(() => lnSendSwapRecord(input({ script: wrong }))).toThrow(/not the same swap/)
  })
})

describe('saveSwapUpdate', () => {
  it('takes the manager’s state and keeps the origin the record was written with', async () => {
    const record = await store()

    await saveSwapUpdate({
      kind: 'lightning_send',
      rfqId: RFQ_ID,
      state: 'refunded',
      lockupPkScript: script.pkScript,
      paymentHash: record.profile.hashlock ? 'b'.repeat(64) : '',
      refundLocktime: 1_700_000_600,
      createdAt: 1_700_000_000,
      updatedAt: 1_700_000_900,
      refundArkTxid: 'our-refund-txid',
    })

    const next = await stored()
    expect(next.state).toBe('refunded')
    expect(next.refundArkTxid).toBe('our-refund-txid')
    // the origin half, profile included — where both txids live
    expect(fundingTxidOf(next)).toBe('funding-txid')
    expect(next.lockupAddress).toBe(LOCKUP)
  })

  it('does not write a half-formed record for a swap the store never saw', async () => {
    await saveSwapUpdate({
      kind: 'lightning_send',
      rfqId: 'f'.repeat(64),
      state: 'settled',
      lockupPkScript: script.pkScript,
      paymentHash: 'b'.repeat(64),
      refundLocktime: 1,
      createdAt: 1,
      updatedAt: 2,
    })

    expect(await repository.getAllRfqSwaps()).toEqual([])
  })
})

describe('the spend that ended a swap', () => {
  it('prefers a refund this wallet pushed over one it merely observed', async () => {
    const record = await store({}, { refundArkTxid: 'our-refund-txid' })
    await saveRecord({ ...record, profile: { ...record.profile, spend_txid: 'observed-txid' } })

    expect(spendTxidOf(await stored())).toBe('our-refund-txid')
  })

  it('records an observed spend once, and never rewrites it', async () => {
    await store()

    await recordSpendTxid(RFQ_ID, 'solver-refund-txid')
    await recordSpendTxid(RFQ_ID, 'something-else')

    expect(spendTxidOf(await stored())).toBe('solver-refund-txid')
  })
})

describe('lnSendActivityInputs', () => {
  it('names the refund only for a swap that came back', async () => {
    await store({}, { state: 'refunded' })
    await recordSpendTxid(RFQ_ID, 'refund-txid')

    expect(await lnSendActivityInputs()).toEqual([
      { rfqId: RFQ_ID, kind: 'lightning_send', state: 'refunded', txids: ['funding-txid', 'refund-txid'] },
    ])
  })

  it('leaves a settled send’s spend out — it pays the solver, not us', async () => {
    await store({}, { state: 'settled' })
    await recordSpendTxid(RFQ_ID, 'solver-claim-txid')

    expect(await lnSendActivityInputs()).toEqual([
      { rfqId: RFQ_ID, kind: 'lightning_send', state: 'settled', txids: ['funding-txid'] },
    ])
  })

  it('drops a record with no funding txid rather than grouping nothing', async () => {
    const record = await store()
    await saveRecord({ ...record, profile: { ...record.profile, funding_txid: undefined } })

    expect(await lnSendActivityInputs()).toEqual([])
    expect(await lnSendViews()).toEqual([])
  })
})

describe('restoreLnSendSwaps', () => {
  // Every rebuild needs the lockup's contract row; a wallet without one is the
  // case these tests are about, so the reader answers with none.
  const noContracts: LockupContractReader = { getContracts: async () => [] }

  it('keeps a live swap on file even when its covenant cannot be rebuilt', async () => {
    await store()

    expect(await restoreLnSendSwaps(noContracts, 1_700_000_000)).toEqual([])
    // skipped, not deleted: it is still the history of a real payment
    expect(await repository.getAllRfqSwaps()).toHaveLength(1)
  })

  it('asks nothing of a swap that already ended', async () => {
    await store({}, { state: 'settled' })
    let asked = false

    await restoreLnSendSwaps({ getContracts: async () => ((asked = true), []) }, 1_700_000_000)

    expect(asked).toBe(false)
  })

  it('drops a terminal record once it is past retention', async () => {
    await store({}, { state: 'settled', updatedAt: 1_700_000_000 })

    await restoreLnSendSwaps(noContracts, 1_700_000_000 + RFQ_SWAP_RETENTION_SECONDS + 1)

    expect(await repository.getAllRfqSwaps()).toEqual([])
  })
})

describe('graftLnSends', () => {
  const row = (redeemTxid: string): Tx => ({ ...({} as Tx), redeemTxid })

  it('marks the funding row as the swap it belongs to', () => {
    const [funding, other] = graftLnSends(
      [row('funding-txid'), row('unrelated-txid')],
      [{ rfqId: RFQ_ID, fundingTxid: 'funding-txid', state: 'refunded', spendTxid: 'refund-txid' }],
    )

    // What the chain-built row cannot say on its own: this outgoing payment is
    // a swap, and this is the tx that ended it.
    expect(funding.lnSwap).toEqual({ state: 'refunded', fundingTxid: 'funding-txid', spendTxid: 'refund-txid' })
    expect(other.lnSwap).toBeUndefined()
  })

  it('returns the rows untouched when there are no records', () => {
    const rows = [row('funding-txid')]
    expect(graftLnSends(rows, [])).toBe(rows)
  })
})
