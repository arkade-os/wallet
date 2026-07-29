import { useContext } from 'react'
import userEvent from '@testing-library/user-event'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { planOffer, type OfferPlan } from '@arkade-os/solver-discovery'
import { AspContext } from '../../providers/asp'
import { AssetSwapsContext, AssetSwapsProvider } from '../../providers/assetSwaps'
import { WalletContext } from '../../providers/wallet'
import { addAssetSwap, getAssetSwaps, type AssetSwap, updateAssetSwap } from '../../lib/swap/store'
import { btcUsdt, maratNapo, MARAT_ID, NAPO_ID, USDT_ID } from '../lib/swap/fixtures'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

const cancelOffer = vi.hoisted(() => vi.fn())
const createOffer = vi.hoisted(() => vi.fn())
const getVtxos = vi.hoisted(() => vi.fn())
const getEmulatorInfo = vi.hoisted(() => vi.fn(async () => ({})))
const discoverMarkets = vi.hoisted(() => vi.fn(async (): Promise<unknown[]> => []))

vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  RestIndexerProvider: class {
    getVtxos = getVtxos
  },
  RestEmulatorProvider: class {
    getInfo = getEmulatorInfo
  },
}))

vi.mock('../../lib/swap/offer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swap/offer')>()),
  cancelOffer,
  createOffer,
}))

// keep the discovery effect off the network; most tests hand plans in
// directly, the refresh tests script discoverMarkets per call
vi.mock('../../lib/swap/markets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swap/markets')>()),
  discoverMarkets,
}))

const pendingSwap: AssetSwap = {
  id: 'funding-txid',
  fromAsset: 'btc',
  toAsset: 'asset-beta',
  fromAmount: '10000',
  toAmount: '500',
  swapAddress: 'tark1q...',
  swapPkScript: `5120${'ab'.repeat(32)}`,
  offerHex: '0100',
  fundingTxid: 'funding-txid',
  status: 'pending',
  createdAt: 1,
}

function CancelHarness() {
  const { cancelSwap } = useContext(AssetSwapsContext)
  return <button onClick={() => cancelSwap(pendingSwap.id).catch(() => {})}>Cancel</button>
}

function renderProvider(reloadWallet = vi.fn().mockResolvedValue(undefined)) {
  render(
    <AspContext.Provider
      value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: '', url: '' } } as any}
    >
      <WalletContext.Provider value={{ ...mockWalletContextValue, reloadWallet, svcWallet: { identity: {} } } as any}>
        <AssetSwapsProvider>
          <CancelHarness />
        </AssetSwapsProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )
  return reloadWallet
}

function CreateHarness({ plan }: { plan: OfferPlan }) {
  const { createSwap } = useContext(AssetSwapsContext)
  return <button onClick={() => createSwap(plan).catch(() => {})}>Create</button>
}

function renderCreateProvider(plan: OfferPlan) {
  const send = vi.fn().mockResolvedValue('funding-txid-2')
  render(
    // mutinynet so the emulator probe (mocked above) resolves and arms createSwap
    <AspContext.Provider
      value={
        { ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet', url: '' } } as any
      }
    >
      <WalletContext.Provider
        value={
          {
            ...mockWalletContextValue,
            reloadWallet: vi.fn().mockResolvedValue(undefined),
            svcWallet: { identity: {}, send },
          } as any
        }
      >
        <AssetSwapsProvider>
          <CreateHarness plan={plan} />
        </AssetSwapsProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )
  return send
}

describe('AssetSwapsProvider createSwap offer encoding', () => {
  beforeEach(() => {
    localStorage.clear()
    createOffer.mockReset().mockResolvedValue({
      address: 'tark1swap',
      payload: new Uint8Array([1]),
      swapPkScript: new Uint8Array(34),
      offerHex: '0100',
    })
  })

  afterEach(() => localStorage.clear())

  it('keys the offer on the receive side: asset<->asset wants the receive asset', async () => {
    // the fork that mis-encoded asset<->asset as a sat want when keyed on the
    // deposit side: a MARAT->NAPO plan must produce a want-asset offer
    const plan = planOffer({ market: maratNapo, give: 'base', feedValue: 1, giveAmount: BigInt(500), safetyBps: 0 })
    const send = renderCreateProvider(plan)

    // the emulator probe resolves async; retry the click until createSwap arms
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
      expect(createOffer).toHaveBeenCalled()
    })

    const options = createOffer.mock.calls[0][3]
    expect(options.offerAsset).toBeUndefined()
    expect(options.wantAsset?.toString()).toBe(NAPO_ID)
    expect(options.wantAmount).toBe(plan.receive.atomic)
    // the deposit rides the funding tx as an asset, not as sats
    await waitFor(() => expect(send).toHaveBeenCalled())
    expect(send.mock.calls[0][0]).toMatchObject({
      amount: undefined,
      assets: [{ assetId: MARAT_ID, amount: plan.deposit.atomic }],
    })
  })

  it('wants sats when the receive side is BTC', async () => {
    const plan = planOffer({ market: btcUsdt, give: 'quote', feedValue: 100000, giveAmount: BigInt(152), safetyBps: 0 })
    const send = renderCreateProvider(plan)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
      expect(createOffer).toHaveBeenCalled()
    })

    const options = createOffer.mock.calls[0][3]
    expect(options.wantAsset).toBeUndefined()
    expect(options.offerAsset?.toString()).toBe(USDT_ID)
    expect(options.wantAmount).toBe(plan.receive.atomic)
    await waitFor(() => expect(send).toHaveBeenCalled())
    expect(send.mock.calls[0][0]).toMatchObject({
      amount: undefined,
      assets: [{ assetId: USDT_ID, amount: plan.deposit.atomic }],
    })
  })

  it('sends a sat amount, not an asset rider, when depositing BTC', async () => {
    const plan = planOffer({
      market: btcUsdt,
      give: 'base',
      feedValue: 100000,
      giveAmount: BigInt(10_000),
      safetyBps: 0,
    })
    const send = renderCreateProvider(plan)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
      expect(createOffer).toHaveBeenCalled()
    })

    const options = createOffer.mock.calls[0][3]
    expect(options.offerAsset).toBeUndefined()
    expect(options.wantAsset?.toString()).toBe(USDT_ID)
    await waitFor(() => expect(send).toHaveBeenCalled())
    expect(send.mock.calls[0][0]).toMatchObject({ amount: Number(plan.deposit.atomic), assets: undefined })
  })
})

