import { useContext } from 'react'
import userEvent from '@testing-library/user-event'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { planOffer, type OfferPlan } from '@arkade-os/solver-discovery'
import { addAssetSwap, getAssetSwaps, updateAssetSwap } from '@arkade-os/swap'
import { AspContext } from '../../providers/asp'
import { AssetSwapsContext, AssetSwapsProvider } from '../../providers/assetSwaps'
import { WalletContext } from '../../providers/wallet'
import { assetSwapRepository as repository, type WalletAssetSwap } from '../../lib/swapRepository'
import { btcUsdt, maratNapo, MARAT_ID, NAPO_ID, USDT_ID } from '../lib/swapFixtures'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

const cancelOffer = vi.hoisted(() => vi.fn())
const createOffer = vi.hoisted(() => vi.fn())
const getVtxos = vi.hoisted(() => vi.fn())
const watchOfferSwaps = vi.hoisted(() => vi.fn())

vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  RestIndexerProvider: class {
    getVtxos = getVtxos
  },
}))

vi.mock('@arkade-os/swap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap')>()),
  cancelOffer,
  createOffer,
  watchOfferSwaps,
}))

// the provider's repository, swapped for the in-memory one: jsdom has no
// IndexedDB, and these tests are about the provider's own transitions
vi.mock('../../lib/swapRepository', async () => {
  const { InMemoryAssetSwapRepository } = await vi.importActual<typeof import('@arkade-os/swap')>('@arkade-os/swap')
  return { assetSwapRepository: new InMemoryAssetSwapRepository() }
})

// keep the discovery effect off the network; these tests hand plans in directly
vi.mock('../../lib/swapMarkets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapMarkets')>()),
  discoverMarkets: async () => [],
}))

const pendingSwap: WalletAssetSwap = {
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
  const { cancelSwap, swaps } = useContext(AssetSwapsContext)
  return (
    <>
      <button onClick={() => cancelSwap(pendingSwap.id).catch(() => {})}>Cancel</button>
      <span data-testid='status'>{swaps.find((s) => s.id === pendingSwap.id)?.status ?? 'none'}</span>
    </>
  )
}

function renderProvider(reloadWallet = vi.fn().mockResolvedValue(undefined), url = '') {
  render(
    <AspContext.Provider
      value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: '', url } } as any}
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
    // mutinynet is the network with a pinned co-signer key, which arms createSwap
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

beforeEach(() => {
  watchOfferSwaps.mockReset().mockResolvedValue({ stop: () => {}, idle: async () => {} })
})

