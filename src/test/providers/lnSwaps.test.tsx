import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import { sha256 } from '@noble/hashes/sha2.js'
import { ArkAddress } from '@arkade-os/sdk'
import type { ChainUtxo, OnchainSendSwap, RfqSwapManagerCallbacks, SolverOnchainSend } from '@arkade-os/swap'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { LnSwapsProvider } from '../../providers/lnSwaps'
import { onchainSendSwapRecord } from '../../lib/onchainSendRecords'
import { saveRecord } from '../../lib/lnSendRecords'
import { CLAIM_PAYOUT_SCRIPT } from '../../lib/onchainPayout'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

/**
 * The `claimOnchain` callback, end to end from the STORED record.
 *
 * The manager is the package's. What is ours is what this callback digs out of
 * a record written before funding — the preimage, the payout script it must not
 * derive, and the fee endpoint — and every one of those is a fund-loss surface
 * that no unit test of the pieces covers together.
 */
const setCallbacks = vi.hoisted(() => vi.fn())
const start = vi.hoisted(() => vi.fn())
const stop = vi.hoisted(() => vi.fn())
const claimOnchainFill = vi.hoisted(() => vi.fn())

vi.mock('@arkade-os/swap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap')>()),
  RfqSwapManager: class {
    setCallbacks = (callbacks: RfqSwapManagerCallbacks) => setCallbacks(callbacks)
    start = start
    stop = stop
    addSwap = vi.fn()
    onSwapUpdate = vi.fn()
    onSwapCompleted = vi.fn()
  },
  claimOnchainFill,
}))

vi.mock('../../lib/swapRepository', async () => {
  const { InMemoryAssetSwapRepository: InMemory } = await import('@arkade-os/swap')
  return { assetSwapRepository: new InMemory() }
})

const LOCKUP =
  'tark1qr340xg400jtxat9hdd0ungyu6s05zjtdf85uj9smyzxshf98nda' +
  'h6u2nredqtn0cr4p4zqz53gsmhju4l9t7x47kzleesa9dprx7e56xhzlen'
const LOCKUP_PKSCRIPT = ArkAddress.decode(LOCKUP).pkScript

const PREIMAGE = new Uint8Array(32).fill(7)
const PAYMENT_HASH = hex.encode(sha256(PREIMAGE))
const PAYOUT_PKSCRIPT = Uint8Array.from([0x51, 0x20, ...new Uint8Array(32).fill(9)])
const HTLC = { address: 'bcrt1phtlc', refundLocktime: 1_800_003_600 }
const UTXO = { txid: 'f'.repeat(64), vout: 0, value: 9_800, confirmations: 1 } as unknown as ChainUtxo

const solverSend = (): SolverOnchainSend =>
  ({
    rfqId: 'rfq-onchain-1',
    address: LOCKUP,
    script: { pkScript: LOCKUP_PKSCRIPT },
    fundAmount: 10_000,
    minConfirmations: 1,
    l1Network: 'regtest',
    htlc: HTLC,
    htlcParams: {
      paymentHash: PAYMENT_HASH,
      claimKey: new Uint8Array(32).fill(1),
      refundKey: new Uint8Array(32).fill(2),
      refundLocktime: 1_800_003_600,
    },
    quote: { refund_locktime: 1_800_003_600 },
    // `mustPersistPreimage` puts the raw P in the record, so the claim needs no
    // signing wallet — the same shape a non-HD wallet stores.
    secrets: { descriptor: 'tr(aa)', preimage: PREIMAGE, mustPersistPreimage: true },
    payoutPkScript: PAYOUT_PKSCRIPT,
  }) as unknown as SolverOnchainSend

const monitored = (rfqId = 'rfq-onchain-1'): OnchainSendSwap =>
  ({ rfqId, kind: 'onchain_send', htlc: HTLC }) as unknown as OnchainSendSwap

const signMessage = vi.fn(async () => new Uint8Array(64).fill(3))

const renderProvider = (network = 'regtest') =>
  render(
    <AspContext.Provider
      value={
        {
          ...mockAspContextValue,
          aspInfo: { ...mockAspContextValue.aspInfo, network, url: 'http://ark.local' },
        } as never
      }
    >
      <WalletContext.Provider
        value={
          {
            ...mockWalletContextValue,
            dataReady: true,
            svcWallet: { identity: { signMessage }, getContractManager: async () => ({}) },
          } as never
        }
      >
        <LnSwapsProvider>{null}</LnSwapsProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )

