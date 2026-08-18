import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ArkAddress, type ProvisionedKey } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import {
  lnSendActivityInputs,
  lnSendSwapRecord,
  refreshLnSendStates,
  saveLnSendRecord,
  type LnSendRecordInput,
} from '../../lib/lnSendRecords'
import { assetSwapRepository as repository } from '../../lib/swapRepository'

// jsdom has no IndexedDB, and these tests are about what the wallet stores,
// not about the backend it stores in
vi.mock('../../lib/swapRepository', async () => {
  const { InMemoryAssetSwapRepository } = await vi.importActual<typeof import('@arkade-os/swap')>('@arkade-os/swap')
  return { assetSwapRepository: new InMemoryAssetSwapRepository() }
})

const lnSendSpender = vi.hoisted(() => vi.fn())
vi.mock('../../lib/lnSwap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/lnSwap')>()),
  lnSendSpender,
}))

const LOCKUP =
  'tark1qplnj2gett9j483fchy6chaxn4y52c4g7n5djh9xua3ywdxw0ldatc3e9xcj9xpx0r5tmr0dgvu2f4s352muklg0tcxx0scnnkraajy9jgz4xl'
// Derived from the address rather than written out: `createRfqSwapRecord`
// refuses a record whose funded address and watched script are not the same
// covenant, which is exactly the check being relied on here.
const LOCKUP_PK_SCRIPT = hex.encode(ArkAddress.decode(LOCKUP).pkScript)

const secrets: ProvisionedKey = { pubkey: new Uint8Array(32).fill(0xab), descriptor: 'wpkh(...)/0' }

const input = (over: Partial<LnSendRecordInput> = {}): LnSendRecordInput => ({
  rfqId: 'a'.repeat(64),
  lockupAddress: LOCKUP,
  swapPkScript: LOCKUP_PK_SCRIPT,
  paymentHash: 'b'.repeat(64),
  refundLocktime: 1_700_000_600,
  secrets,
  amount: 1_030,
  fundingTxid: 'funding-txid',
  ...over,
})

beforeEach(async () => {
  for (const record of await repository.getAllRfqSwaps()) await repository.removeRfqSwap(record.rfqId)
  lnSendSpender.mockReset()
})

describe('lnSendSwapRecord', () => {
  it('records the funding txid, the hashlock and the signer', () => {
    const record = lnSendSwapRecord(input(), 1_700_000_000)

    expect(record).toMatchObject({
      rfqId: 'a'.repeat(64),
      kind: 'lightning_send',
      state: 'pending',
      lockupAddress: LOCKUP,
      amount: 1_030,
      createdAt: 1_700_000_000,
    })
    // The funding txid has no field of its own on the record — grouping reads
    // it back off the profile, so it has to survive the corridor handler's own
    // projection.
    expect(record.profile.funding_txid).toBe('funding-txid')
    expect(record.profile.hashlock).toMatchObject({ paymentHash: 'b'.repeat(64) })
    expect(record.profile.signer).toMatchObject({ signingDescriptor: 'wpkh(...)/0' })
  })

  it('refuses a record whose lockup address is not the script it watches', () => {
    expect(() => lnSendSwapRecord(input({ swapPkScript: `5120${'cd'.repeat(32)}` }))).toThrow(/not the same swap/)
  })
})

describe('lnSendActivityInputs', () => {
  it('names the funding tx, and the refund once there is one', async () => {
    await saveLnSendRecord(input())
    expect(await lnSendActivityInputs()).toEqual([
      { rfqId: 'a'.repeat(64), kind: 'lightning_send', state: 'pending', txids: ['funding-txid'] },
    ])

    const [record] = await repository.getAllRfqSwaps()
    await repository.saveRfqSwap({ ...record, state: 'refunded', refundArkTxid: 'refund-txid' })

    expect(await lnSendActivityInputs()).toEqual([
      { rfqId: 'a'.repeat(64), kind: 'lightning_send', state: 'refunded', txids: ['funding-txid', 'refund-txid'] },
    ])
  })

  it('drops a record with no funding txid rather than grouping nothing', async () => {
    const record = lnSendSwapRecord(input())
    await repository.saveRfqSwap({ ...record, profile: { ...record.profile, funding_txid: undefined } })

    expect(await lnSendActivityInputs()).toEqual([])
  })
})

describe('refreshLnSendStates', () => {
  const paidUs = async () => false

  it('files a claimed lockup as settled and keeps no refund txid', async () => {
    await saveLnSendRecord(input())
    lnSendSpender.mockResolvedValue({ spentTxid: 'claim-txid', outcome: 'completed' })

    await refreshLnSendStates({ indexerUrl: 'https://indexer.test', paidUs })

    const [record] = await repository.getAllRfqSwaps()
    expect(record.state).toBe('settled')
    // The solver's claim pays the solver: naming it here would group a tx this
    // wallet's history does not have.
    expect(record.refundArkTxid).toBeUndefined()
  })

  it('files a returned lockup as refunded, naming the tx that brought it back', async () => {
    await saveLnSendRecord(input())
    lnSendSpender.mockResolvedValue({ spentTxid: 'refund-txid', outcome: 'refunded' })

    await refreshLnSendStates({ indexerUrl: 'https://indexer.test', paidUs })

    const [record] = await repository.getAllRfqSwaps()
    expect(record.state).toBe('refunded')
    expect(record.refundArkTxid).toBe('refund-txid')
  })

  it('leaves an unspent lockup pending', async () => {
    await saveLnSendRecord(input())
    lnSendSpender.mockResolvedValue(undefined)

    await refreshLnSendStates({ indexerUrl: 'https://indexer.test', paidUs })

    expect((await repository.getAllRfqSwaps())[0].state).toBe('pending')
  })

  it('asks nothing about a swap that already ended', async () => {
    const record = lnSendSwapRecord(input())
    await repository.saveRfqSwap({ ...record, state: 'settled' })

    await refreshLnSendStates({ indexerUrl: 'https://indexer.test', paidUs })

    expect(lnSendSpender).not.toHaveBeenCalled()
  })

  it('leaves the record pending when the lockup cannot be read', async () => {
    await saveLnSendRecord(input())
    lnSendSpender.mockRejectedValue(new Error('indexer down'))

    await refreshLnSendStates({ indexerUrl: 'https://indexer.test', paidUs })

    expect((await repository.getAllRfqSwaps())[0].state).toBe('pending')
  })
})
