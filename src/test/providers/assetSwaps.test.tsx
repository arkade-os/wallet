import { ReactNode, StrictMode, useContext } from 'react'
import userEvent from '@testing-library/user-event'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import { planOffer, type OfferPlan } from '@arkade-os/solver-discovery'
import { addAssetSwap, getAssetSwaps, updateAssetSwap } from '@arkade-os/swap'
import { AspContext } from '../../providers/asp'
import { AssetSwapsContext, AssetSwapsProvider } from '../../providers/assetSwaps'
import { WalletContext } from '../../providers/wallet'
import { assetSwapRepository as repository, type WalletAssetSwap } from '../../lib/swapRepository'
import { btcUsdt, maratNapo, MARAT_ID, NAPO_ID, USDT_ID } from '../lib/swapFixtures'
import { saveSolverCards } from '../../lib/solverCards'
import { mockAspContextValue, mockTxInfo, mockWalletContextValue } from '../screens/mocks'

const cancelOffer = vi.hoisted(() => vi.fn())
const createOffer = vi.hoisted(() => vi.fn())
const getVtxos = vi.hoisted(() => vi.fn())
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const discoverMarkets = vi.hoisted(() => vi.fn(async (_network: string, _useCache?: boolean) => []))
const restoreAssetSwaps = vi.hoisted(() => vi.fn())
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
  restoreAssetSwaps,
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
  discoverMarkets,
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

/** The provider under its two contexts. One home for the `as any` seams, so a
 * change to what the provider reads out of them lands in a single place. */
const providerTree = (
  { asp, wallet }: { asp?: Record<string, unknown>; wallet?: Record<string, unknown> },
  children: ReactNode,
) => (
  <AspContext.Provider value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, ...asp } } as any}>
    <WalletContext.Provider
      value={{ ...mockWalletContextValue, reloadWallet: vi.fn().mockResolvedValue(undefined), ...wallet } as any}
    >
      <AssetSwapsProvider>{children}</AssetSwapsProvider>
    </WalletContext.Provider>
  </AspContext.Provider>
)

function renderProvider(reloadWallet = vi.fn().mockResolvedValue(undefined), url = '') {
  render(
    providerTree(
      { asp: { network: '', url }, wallet: { reloadWallet, svcWallet: { identity: {} } } },
      <CancelHarness />,
    ),
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
    providerTree(
      // mutinynet is the network with a pinned co-signer key, which arms createSwap
      { asp: { network: 'mutinynet', url: '' }, wallet: { svcWallet: { identity: {}, send } } },
      <CreateHarness plan={plan} />,
    ),
  )
  return send
}

