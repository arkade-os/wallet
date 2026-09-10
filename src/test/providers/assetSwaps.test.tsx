import { ReactNode, StrictMode, useContext } from 'react'
import userEvent from '@testing-library/user-event'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import { planOffer, type OfferPlan } from '@arkade-os/solver-discovery'
import { addAssetSwap, getAssetSwaps, updateAssetSwap, type RestoreAssetSwapRepositoryResult } from '@arkade-os/swap'
import { AspContext } from '../../providers/asp'
import { AssetSwapsContext, AssetSwapsProvider } from '../../providers/assetSwaps'
import { WalletContext } from '../../providers/wallet'
import { assetSwapRepository as repository, type WalletAssetSwap } from '../../lib/swapRepository'
import { btcUsdt, maratNapo, MARAT_ID, NAPO_ID, USDT_ID } from '../lib/swapFixtures'
import corridorSolverCard from '../corridor-solver.card.json'
import { saveSolverCards } from '../../lib/solverCards'
import { toast } from '../../components/Toast'
import { mockAspContextValue, mockTxInfo, mockWalletContextValue } from '../screens/mocks'

const cancelOffer = vi.hoisted(() => vi.fn())
const createOffer = vi.hoisted(() => vi.fn())
const getVtxos = vi.hoisted(() => vi.fn())
const getVirtualTxs = vi.hoisted(() => vi.fn())
const classifyDepositSpend = vi.hoisted(() => vi.fn())
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const discoverMarkets = vi.hoisted(() => vi.fn(async (_network: string, _useCache?: boolean) => []))
const restoreAssetSwapRepository = vi.hoisted(() => vi.fn())
const watchOfferSwaps = vi.hoisted(() => vi.fn())
const decodeOffer = vi.hoisted(() => vi.fn())

vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  RestIndexerProvider: class {
    getVtxos = getVtxos
    getVirtualTxs = getVirtualTxs
  },
}))

vi.mock('@arkade-os/swap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap')>()),
  cancelOffer,
  classifyDepositSpend,
  createOffer,
  decodeOffer,
  restoreAssetSwapRepository,
  watchOfferSwaps,
}))

// the provider's repository, swapped for the in-memory one: jsdom has no
// IndexedDB, and these tests are about the provider's own transitions
vi.mock('../../lib/swapRepository', async () => {
  const { InMemoryAssetSwapRepository } = await vi.importActual<typeof import('@arkade-os/swap')>('@arkade-os/swap')
  return { assetSwapRepository: new InMemoryAssetSwapRepository() }
})

// keep the discovery effect off the network; these tests hand plans in directly
// only `toast.success` is spied; the provider component and everything else in
// the module stay real, since the tree renders them
vi.mock('../../components/Toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../components/Toast')>()
  return { ...actual, toast: { ...actual.toast, success: vi.fn() } }
})

vi.mock('../../lib/swapMarkets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapMarkets')>()),
  discoverMarkets,
}))

// valid hex: the provider decodes it to the x-only key the covenants were funded against
const SIGNER_PUBKEY = `02${'ab'.repeat(32)}`
/** A server to classify against: a url to read spends from, and the key the
 * covenants were funded to. */
const asp = { network: '', url: 'https://ark.test', signerPubkey: SIGNER_PUBKEY }

const FILL_TXID = 'fill-txid'
const CHECKPOINT_TXID = 'checkpoint-txid'

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

/** The deposit spent, as the indexer and the contract manager report it: the
 * checkpoint is `spentBy`, the ark tx `arkTxId`, and only the checkpoint's
 * input names the covenant leaf. */
const spentDeposit = {
  contractScript: pendingSwap.swapPkScript,
  txid: pendingSwap.fundingTxid,
  vout: 0,
  isSpent: true,
  spentBy: CHECKPOINT_TXID,
  arkTxId: FILL_TXID,
}
const unspentDeposit = { ...spentDeposit, isSpent: false, spentBy: undefined, arkTxId: undefined }

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