describe('AssetSwapsProvider createSwap offer encoding', () => {
  beforeEach(async () => {
    await repository.clear()
    createOffer.mockReset().mockResolvedValue({
      address: 'tark1swap',
      extension: { type: 3, payload: new Uint8Array([1]) },
      swapPkScript: new Uint8Array(34),
      offerHex: '0100',
    })
  })

  afterEach(async () => await repository.clear())

  it('keys the offer on the receive side: asset<->asset wants the receive asset', async () => {
    // the fork that mis-encoded asset<->asset as a sat want when keyed on the
    // deposit side: a MARAT->NAPO plan must produce a want-asset offer
    const plan = planOffer({ market: maratNapo, give: 'base', feedValue: 1, giveAmount: BigInt(500), safetyBps: 0 })
    const send = renderCreateProvider(plan)

    // discovery still settles async; retry the click until createSwap arms
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
      expect(createOffer).toHaveBeenCalled()
    })

    const options = createOffer.mock.calls[0][2]
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

  it('sends the offer packet as the extension the package returns', async () => {
    const plan = planOffer({ market: btcUsdt, give: 'base', feedValue: 100000, giveAmount: BigInt(10_000) })
    const send = renderCreateProvider(plan)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
      expect(createOffer).toHaveBeenCalled()
    })

    await waitFor(() => expect(send).toHaveBeenCalled())
    expect(send.mock.calls[0][0].extensions).toEqual([{ type: 3, payload: new Uint8Array([1]) }])
  })

  it('wants sats when the receive side is BTC', async () => {
    const plan = planOffer({ market: btcUsdt, give: 'quote', feedValue: 100000, giveAmount: BigInt(152), safetyBps: 0 })
    const send = renderCreateProvider(plan)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
      expect(createOffer).toHaveBeenCalled()
    })

    const options = createOffer.mock.calls[0][2]
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

    const options = createOffer.mock.calls[0][2]
    expect(options.offerAsset).toBeUndefined()
    expect(options.wantAsset?.toString()).toBe(USDT_ID)
    await waitFor(() => expect(send).toHaveBeenCalled())
    expect(send.mock.calls[0][0]).toMatchObject({ amount: Number(plan.deposit.atomic), assets: undefined })
  })

  it('persists the record through the repository, not localStorage', async () => {
    const plan = planOffer({ market: btcUsdt, give: 'base', feedValue: 100000, giveAmount: BigInt(10_000) })
    renderCreateProvider(plan)

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
      expect(createOffer).toHaveBeenCalled()
    })

    await waitFor(async () =>
      expect(await getAssetSwaps(repository)).toMatchObject([{ id: 'funding-txid-2', status: 'pending' }]),
    )
    expect(localStorage.getItem('assetSwaps')).toBeNull()
  })
})

describe('AssetSwapsProvider cancellation', () => {
  beforeEach(async () => {
    await repository.clear()
    cancelOffer.mockReset().mockResolvedValue('cancel-txid')
    getVtxos.mockReset()
    await addAssetSwap(repository, pendingSwap)
  })

  afterEach(async () => await repository.clear())

  it('persists the cancellation transaction ID with the terminal status', async () => {
    const reloadWallet = renderProvider()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({ status: 'cancelled', spentTxid: 'cancel-txid' }),
    )
    expect(cancelOffer).toHaveBeenCalledOnce()
    // the repository rides along so the package can record its own outcome
    expect(cancelOffer.mock.calls[0][3]).toMatchObject({ repository, fundingTxid: pendingSwap.fundingTxid })
    expect(reloadWallet).toHaveBeenCalledOnce()
  })

  it('does not restore a stale status after another path resolves the cancellation', async () => {
    cancelOffer.mockRejectedValue(new Error('cancel failed'))
    let resolveVtxos!: (value: { vtxos: { txid: string; virtualStatus: { state: string } }[] }) => void
    getVtxos.mockReturnValue(new Promise((resolve) => (resolveVtxos = resolve)))

    renderProvider()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(async () => expect((await getAssetSwaps(repository))[0].status).toBe('cancelling'))

    await updateAssetSwap(repository, pendingSwap.id, { status: 'fulfilled' })
    resolveVtxos({ vtxos: [{ txid: pendingSwap.fundingTxid, virtualStatus: { state: 'settled' } }] })

    await waitFor(async () => expect((await getAssetSwaps(repository))[0].status).toBe('fulfilled'))
  })
})

describe('AssetSwapsProvider watching', () => {
  beforeEach(async () => {
    await repository.clear()
    await addAssetSwap(repository, pendingSwap)
  })

  afterEach(async () => await repository.clear())

  it('adopts a status the watcher persisted', async () => {
    // the watcher only starts once there is a server to read spending txs from
    renderProvider(undefined, 'https://ark.test')
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'))
    await waitFor(() => expect(watchOfferSwaps).toHaveBeenCalled())
    // the watcher writes through the repository, so it gets the same one
    expect(watchOfferSwaps.mock.calls[0][0].repository).toBe(repository)

    const { onUpdate } = watchOfferSwaps.mock.calls[0][0]
    onUpdate({ ...pendingSwap, status: 'fulfilled', spentTxid: 'fill-txid' })

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('fulfilled'))
  })
})
