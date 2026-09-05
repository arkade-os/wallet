import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ArkAddress, VHTLC, type ProvisionedKey } from '@arkade-os/sdk'
import { createRfqSwapRecord, rfqSecretsProfile, type RfqSwapRecord } from '@arkade-os/swap'
import { lnSendViews, spendTxidOf, swapActivityInputs } from '../../lib/lnSendRecords'
import { assetSwapRepository as repository } from '../../lib/swapRepository'

/**
 * Nothing writes these records any more: the v2 client persists to its own
 * keyspace, and this store is read only for sends made before the wallet moved
 * onto it. What is covered here is that reading half, including the two
 * wallet-private profile keys an older deploy wrote.
 *
 * Fixtures therefore write through the package's own `createRfqSwapRecord`, the
 * same call the client makes — a record built any other way would be testing a
 * shape nothing produces.
 */

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
const script = { pkScript: ArkAddress.decode(LOCKUP).pkScript } as InstanceType<typeof VHTLC.ScriptV2>

const secrets: ProvisionedKey = {
  pubkey: new Uint8Array(32).fill(0xab),
  descriptor: 'wpkh(...)/0',
  pkScript: ArkAddress.decode(LOCKUP).pkScript,
  address: LOCKUP,
}

const RFQ_ID = 'a'.repeat(64)
const PAYMENT_HASH = 'b'.repeat(64)

const record = (nowSeconds = 1_700_000_000): RfqSwapRecord =>
  createRfqSwapRecord(
    {
      kind: 'lightning_send',
      lockupAddress: LOCKUP,
      profile: rfqSecretsProfile(secrets, PAYMENT_HASH),
      amount: 1_030,
      fundingTxid: 'funding-txid',
    },
    {
      kind: 'lightning_send',
      rfqId: RFQ_ID,
      state: 'pending',
      lockupPkScript: script.pkScript,
      lockup: { script, address: LOCKUP },
      paymentHash: PAYMENT_HASH,
      refundLocktime: 1_700_000_600,
      createdAt: nowSeconds,
      updatedAt: nowSeconds,
    },
  )

const saveRecord = async (stored: RfqSwapRecord) => repository.saveRfqSwap(stored)

const store = async (patch: Record<string, unknown> = {}) => {
  const written = { ...record(), ...patch }
  await saveRecord(written)
  return written
}

const stored = async () => (await repository.getAllRfqSwaps())[0]

beforeEach(async () => {
  for (const record of await repository.getAllRfqSwaps()) await repository.removeRfqSwap(record.rfqId)
})

describe('the spend that ended a swap', () => {
  it('prefers a refund this wallet pushed over one it merely observed', async () => {
    const stored0 = await store({ refundTxid: 'our-refund-txid' })
    await saveRecord({ ...stored0, profile: { ...stored0.profile, spend_txid: 'observed-txid' } })

    expect(spendTxidOf(await stored())).toBe('our-refund-txid')
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
    // `lockupSpendTxids` is stripped and refilled from the live swap on
    // every manager pass, so a value written to it would not survive.
    await store({ state: 'refunded' })
    await saveRecord({ ...(await stored()), profile: { ...(await stored()).profile, spend_txid: 'refund-txid' } })

    const [input] = await inputs()
    expect(input.state).toBe('refunded')
    expect([...input.txids].sort()).toEqual(['funding-txid', 'refund-txid'])
  })

  it('gives the row builder nothing for a record with no funding txid', async () => {
    // Neither the record's own field nor the legacy profile key. There is no
    // transaction to anchor a row on, and a view without one would name a
    // lockup that does not exist.
    const stored0 = await store()
    await saveRecord({ ...stored0, fundingTxid: undefined, profile: { ...stored0.profile, funding_txid: undefined } })

    expect(await lnSendViews()).toEqual([])
  })

  it('leaves a settled send’s spend out — it pays the solver, not us', async () => {
    await store({ state: 'settled' })
    await saveRecord({ ...(await stored()), profile: { ...(await stored()).profile, spend_txid: 'solver-claim-txid' } })

    const [input] = await inputs()
    expect(input.txids).not.toContain('solver-claim-txid')
  })

  it('costs no indexer call once the manager has stamped the spend', async () => {
    const stored0 = await store({ state: 'settled' })
    await saveRecord({ ...stored0, lockupSpendTxids: ['solver-claim-txid'] })
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
    const stored0 = await store({ state: 'settled' })
    await saveRecord({ ...stored0, fundingTxid: undefined })
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
