import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ArkAddress, type ProvisionedKey } from '@arkade-os/sdk'
import { RFQ_SWAP_RETENTION_SECONDS, type LockupContractReader } from '@arkade-os/swap'
import {
  fundingTxidOf,
  lnSendSwapRecord,
  lnSendViews,
  recordSpendTxid,
  restoreLnSendSwaps,
  saveRecord,
  saveSwapUpdate,
  spendTxidOf,
  swapActivityInputs,
  type LnSendRecordInput,
} from '../../lib/lnSendRecords'
import { assetSwapRepository as repository } from '../../lib/swapRepository'

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
const script = { pkScript: ArkAddress.decode(LOCKUP).pkScript } as LnSendRecordInput['script']

const secrets: ProvisionedKey = { pubkey: new Uint8Array(32).fill(0xab), descriptor: 'wpkh(...)/0' }

const RFQ_ID = 'a'.repeat(64)

const input = (over: Partial<LnSendRecordInput> = {}): LnSendRecordInput => ({
  rfqId: RFQ_ID,
  lockupAddress: LOCKUP,
  script,
  paymentHash: 'b'.repeat(64),
  refundLocktime: 1_700_000_600,
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
    const wrong = { pkScript: new Uint8Array(34).fill(0xcd) } as LnSendRecordInput['script']
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

/**
 * The hand-rolled `lnSendActivityInputs` is gone; `rfqSwapActivityInputs` reads
 * the store instead. That only works if the txids are on the record's OWN
 * fields — the lightning-send corridor has no `activityTxids`, so a funding
 * txid parked under a wallet-private profile key would group nothing.
 */
describe('swapActivityInputs', () => {
  const inputs = () => swapActivityInputs()

  it('finds the funding txid on the record, not under a profile key of ours', async () => {
    await store()

    expect(await inputs()).toEqual([
      { rfqId: RFQ_ID, kind: 'lightning_send', state: 'pending', txids: ['funding-txid'] },
    ])
  })

  it('merges in the solver-pushed refund the package reader cannot see', async () => {
    // `spend_txid` is this file's own key and stays there: the record's
    // `lockupSpendArkTxids` is stripped and refilled from the live swap on
    // every manager pass, so a value written to it would not survive.
    await store({}, { state: 'refunded' })
    await recordSpendTxid(RFQ_ID, 'refund-txid')

    const [input] = await inputs()
    expect(input.state).toBe('refunded')
    expect([...input.txids].sort()).toEqual(['funding-txid', 'refund-txid'])
  })

  it('gives the row builder nothing for a record with no funding txid', async () => {
    // Neither the record's own field nor the legacy profile key. There is no
    // transaction to anchor a row on, and a view without one would name a
    // lockup that does not exist.
    const record = await store()
    await saveRecord({ ...record, fundingArkTxid: undefined, profile: { ...record.profile, funding_txid: undefined } })

    expect(await lnSendViews()).toEqual([])
  })

  it('leaves a settled send’s spend out — it pays the solver, not us', async () => {
    await store({}, { state: 'settled' })
    await recordSpendTxid(RFQ_ID, 'solver-claim-txid')

    const [input] = await inputs()
    expect(input.txids).not.toContain('solver-claim-txid')
  })

  it('costs no indexer call once the manager has stamped the spend', async () => {
    const record = await store({}, { state: 'settled' })
    await saveRecord({ ...record, lockupSpendArkTxids: ['solver-claim-txid'] })
    let asked = false
    const indexer = { getVtxos: async () => ((asked = true), { vtxos: [] }) }

    const [input] = await swapActivityInputs(indexer as never)

    // Funding on the record, spend stamped by the manager from the chain read
    // that ended the swap — nothing left to ask for. Without the stamp a
    // terminal swap pays a lockup read for a permanent fact.
    expect(asked).toBe(false)
    expect([...input.txids].sort()).toEqual(['funding-txid', 'solver-claim-txid'])
  })

  it('survives an indexer that throws, rather than losing every row to it', async () => {
    // The lookup is a backfill for what a record cannot answer. One that fails
    // costs that record its extra txids and nothing else.
    const record = await store({}, { state: 'settled' })
    await saveRecord({ ...record, fundingArkTxid: undefined })
    const indexer = {
      getVtxos: async () => {
        throw new Error('indexer down')
      },
    }

    await expect(swapActivityInputs(indexer as never)).resolves.toHaveLength(1)
  })
})

describe('lnSendViews', () => {
  it('carries what a row needs when history reports no transaction at all', async () => {
    // The funding tx nets to zero against the lockup output the wallet also
    // owns, so Arkade's history emits nothing for it and the row is built from
    // this view instead — see `ungroupedLnSendTx`.
    await store()

    expect(await lnSendViews()).toEqual([
      {
        rfqId: RFQ_ID,
        fundingTxid: 'funding-txid',
        state: 'pending',
        amount: 1_030,
        createdAt: 1_700_000_000,
        spendTxid: undefined,
      },
    ])
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
