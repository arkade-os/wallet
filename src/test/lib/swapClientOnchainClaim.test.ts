// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The onchain corridor's claim dep, which replaces the `claimOnchain` callback
 * the v1 `RfqSwapManager` took. Without it the drive reports the L1 half
 * blocked, so an onchain send funds an HTLC this wallet never claims.
 */
const captured: { config?: any } = {}
vi.mock('@arkade-os/swap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap')>()),
  createSwapClient: (config: any) => {
    captured.config = config
    return {}
  },
}))

const claimOnchainFill = vi.fn(async () => ({ txid: 'claim-txid', payoutAmount: BigInt(9_000) }))
const preimageForSwapRecord = vi.fn(async () => new Uint8Array(32).fill(7))
const rfqClaimSecretOf = vi.fn(() => ({ salt: 'seed' }) as any)
vi.mock('@arkade-os/swap/protocol', () => ({
  chainSourceFrom: (...args: unknown[]) => ({ chain: args }),
  claimOnchainFill: (...args: unknown[]) => claimOnchainFill(...(args as [])),
  preimageForSwapRecord: (...args: unknown[]) => preimageForSwapRecord(...(args as [])),
  rfqClaimSecretOf: (...args: unknown[]) => rfqClaimSecretOf(...(args as [])),
}))

let stored: any[] = []
vi.mock('../../lib/swapRepository', () => ({
  assetSwapRepository: {
    getAllSwapRecords: async () => stored,
    getSwapRecord: async (id: string) => stored.find((r) => r.id === id),
    saveSwapRecord: async () => {},
  },
}))

const v2Record = (rfqId = 'rfq-1') => ({
  id: `quote-${rfqId}`,
  family: 'rfq',
  kind: 'onchain_send',
  corridor: 'onchain',
  status: 'open',
  rfqId,
  profile: { hashlock: 'ph' },
  createdAt: 1,
  updatedAt: 1,
})

vi.mock('../../lib/claimFee', () => ({ claimFeeRate: async () => 11 }))

vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  EsploraProvider: class {
    constructor(public url: string) {}
  },
}))

const { makeSwapClient } = await import('../../lib/swapClient')

const signMessage = vi.fn(async () => new Uint8Array(64))
const wallet = { identity: { signMessage } } as any

const PAYOUT = new Uint8Array([0x51, 0x20, 9])
const swap = () => ({ rfqId: 'rfq-1', htlc: { pkScript: new Uint8Array([1]) }, payoutPkScript: PAYOUT }) as any
const utxo = { txid: 'fill', vout: 0, amount: BigInt(10_000), confirmations: 1 } as any

const claimOf = () => {
  makeSwapClient(wallet, 'regtest')
  return captured.config.corridors.onchain.claim
}

beforeEach(() => {
  claimOnchainFill.mockClear()
  preimageForSwapRecord.mockClear()
  stored = [v2Record()]
  rfqClaimSecretOf.mockReturnValue({ salt: 'seed' } as never)
})

describe('the onchain corridor is wired for the trader’s own L1 claim', () => {
  it('supplies both a chain source and a claim — neither is defaulted', () => {
    makeSwapClient(wallet, 'regtest')
    const onchain = captured.config.corridors.onchain
    expect(onchain.chain.esploraUrl).toEqual(expect.any(String))
    expect(onchain.chain.esploraUrl).not.toHaveLength(0)
    expect(typeof onchain.claim).toBe('function')
  })

  it('still gives the lightning corridor its own decoder', () => {
    makeSwapClient(wallet, 'regtest')
    expect(typeof captured.config.corridors.lightning.decode).toBe('function')
  })
})

describe('the claim itself', () => {
  it('builds against the payout script the swap carries, at the estimated rate', async () => {
    const result = await claimOf()(swap(), utxo)

    expect(claimOnchainFill).toHaveBeenCalledTimes(1)
    const [, input] = claimOnchainFill.mock.calls[0] as unknown as [unknown, any]
    expect(input.payoutPkScript).toBe(PAYOUT)
    expect(input.utxo).toBe(utxo)
    expect(input.feeRateSatVb).toBe(11)
    expect(result).toMatchObject({ txid: 'claim-txid' })
  })

  it('signs through the wallet identity, over the sighash the package builds', async () => {
    await claimOf()(swap(), utxo)
    const [, input] = claimOnchainFill.mock.calls[0] as unknown as [unknown, any]
    const sighash = new Uint8Array([9, 9])
    await input.sign(sighash)
    expect(signMessage).toHaveBeenCalledWith(sighash, 'schnorr')
  })

  // Refusing lets both sides refund; paying to a derived script would land the
  // sats back here while the screen said the recipient was paid.
  it('refuses a swap carrying no payout script rather than deriving one', async () => {
    const bare = { ...swap(), payoutPkScript: undefined }
    await expect(claimOf()(bare, utxo)).rejects.toThrow(/no payout script/i)
    expect(claimOnchainFill).not.toHaveBeenCalled()
  })

  // Pins the store: the v1 `rfqSwaps` the client never writes answers undefined.
  it('finds the record the client actually wrote, by rfqId', async () => {
    await claimOf()(swap(), utxo)
    expect(rfqClaimSecretOf).toHaveBeenCalledWith(
      expect.objectContaining({ rfqId: 'rfq-1', profile: { hashlock: 'ph' } }),
    )
  })

  /** Both sides real. The mocks above prove the wiring; this proves the two
   *  packages agree on the shape, which is what fails only after funding. */
  it('hands the real parser a projection it can actually read', async () => {
    const { corridorRecordStore } =
      await vi.importActual<typeof import('@arkade-os/swap/advanced')>('@arkade-os/swap/advanced')
    const { rfqClaimSecretOf: realSecretOf } =
      await vi.importActual<typeof import('@arkade-os/swap/protocol')>('@arkade-os/swap/protocol')

    const record = {
      ...v2Record(),
      kind: 'onchain_send',
      profile: {
        signer: { signingDescriptor: 'desc-abc' },
        hashlock: { paymentHash: 'aa'.repeat(32), preimageSaltHex: 'bb'.repeat(32) },
      },
    }
    const repo = {
      getAllSwapRecords: async () => [record],
      getSwapRecord: async (id: string) => (id === record.id ? record : undefined),
      saveSwapRecord: async () => {},
    }

    const found = await corridorRecordStore(repo as never).getRfqSwap('rfq-1')
    expect(found).toBeDefined()
    expect(realSecretOf(found as never)).toMatchObject({
      signingDescriptor: 'desc-abc',
      paymentHash: 'aa'.repeat(32),
    })
  })

  it('refuses when the record is missing, or carries no hashlock', async () => {
    stored = []
    await expect(claimOf()(swap(), utxo)).rejects.toThrow(/no stored record/i)

    stored = [v2Record()]
    rfqClaimSecretOf.mockReturnValue(undefined as never)
    await expect(claimOf()(swap(), utxo)).rejects.toThrow(/without its hashlock/i)
    expect(claimOnchainFill).not.toHaveBeenCalled()
  })
})