const callbacks = () => setCallbacks.mock.calls[0][0] as RfqSwapManagerCallbacks
const fetchMock = vi.fn()

/** Mount, and hand back the installed callback set. */
const wired = async (network?: string) => {
  renderProvider(network)
  await waitFor(() => expect(setCallbacks).toHaveBeenCalled())
  return callbacks()
}

const store = async (mutate: (profile: Record<string, unknown>) => Record<string, unknown> = (p) => p) => {
  const record = onchainSendSwapRecord(solverSend())
  await saveRecord({ ...record, profile: mutate({ ...record.profile }) })
}

const without = (key: string) => (profile: Record<string, unknown>) => {
  delete profile[key]
  return profile
}

beforeEach(() => {
  setCallbacks.mockReset()
  start.mockReset().mockResolvedValue(undefined)
  stop.mockReset().mockResolvedValue(undefined)
  claimOnchainFill.mockReset().mockResolvedValue({ txid: 'claim-txid', payoutAmount: BigInt(9_700) })
  signMessage.mockClear()
  fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ '2': 12.3 }) })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('LnSwapsProvider claimOnchain', () => {
  it('claims the fill with the preimage and payout script the record was written with', async () => {
    const claim = await wired()
    await store()

    await expect(claim.claimOnchain!(monitored(), UTXO)).resolves.toEqual({
      txid: 'claim-txid',
      payoutAmount: BigInt(9_700),
    })

    const [chain, input] = claimOnchainFill.mock.calls[0]
    expect(chain).toBeDefined()
    expect(input.htlc).toBe(HTLC)
    expect(input.utxo).toBe(UTXO)
    // Straight from the record: derivable only for this wallet's OWN key, so a
    // derived script would pay the recipient's money back to the sender.
    expect(hex.encode(input.payoutPkScript)).toBe(hex.encode(PAYOUT_PKSCRIPT))
    expect(hex.encode(input.preimage)).toBe(hex.encode(PREIMAGE))
    expect(hex.encode(sha256(input.preimage))).toBe(PAYMENT_HASH)
    expect(input.feeRateSatVb).toBe(13)

    await input.sign(new Uint8Array(32).fill(5))
    expect(signMessage).toHaveBeenCalledWith(new Uint8Array(32).fill(5), 'schnorr')
  })

  it.each([
    ['regtest', 'http://localhost:3000/api/fee-estimates'],
    ['bitcoin', 'https://mempool.arkade.sh/api/fee-estimates'],
  ])('rates the claim off the %s esplora endpoint', async (network, url) => {
    const claim = await wired(network)
    await store()

    await claim.claimOnchain!(monitored(), UTXO)
    expect(fetchMock).toHaveBeenCalledWith(url, expect.anything())
  })

  it('falls back to the floor rate rather than failing the claim when the estimate is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('esplora down'))
    const claim = await wired()
    await store()

    await claim.claimOnchain!(monitored(), UTXO)
    expect(claimOnchainFill.mock.calls[0][1].feeRateSatVb).toBe(1)
  })

  it('refuses a swap the store holds no record for', async () => {
    const claim = await wired()

    await expect(claim.claimOnchain!(monitored('rfq-gone'), UTXO)).rejects.toThrow(/no stored record/)
    expect(claimOnchainFill).not.toHaveBeenCalled()
  })

  it('refuses rather than claiming to anywhere else when the record carries no payout script', async () => {
    const claim = await wired()
    await store(without(CLAIM_PAYOUT_SCRIPT))

    await expect(claim.claimOnchain!(monitored(), UTXO)).rejects.toThrow(/refusing to claim to anywhere else/)
    expect(claimOnchainFill).not.toHaveBeenCalled()
  })

  it('refuses a record stored without its hashlock, which is where P lives', async () => {
    const claim = await wired()
    await store(without('hashlock'))

    await expect(claim.claimOnchain!(monitored(), UTXO)).rejects.toThrow(/claim secret is unreadable/)
    expect(claimOnchainFill).not.toHaveBeenCalled()
  })
})