describe('AssetSwapsProvider cancellation', () => {
  beforeEach(() => {
    localStorage.clear()
    cancelOffer.mockReset().mockResolvedValue('cancel-txid')
    getVtxos.mockReset()
    addAssetSwap(pendingSwap)
  })

  afterEach(() => localStorage.clear())

  it('persists the cancellation transaction ID with the terminal status', async () => {
    const reloadWallet = renderProvider()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(getAssetSwaps()[0]).toMatchObject({ status: 'cancelled', spentTxid: 'cancel-txid' }))
    expect(cancelOffer).toHaveBeenCalledOnce()
    expect(reloadWallet).toHaveBeenCalledOnce()
  })

  it('does not restore a stale status after another path resolves the cancellation', async () => {
    cancelOffer.mockRejectedValue(new Error('cancel failed'))
    let resolveVtxos!: (value: { vtxos: { txid: string; virtualStatus: { state: string } }[] }) => void
    getVtxos.mockReturnValue(new Promise((resolve) => (resolveVtxos = resolve)))

    renderProvider()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(getAssetSwaps()[0].status).toBe('cancelling'))

    updateAssetSwap(pendingSwap.id, { status: 'fulfilled' })
    resolveVtxos({ vtxos: [{ txid: pendingSwap.fundingTxid, virtualStatus: { state: 'settled' } }] })

    await waitFor(() => expect(getAssetSwaps()[0].status).toBe('fulfilled'))
  })
})

function MarketsHarness() {
  const { markets, refreshMarkets, swapAvailable } = useContext(AssetSwapsContext)
  return (
    <>
      <span data-testid='market-count'>{markets.length}</span>
      <span data-testid='swap-available'>{String(swapAvailable)}</span>
      <button onClick={refreshMarkets}>Refresh</button>
    </>
  )
}

function renderMarketsProvider() {
  render(
    // mutinynet so the emulator probe (mocked above) arms swapAvailable
    <AspContext.Provider
      value={
        { ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet', url: '' } } as any
      }
    >
      <WalletContext.Provider
        value={
          {
            ...mockWalletContextValue,
            reloadWallet: vi.fn().mockResolvedValue(undefined),
            svcWallet: { identity: {} },
          } as any
        }
      >
        <AssetSwapsProvider>
          <MarketsHarness />
        </AssetSwapsProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )
}

describe('AssetSwapsProvider market discovery refresh', () => {
  beforeEach(() => {
    localStorage.clear()
    discoverMarkets.mockImplementation(async () => [])
    getEmulatorInfo.mockImplementation(async () => ({}))
  })

  afterEach(() => localStorage.clear())

  it('re-runs discovery when refreshMarkets is called (the Settings pin/remove wiring)', async () => {
    renderMarketsProvider()
    await waitFor(() => expect(discoverMarkets).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('market-count').textContent).toBe('0')

    discoverMarkets.mockResolvedValueOnce([btcUsdt])
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(screen.getByTestId('market-count').textContent).toBe('1'))
  })

  it('keeps the verified emulator when a refresh re-probe fails', async () => {
    discoverMarkets.mockImplementation(async () => [btcUsdt])
    renderMarketsProvider()
    await waitFor(() => expect(screen.getByTestId('swap-available').textContent).toBe('true'))

    // a pin/remove refresh with a transiently failing probe must not flip
    // swaps off — the co-signer did not change
    getEmulatorInfo.mockRejectedValueOnce(new Error('probe down'))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(discoverMarkets).toHaveBeenCalledTimes(2))
    expect(screen.getByTestId('swap-available').textContent).toBe('true')
  })
})