beforeEach(() => {
  discoverMarkets.mockClear()
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

describe('AssetSwapsProvider restore scan', () => {
  // valid hex: the provider decodes it to the x-only key the covenants were funded against
  const SIGNER_PUBKEY = `02${'ab'.repeat(32)}`
  const restoredSwap: WalletAssetSwap = { ...pendingSwap, id: 'restored-txid', fundingTxid: 'restored-txid' }
  const sentTx = (redeemTxid: string) => ({ ...mockTxInfo, type: 'sent', redeemTxid, createdAt: 1 })

  function ScanHarness() {
    const { swaps } = useContext(AssetSwapsContext)
    return <span data-testid='restored'>{swaps.map((s) => s.id).join(',') || 'none'}</span>
  }

  const tree = (txs: (typeof mockTxInfo)[], signerPubkey: string = SIGNER_PUBKEY) =>
    providerTree(
      { asp: { network: '', url: 'https://ark.test', signerPubkey }, wallet: { dataReady: true, txs } },
      <ScanHarness />,
    )

  /** Renders with the first `restoreAssetSwaps` held open, so a rerender lands
   * while a scan is provably in flight. Returns the release for that run. */
  const renderBlockedScan = async () => {
    let release: (result: { restored: WalletAssetSwap[]; scannedTxids: string[] }) => void = () => {}
    restoreAssetSwaps
      .mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
      .mockResolvedValue({ restored: [], scannedTxids: [] })
    const { rerender } = render(tree([sentTx('a')]))
    await waitFor(() => expect(restoreAssetSwaps).toHaveBeenCalledTimes(1))
    return { rerender, release: (result: Parameters<typeof release>[0]) => release(result) }
  }

  beforeEach(async () => {
    await repository.clear()
    restoreAssetSwaps.mockReset()
  })

  afterEach(async () => await repository.clear())

  it('keeps a scan alive when history changes under it', async () => {
    // The restore path in the wild: history arrives in more than one batch, so
    // `txs` takes a new identity while the scan's indexer round-trip is still in
    // flight. Abandoning the run on that dropped the rebuilt records before they
    // were written and scheduled no retry, so a restored wallet showed its swaps
    // as bare sent rows until some later unrelated `txs` change happened to land
    // while no scan was running — which is why making one new swap restored
    // every older one at once.
    const { rerender, release } = await renderBlockedScan()

    rerender(tree([sentTx('a'), sentTx('b')]))
    release({ restored: [restoredSwap], scannedTxids: ['restored-txid'] })

    await waitFor(() => expect(screen.getByTestId('restored')).toHaveTextContent('restored-txid'))
  })

  it('starts a scan for the new wallet when the profile changed mid-scan', async () => {
    // The queued run may belong to another wallet by the time the lock frees:
    // re-entering through the effect is what lets it read the profile current
    // then, instead of the one the finishing run was bound to.
    const OTHER_PUBKEY = `02${'cd'.repeat(32)}`
    const { rerender, release } = await renderBlockedScan()

    rerender(tree([sentTx('a')], OTHER_PUBKEY))
    release({ restored: [restoredSwap], scannedTxids: ['restored-txid'] })

    await waitFor(() => expect(restoreAssetSwaps).toHaveBeenCalledTimes(2))
    expect(restoreAssetSwaps.mock.calls[1][3].serverPubkey).toEqual(hex.decode('cd'.repeat(32)))
    // and the abandoned run wrote nothing for the wallet that went away
    expect(screen.getByTestId('restored')).toHaveTextContent('none')
  })

  it('scans under StrictMode, whose setup/cleanup/setup would strand the unmounted flag', async () => {
    restoreAssetSwaps.mockResolvedValue({ restored: [restoredSwap], scannedTxids: ['restored-txid'] })

    render(<StrictMode>{tree([sentTx('a')])}</StrictMode>)

    await waitFor(() => expect(screen.getByTestId('restored')).toHaveTextContent('restored-txid'))
  })

  it('goes round again with the history that arrived mid-scan', async () => {
    let release: (result: { restored: WalletAssetSwap[]; scannedTxids: string[] }) => void = () => {}
    restoreAssetSwaps
      .mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
      .mockResolvedValue({ restored: [], scannedTxids: [] })

    const { rerender } = render(tree([sentTx('a')]))
    await waitFor(() => expect(restoreAssetSwaps).toHaveBeenCalledTimes(1))
    expect(restoreAssetSwaps.mock.calls[0][1]).toHaveLength(1)

    // a run skipped because another was in flight must not be a run lost
    rerender(tree([sentTx('a'), sentTx('b')]))
    release({ restored: [], scannedTxids: ['a'] })

    await waitFor(() => expect(restoreAssetSwaps).toHaveBeenCalledTimes(2))
    // and it sees the newer history, not the list its effect closed over
    expect(restoreAssetSwaps.mock.calls[1][1]).toHaveLength(2)
  })
})

describe('AssetSwapsProvider solver cards', () => {
  function Bare() {
    return null
  }

  const renderOnNetwork = () =>
    render(
      <AspContext.Provider
        value={
          { ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet', url: '' } } as any
        }
      >
        <WalletContext.Provider
          value={
            { ...mockWalletContextValue, reloadWallet: vi.fn().mockResolvedValue(undefined), svcWallet: null } as any
          }
        >
          <AssetSwapsProvider>
            <Bare />
          </AssetSwapsProvider>
        </WalletContext.Provider>
      </AspContext.Provider>,
    )

  it('re-runs discovery when the stored solver cards change', async () => {
    // A pinned card is a market source, and the Nostr restore writes one
    // straight to localStorage — well after the per-network discovery has run,
    // and where no React state can see it. Without this the swap screen read
    // "coming soon" with the restored card sitting visible in Settings, until
    // the app was reloaded.
    renderOnNetwork()
    await waitFor(() => expect(discoverMarkets).toHaveBeenCalledTimes(1))

    act(() => saveSolverCards([]))

    await waitFor(() => expect(discoverMarkets).toHaveBeenCalledTimes(2))
    // cache bypassed: the TTL cache holds the registry's answer, which is
    // exactly what a newly stored card changes
    expect(discoverMarkets.mock.calls[1][1]).toBe(false)
  })
})