function renderProvider(
  reloadWallet = vi.fn().mockResolvedValue(undefined),
  aspOverrides: Record<string, unknown> = {},
) {
  render(
    providerTree(
      { asp: { network: '', url: '', ...aspOverrides }, wallet: { reloadWallet, svcWallet: { identity: {} } } },
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
  // the offer is decoded only to be handed to the leaf classifier, which is
  // mocked: what it is handed is asserted, what it answers is set per test
  decodeOffer.mockReset().mockReturnValue({ wantAsset: { toString: () => pendingSwap.toAsset } })
  getVirtualTxs.mockReset().mockResolvedValue({ txs: [] })
  classifyDepositSpend.mockReset().mockReturnValue('fulfilled')
  restoreAssetSwapRepository.mockReset().mockResolvedValue({
    swaps: [],
    changes: [],
    scannedTxids: [],
    aborted: false,
  })
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

  it('classifies the spend behind a failed cancel by its covenant leaf', async () => {
    // the cancel threw, but the deposit is gone: a solver may have filled it
    // first, and the leaf says which
    cancelOffer.mockRejectedValue(new Error('cancel failed'))
    getVtxos.mockResolvedValue({ vtxos: [{ ...spentDeposit, virtualStatus: { state: 'spent' } }] })
    const reloadWallet = renderProvider(undefined, asp)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({ status: 'fulfilled', spentTxid: FILL_TXID }),
    )
    expect(reloadWallet).toHaveBeenCalled()
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
    renderProvider(undefined, { url: 'https://ark.test' })
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
  const restoredSwap: WalletAssetSwap = { ...pendingSwap, id: 'restored-txid', fundingTxid: 'restored-txid' }
  const sentTx = (redeemTxid: string) => ({ ...mockTxInfo, type: 'sent', redeemTxid, createdAt: 1 })

  function ScanHarness() {
    const { swaps } = useContext(AssetSwapsContext)
    return <span data-testid='restored'>{swaps.map((s) => s.id).join(',') || 'none'}</span>
  }

  const defaultManager = { getContractsWithVtxos: vi.fn().mockResolvedValue([]) }
  const defaultSvcWallet = { identity: {}, getContractManager: async () => defaultManager }
  const tree = (
    txs: (typeof mockTxInfo)[],
    signerPubkey: string = SIGNER_PUBKEY,
    svcWallet: unknown = defaultSvcWallet,
  ) =>
    providerTree(
      {
        asp: { network: '', url: 'https://ark.test', signerPubkey },
        // the scan reads the ungrouped rows; `txs` is the grouped display list
        wallet: { dataReady: true, txs, ungroupedTxs: txs, svcWallet },
      },
      <ScanHarness />,
    )

  /** A wallet whose contract manager answers both reconciliation paths: nothing
   * spent for `reconcileUnseenSpends`, and a retire the scan can be seen to make. */
  const scanWallet = () => {
    const setContractWatchState = vi.fn().mockResolvedValue(undefined)
    const manager = { setContractWatchState, getContractsWithVtxos: vi.fn().mockResolvedValue([]) }
    return { setContractWatchState, svcWallet: { identity: {}, getContractManager: async () => manager } }
  }

  type RestoreResult = RestoreAssetSwapRepositoryResult
  const result = (swaps: WalletAssetSwap[] = [], changes: RestoreResult['changes'] = []): RestoreResult => ({
    swaps,
    changes,
    scannedTxids: [],
    aborted: false,
  })
  const mockResult = (value: RestoreResult) =>
    restoreAssetSwapRepository.mockImplementation(async (opts: { repository: typeof repository }) => {
      for (const { current } of value.changes) await opts.repository.saveSwap(current)
      if (value.scannedTxids.length > 0) await opts.repository.markTxidsScanned(value.scannedTxids)
      return value
    })

  /** Renders with the first SDK restore held open, so a rerender lands
   * while a scan is provably in flight. Returns the release for that run. */
  const renderBlockedScan = async () => {
    let release: (value: RestoreResult) => void = () => {}
    restoreAssetSwapRepository
      .mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
      .mockResolvedValue(result())
    const { rerender } = render(tree([sentTx('a')]))
    await waitFor(() => expect(restoreAssetSwapRepository).toHaveBeenCalledTimes(1))
    return { rerender, release }
  }

  beforeEach(async () => {
    await repository.clear()
    restoreAssetSwapRepository.mockReset().mockResolvedValue(result())
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
    release(result([restoredSwap], [{ current: restoredSwap }]))

    await waitFor(() => expect(screen.getByTestId('restored')).toHaveTextContent('restored-txid'))
  })

  it('starts a scan for the new wallet when the profile changed mid-scan', async () => {
    // The queued run may belong to another wallet by the time the lock frees:
    // re-entering through the effect is what lets it read the profile current
    // then, instead of the one the finishing run was bound to.
    const OTHER_PUBKEY = `02${'cd'.repeat(32)}`
    const { rerender, release } = await renderBlockedScan()

    rerender(tree([sentTx('a')], OTHER_PUBKEY))
    release(result([restoredSwap], [{ current: restoredSwap }]))

    await waitFor(() => expect(restoreAssetSwapRepository).toHaveBeenCalledTimes(2))
    expect(restoreAssetSwapRepository.mock.calls[1][0].serverPubkey).toEqual(hex.decode('cd'.repeat(32)))
    // and the abandoned run wrote nothing for the wallet that went away
    expect(screen.getByTestId('restored')).toHaveTextContent('none')
  })

  it('scans under StrictMode, whose setup/cleanup/setup would strand the unmounted flag', async () => {
    restoreAssetSwapRepository.mockResolvedValue(result([restoredSwap], [{ current: restoredSwap }]))

    render(<StrictMode>{tree([sentTx('a')])}</StrictMode>)

    await waitFor(() => expect(screen.getByTestId('restored')).toHaveTextContent('restored-txid'))
  })

  it('goes round again with the history that arrived mid-scan', async () => {
    let release: (value: RestoreResult) => void = () => {}
    restoreAssetSwapRepository
      .mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
      .mockResolvedValue(result())

    const { rerender } = render(tree([sentTx('a')]))
    await waitFor(() => expect(restoreAssetSwapRepository).toHaveBeenCalledTimes(1))
    expect(restoreAssetSwapRepository.mock.calls[0][0].txs).toHaveLength(1)

    // a run skipped because another was in flight must not be a run lost
    rerender(tree([sentTx('a'), sentTx('b')]))
    release(result())

    await waitFor(() => expect(restoreAssetSwapRepository).toHaveBeenCalledTimes(2))
    // and it sees the newer history, not the list its effect closed over
    expect(restoreAssetSwapRepository.mock.calls[1][0].txs).toHaveLength(2)
  })

  it('feeds the scan the ungrouped rows, not the grouped ones its own records produced', async () => {
    // The second lock on the same door: `txs` replaces a swap's funding row
    // with a grouped `swap` row the moment its record exists, and the scan
    // takes candidates from `sent` rows only. A scan reading `txs` therefore
    // loses the very tx it rebuilt the record from, so exempting the record
    // from both skip lists buys nothing — there is no candidate left to ask
    // about. It could create a record and never re-answer it.
    restoreAssetSwapRepository.mockResolvedValue(result())
    const funding = sentTx('funding-txid')
    const grouped = { ...mockTxInfo, type: 'swap', redeemTxid: 'funding-txid', createdAt: 1 }

    render(
      providerTree(
        {
          asp: { network: '', url: 'https://ark.test', signerPubkey: SIGNER_PUBKEY },
          wallet: { dataReady: true, txs: [grouped], ungroupedTxs: [funding], svcWallet: defaultSvcWallet },
        },
        <ScanHarness />,
      ),
    )

    await waitFor(() => expect(restoreAssetSwapRepository).toHaveBeenCalledTimes(1))
    expect(restoreAssetSwapRepository.mock.calls[0][0].txs).toEqual([funding])
  })

  it('applies an SDK-restored outcome and retires its covenant', async () => {
    const stored: WalletAssetSwap = { ...pendingSwap, quote: { feeBps: 30 } }
    await addAssetSwap(repository, stored)
    const restored = { ...stored, status: 'fulfilled' as const, spentTxid: 'fill-txid', completedAt: 99 }
    mockResult(result([restored], [{ previous: stored, current: restored }]))
    const seams = scanWallet()

    render(tree([sentTx(stored.id)], SIGNER_PUBKEY, seams.svcWallet))

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({
        status: 'fulfilled',
        spentTxid: 'fill-txid',
        completedAt: 99,
        // the SDK preserved the two fields chain data cannot know
        swapAddress: pendingSwap.swapAddress,
        quote: { feeBps: 30 },
      }),
    )
    expect(restoreAssetSwapRepository.mock.calls[0][0]).toMatchObject({
      wallet: seams.svcWallet,
      arkServerUrl: 'https://ark.test',
      repository,
    })
    // and the covenant it settled leaves the watched set
    await waitFor(() => expect(seams.setContractWatchState).toHaveBeenCalledWith(stored.swapPkScript, 'retained'))
  })

  it('delegates records, cursor and coverage to the SDK even with no history rows', async () => {
    await addAssetSwap(repository, pendingSwap)
    const { svcWallet } = scanWallet()

    render(tree([], SIGNER_PUBKEY, svcWallet))

    await waitFor(() => expect(restoreAssetSwapRepository).toHaveBeenCalledTimes(1))
    expect(restoreAssetSwapRepository.mock.calls[0][0]).toMatchObject({
      wallet: svcWallet,
      arkServerUrl: 'https://ark.test',
      repository,
      txs: [],
      serverPubkey: hex.decode('ab'.repeat(32)),
    })
  })

  it('does not apply an aborted restore result', async () => {
    restoreAssetSwapRepository.mockResolvedValue({
      ...result([restoredSwap], [{ current: restoredSwap }]),
      aborted: true,
    })

    render(tree([sentTx(restoredSwap.id)]))

    await waitFor(() => expect(restoreAssetSwapRepository).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('restored')).toHaveTextContent('none')
  })

  it('keeps restored changes when covenant coverage fails', async () => {
    mockResult({
      ...result([restoredSwap], [{ current: restoredSwap }]),
      coverageError: new Error('coverage unavailable'),
    })

    render(tree([sentTx(restoredSwap.id)]))

    await waitFor(() => expect(screen.getByTestId('restored')).toHaveTextContent(restoredSwap.id))
  })
})

describe('AssetSwapsProvider solver cards', () => {
  function Bare() {
    return null
  }

  const corridorMarket = {
    ...corridorSolverCard.markets[0],
    discovery_pubkey: corridorSolverCard.discovery_pubkey,
    transports: corridorSolverCard.transports,
  }

  const quoteIdOf = (market: { quote_asset?: unknown }) => (market.quote_asset as { id?: string } | undefined)?.id ?? ''

  const renderOnNetwork = (children: ReactNode = <Bare />) =>
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
          <AssetSwapsProvider>{children}</AssetSwapsProvider>
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

  it('backfills missing persisted fees after market discovery', async () => {
    await repository.clear()
    const stored = { ...pendingSwap, toAsset: USDT_ID, quote: { fromTicker: 'sats' } }
    const alreadyPriced = {
      ...stored,
      id: 'already-priced',
      fundingTxid: 'already-priced',
      quote: { feeBps: 12 },
    }
    await addAssetSwap(repository, stored)
    await addAssetSwap(repository, alreadyPriced)
    discoverMarkets.mockResolvedValueOnce([btcUsdt] as never)

    renderOnNetwork()

    await waitFor(async () => {
      const swaps = await getAssetSwaps(repository)
      expect(swaps.find(({ id }) => id === stored.id)).toMatchObject({ quote: { fromTicker: 'sats', feeBps: 30 } })
      expect(swaps.find(({ id }) => id === alreadyPriced.id)).toMatchObject({ quote: { feeBps: 12 } })
    })
    await repository.clear()
  })

  it('keeps a corridor market out of the spot swap surface', async () => {
    // The corridor is the registry's own post-#23 card, where the rail is named
    // inside the asset id. The pre-#23 check read a field that shape does not
    // carry, so every corridor market fell through it into a surface that
    // cannot trade one.
    function QuoteIds() {
      return <div data-testid='quote-ids'>{useContext(AssetSwapsContext).markets.map(quoteIdOf).join(' ')}</div>
    }
    discoverMarkets.mockResolvedValueOnce([corridorMarket, btcUsdt] as never)

    renderOnNetwork(<QuoteIds />)

    await waitFor(() => expect(screen.getByTestId('quote-ids')).toHaveTextContent(USDT_ID))
    expect(screen.getByTestId('quote-ids')).not.toHaveTextContent('bolt11')
  })
})

describe('AssetSwapsProvider spends the watcher never saw', () => {
  const SPENT_AT = 1_700_000_000_000

  /** The manager answers for the deposit's fate; the spends come off the mocked
   * indexer and the mocked leaf classifier. */
  const walletWith = (vtxos: unknown[]) => {
    const setContractWatchState = vi.fn().mockResolvedValue(undefined)
    const getContractsWithVtxos = vi.fn().mockResolvedValue([{ vtxos }])
    return {
      setContractWatchState,
      getContractsWithVtxos,
      svcWallet: { identity: {}, getContractManager: async () => ({ getContractsWithVtxos, setContractWatchState }) },
    }
  }

  /** The wallet's own row for the spend, as `ungroupedTxs` carries it: seconds,
   * and whatever assets the cache held when the row was built. */
  const spendRow = (assets: { assetId: string; amount: bigint }[] = []) => ({
    ...mockTxInfo,
    type: 'sent',
    boardingTxid: '',
    redeemTxid: FILL_TXID,
    createdAt: SPENT_AT / 1000,
    assets,
  })
  const filled = [{ assetId: pendingSwap.toAsset, amount: BigInt(500) }]

  const renderWith = (svcWallet: unknown, wallet: Record<string, unknown> = {}) =>
    render(providerTree({ asp, wallet: { svcWallet, ...wallet } }, <CancelHarness />))

  beforeEach(async () => {
    await repository.clear()
    restoreAssetSwapRepository.mockReset().mockResolvedValue({
      swaps: [pendingSwap],
      changes: [],
      scannedTxids: [],
      aborted: false,
    })
    vi.mocked(toast.success).mockClear()
    await addAssetSwap(repository, pendingSwap)
  })

  afterEach(async () => await repository.clear())

  it('resolves a fill that arrived while nothing was listening', async () => {
    const seams = walletWith([spentDeposit])
    const reloadWallet = vi.fn().mockResolvedValue(undefined)
    renderWith(seams.svcWallet, { reloadWallet, ungroupedTxs: [spendRow(filled)] })

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({
        status: 'fulfilled',
        spentTxid: FILL_TXID,
        completedAt: SPENT_AT,
      }),
    )
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('fulfilled'))
    // scoped to the covenants in question, and the settled one leaves the watched set
    expect(seams.getContractsWithVtxos).toHaveBeenCalledWith({ script: [pendingSwap.swapPkScript] })
    await waitFor(() => expect(seams.setContractWatchState).toHaveBeenCalledWith(pendingSwap.swapPkScript, 'retained'))
    expect(reloadWallet).toHaveBeenCalled()
    // classified from the covenant leaf: both spends fetched, since a deposit
    // spent through a checkpoint carries the leaf there and not in the ark tx,
    // and the offer read against the x-only server key the deposit was funded to
    expect(getVirtualTxs).toHaveBeenCalledWith([CHECKPOINT_TXID, FILL_TXID])
    const [offer, serverPubkey, , outpoint] = classifyDepositSpend.mock.calls[0]
    expect(offer).toBe(decodeOffer.mock.results[0].value)
    expect(hex.encode(serverPubkey)).toBe(SIGNER_PUBKEY.slice(2))
    expect(outpoint).toEqual({ txid: pendingSwap.fundingTxid, vout: 0 })
  })

  it('writes the leaf, not what the history row says moved', async () => {
    // the row shape that was read as a cancel, a bare send of the deposit with
    // no want-asset on it (see `classifyDeposit`); the leaf says fill
    renderWith(walletWith([spentDeposit]).svcWallet, { ungroupedTxs: [spendRow()] })

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({
        status: 'fulfilled',
        spentTxid: FILL_TXID,
        completedAt: SPENT_AT,
      }),
    )
  })

  it('writes a cancel the leaf reports, whatever the row or the offer shows', async () => {
    // a row that looks like a fill, on a BTC-want offer whose cancel nets to
    // zero and used to be left alone: neither is consulted any more
    decodeOffer.mockReturnValue({ offerAsset: { toString: () => 'asset-alpha' } })
    classifyDepositSpend.mockReturnValue('cancelled')
    renderWith(walletWith([spentDeposit]).svcWallet, { ungroupedTxs: [spendRow(filled)] })

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({ status: 'cancelled', spentTxid: FILL_TXID }),
    )
    expect((await getAssetSwaps(repository))[0].completedAt).toBeUndefined()
  })

  it('resolves a fill before its own history row has landed', async () => {
    // the leaf answers as soon as the indexer serves the spend; the row is
    // only the completion time, and without it the write is dated now
    renderWith(walletWith([spentDeposit]).svcWallet)

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({ status: 'fulfilled', spentTxid: FILL_TXID }),
    )
    expect((await getAssetSwaps(repository))[0].completedAt).toBeGreaterThan(SPENT_AT)
  })

  it('reads every spend of a pass off the indexer in one round-trip', async () => {
    const second: WalletAssetSwap = {
      ...pendingSwap,
      id: 'funding-txid-2',
      fundingTxid: 'funding-txid-2',
      swapPkScript: `5120${'cd'.repeat(32)}`,
    }
    await addAssetSwap(repository, second)
    const secondDeposit = {
      ...spentDeposit,
      contractScript: second.swapPkScript,
      txid: second.fundingTxid,
      spentBy: 'checkpoint-txid-2',
      arkTxId: 'fill-txid-2',
    }
    renderWith(walletWith([spentDeposit, secondDeposit]).svcWallet)

    await waitFor(async () => {
      const swaps = await getAssetSwaps(repository)
      expect(swaps).toHaveLength(2)
      expect(swaps.every((swap) => swap.status === 'fulfilled')).toBe(true)
    })
    expect(getVirtualTxs).toHaveBeenCalledTimes(1)
    expect(getVirtualTxs.mock.calls[0][0]).toHaveLength(4)
    expect(getVirtualTxs.mock.calls[0][0]).toEqual(
      expect.arrayContaining([CHECKPOINT_TXID, FILL_TXID, 'checkpoint-txid-2', 'fill-txid-2']),
    )
  })

  it('resolves a spend that lands while the app is left open', async () => {
    // the case a run-once-at-start pass cannot reach: the deposit is spent
    // twenty minutes into the session
    const seams = walletWith([unspentDeposit])
    const tree = (txs: unknown[]) =>
      providerTree({ asp, wallet: { svcWallet: seams.svcWallet, txs, ungroupedTxs: txs } }, <CancelHarness />)
    const { rerender } = render(tree([mockTxInfo]))

    await waitFor(() => expect(seams.getContractsWithVtxos).toHaveBeenCalled())
    expect((await getAssetSwaps(repository))[0].status).toBe('pending')
    seams.getContractsWithVtxos.mockResolvedValue([{ vtxos: [spentDeposit] }])
    rerender(tree([mockTxInfo, spendRow(filled)]))

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({
        status: 'fulfilled',
        spentTxid: FILL_TXID,
        completedAt: SPENT_AT,
      }),
    )
  })

  it('announces a resolved swap once when the watcher and this pass both land on it', async () => {
    // `watch.ts` notifies through `updateAssetSwapBestEffort`, so it can
    // announce an outcome it failed to persist. This pass then re-reads
    // `pending` from the store, resolves it for real, and with a toast per
    // writer the user is told twice about one swap.
    const seams = walletWith([unspentDeposit])
    const tree = (txs: unknown[]) =>
      providerTree({ asp, wallet: { svcWallet: seams.svcWallet, txs, ungroupedTxs: txs } }, <CancelHarness />)
    const { rerender } = render(tree([mockTxInfo]))
    await waitFor(() => expect(watchOfferSwaps).toHaveBeenCalled())

    act(() => watchOfferSwaps.mock.calls[0][0].onUpdate({ ...pendingSwap, status: 'fulfilled', spentTxid: FILL_TXID }))
    expect(toast.success).toHaveBeenCalledTimes(1)

    seams.getContractsWithVtxos.mockResolvedValue([{ vtxos: [spentDeposit] }])
    rerender(tree([mockTxInfo, spendRow(filled)]))

    await waitFor(async () => expect((await getAssetSwaps(repository))[0].status).toBe('fulfilled'))
    expect(toast.success).toHaveBeenCalledTimes(1)
  })

  it('leaves the record pending while the leaf has no answer', async () => {
    // a stored status is permanent, so nothing else fills in for the leaf: not
    // the row, however much it looks like a fill
    classifyDepositSpend.mockReturnValue('indeterminate')
    const seams = walletWith([spentDeposit])
    renderWith(seams.svcWallet, { ungroupedTxs: [spendRow(filled)] })

    await waitFor(() => expect(classifyDepositSpend).toHaveBeenCalled())
    expect((await getAssetSwaps(repository))[0].status).toBe('pending')
    expect(seams.setContractWatchState).not.toHaveBeenCalled()
  })

  it('does not ask the indexer before the server key is known', async () => {
    // the leaf is checked against the key the covenant was funded to
    const seams = walletWith([spentDeposit])
    render(
      providerTree({ asp: { ...asp, signerPubkey: '' }, wallet: { svcWallet: seams.svcWallet } }, <CancelHarness />),
    )

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'))
    for (let i = 0; i < 5; i++) await act(async () => {})
    expect(getVirtualTxs).not.toHaveBeenCalled()
    expect((await getAssetSwaps(repository))[0].status).toBe('pending')
  })

  it('resolves a swap left cancelling by a restart mid-cancel', async () => {
    classifyDepositSpend.mockReturnValue('cancelled')
    await updateAssetSwap(repository, pendingSwap.id, { status: 'cancelling' })
    renderWith(walletWith([spentDeposit]).svcWallet)

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({ status: 'cancelled', spentTxid: FILL_TXID }),
    )
  })

  it('writes nothing once the wallet has been switched out from under it', async () => {
    // the indexer read is slow enough to outlive a switch, and a write past one
    // would land a record in the wallet the user just left
    const seams = walletWith([spentDeposit])
    let deliver!: (result: { txs: string[] }) => void
    getVirtualTxs.mockReturnValue(new Promise((resolve) => (deliver = resolve)))
    const reloadWallet = vi.fn().mockResolvedValue(undefined)
    const { unmount } = renderWith(seams.svcWallet, { reloadWallet })

    await waitFor(() => expect(getVirtualTxs).toHaveBeenCalled())
    unmount()
    // deliver, then drain: the continuation has several awaits of its own, and
    // asserting before they run would pass whether or not it stopped. The count
    // is deliberately far above the awaits actually on that path, so adding one
    // cannot quietly turn this into a test that passes on a regressed guard.
    await act(async () => deliver({ txs: [] }))
    for (let i = 0; i < 25; i++) await act(async () => {})

    expect((await getAssetSwaps(repository))[0].status).toBe('pending')
    expect(reloadWallet).not.toHaveBeenCalled()
    expect(seams.setContractWatchState).not.toHaveBeenCalled()
  })

  it('does not ask the indexer while the deposit is still unspent', async () => {
    const seams = walletWith([unspentDeposit])
    renderWith(seams.svcWallet, { ungroupedTxs: [spendRow(filled)] })

    await waitFor(() => expect(seams.getContractsWithVtxos).toHaveBeenCalled())
    for (let i = 0; i < 5; i++) await act(async () => {})
    expect(getVirtualTxs).not.toHaveBeenCalled()
    expect((await getAssetSwaps(repository))[0].status).toBe('pending')
    expect(seams.setContractWatchState).not.toHaveBeenCalled()
  })
})
