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
const decodeOffer = vi.hoisted(() => vi.fn())

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
  decodeOffer,
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
  // only the two reconciliation paths decode, and both want the offer's want-asset
  decodeOffer.mockReset().mockReturnValue({ wantAsset: { toString: () => pendingSwap.toAsset } })
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

  const tree = (txs: (typeof mockTxInfo)[], signerPubkey: string = SIGNER_PUBKEY, svcWallet?: unknown) =>
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

  it('feeds the scan the ungrouped rows, not the grouped ones its own records produced', async () => {
    // The second lock on the same door: `txs` replaces a swap's funding row
    // with a grouped `swap` row the moment its record exists, and the scan
    // takes candidates from `sent` rows only. A scan reading `txs` therefore
    // loses the very tx it rebuilt the record from, so exempting the record
    // from both skip lists buys nothing — there is no candidate left to ask
    // about. It could create a record and never re-answer it.
    restoreAssetSwaps.mockResolvedValue({ restored: [], scannedTxids: [] })
    const funding = sentTx('funding-txid')
    const grouped = { ...mockTxInfo, type: 'swap', redeemTxid: 'funding-txid', createdAt: 1 }

    render(
      providerTree(
        {
          asp: { network: '', url: 'https://ark.test', signerPubkey: SIGNER_PUBKEY },
          wallet: { dataReady: true, txs: [grouped], ungroupedTxs: [funding] },
        },
        <ScanHarness />,
      ),
    )

    await waitFor(() => expect(restoreAssetSwaps).toHaveBeenCalledTimes(1))
    expect(restoreAssetSwaps.mock.calls[0][1]).toEqual([funding])
  })

  it('re-asks about a record still open and writes the outcome the chain reports', async () => {
    // The bug this closes: a record whose covenant was never registered — every
    // record a restore rebuilt — has no contract row, so no watcher event and
    // no `reconcileUnseenSpends` pass can reach it. Left in `existingIds` it was
    // skipped by every later scan too, so `pending` was permanent and the swap
    // rendered as a Swap-pending row plus a bare received one, forever.
    const stored: WalletAssetSwap = { ...pendingSwap, quote: { feeBps: 30 } }
    await addAssetSwap(repository, stored)
    await repository.markTxidsScanned([stored.id])
    restoreAssetSwaps.mockResolvedValue({
      restored: [
        // as the scan builds it: every field from chain, and no funded address
        { ...pendingSwap, swapAddress: '', status: 'fulfilled', spentTxid: 'fill-txid', completedAt: 99 },
      ],
      scannedTxids: [stored.id],
    })
    const seams = scanWallet()

    render(tree([sentTx(stored.id)], SIGNER_PUBKEY, seams.svcWallet))

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({
        status: 'fulfilled',
        spentTxid: 'fill-txid',
        completedAt: 99,
        // the two the scan cannot know and must not overwrite
        swapAddress: pendingSwap.swapAddress,
        quote: { feeBps: 30 },
      }),
    )
    // neither skip list may hold it back, or the scan never sees the candidate
    expect(restoreAssetSwaps.mock.calls[0][2].has(stored.id)).toBe(false)
    expect(restoreAssetSwaps.mock.calls[0][3].scanned.has(stored.id)).toBe(false)
    // and the covenant it settled leaves the watched set
    await waitFor(() => expect(seams.setContractWatchState).toHaveBeenCalledWith(stored.swapPkScript, 'retained'))
  })

  it('stops asking about a record the chain has answered', async () => {
    const stored: WalletAssetSwap = { ...pendingSwap, status: 'cancelled', spentTxid: 'cancel-txid' }
    await addAssetSwap(repository, stored)
    await repository.markTxidsScanned([stored.id])
    restoreAssetSwaps.mockResolvedValue({ restored: [], scannedTxids: [] })

    render(tree([sentTx(stored.id)]))

    await waitFor(() => expect(restoreAssetSwaps).toHaveBeenCalledTimes(1))
    expect(restoreAssetSwaps.mock.calls[0][2].has(stored.id)).toBe(true)
    expect(restoreAssetSwaps.mock.calls[0][3].scanned.has(stored.id)).toBe(true)
  })

  it('leaves a cancel in flight alone when the scan has no answer for it yet', async () => {
    // `pending` off the scan means the deposit is still unspent, which is not an
    // outcome. Writing it back would drop the cancel `cancelOffer` is running.
    await addAssetSwap(repository, { ...pendingSwap, status: 'cancelling' })
    restoreAssetSwaps.mockResolvedValue({
      restored: [{ ...pendingSwap, swapAddress: '', status: 'pending' }],
      scannedTxids: [],
    })

    render(tree([sentTx(pendingSwap.id)]))

    await waitFor(() => expect(restoreAssetSwaps).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByTestId('restored')).toHaveTextContent(pendingSwap.id))
    expect((await getAssetSwaps(repository))[0]).toMatchObject({
      status: 'cancelling',
      swapAddress: pendingSwap.swapAddress,
    })
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

describe('AssetSwapsProvider spends the watcher never saw', () => {
  const FILL_TXID = 'fill-txid'
  const SPENT_AT = 1_700_000_000_000

  /** The manager answers for the deposit's fate, history for what spent it. */
  const walletWith = ({ vtxos, history }: { vtxos: unknown[]; history: unknown[] }) => {
    const setContractWatchState = vi.fn().mockResolvedValue(undefined)
    const getContractsWithVtxos = vi.fn().mockResolvedValue([{ vtxos }])
    const getTransactionHistory = vi.fn().mockResolvedValue(history)
    return {
      setContractWatchState,
      getContractsWithVtxos,
      getTransactionHistory,
      svcWallet: {
        identity: {},
        getContractManager: async () => ({ getContractsWithVtxos, setContractWatchState }),
        getTransactionHistory,
      },
    }
  }

  const spentDeposit = {
    contractScript: pendingSwap.swapPkScript,
    txid: pendingSwap.fundingTxid,
    isSpent: true,
    arkTxId: FILL_TXID,
  }

  /** As the SDK reports it, before `arkTransactionToTx` normalizes it. */
  const spendRow = (assets: { assetId: string; amount: bigint }[] = []) => ({
    key: { arkTxid: FILL_TXID, commitmentTxid: '', boardingTxid: '' },
    type: 'SENT',
    amount: 9670,
    settled: true,
    createdAt: SPENT_AT,
    assets,
  })

  const filled = [{ assetId: pendingSwap.toAsset, amount: BigInt(500) }]

  const renderWith = (svcWallet: unknown, reloadWallet = vi.fn().mockResolvedValue(undefined)) =>
    render(
      providerTree(
        { asp: { network: '', url: 'https://ark.test' }, wallet: { reloadWallet, svcWallet } },
        <CancelHarness />,
      ),
    )

  beforeEach(async () => {
    await repository.clear()
    restoreAssetSwaps.mockReset().mockResolvedValue({ restored: [], scannedTxids: [] })
    await addAssetSwap(repository, pendingSwap)
  })

  afterEach(async () => await repository.clear())

  it('resolves a fill that arrived while nothing was listening', async () => {
    const seams = walletWith({ vtxos: [spentDeposit], history: [spendRow(filled)] })
    const reloadWallet = vi.fn().mockResolvedValue(undefined)
    renderWith(seams.svcWallet, reloadWallet)

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
  })

  it('reads a spend that returned the deposit as a cancel', async () => {
    // no want-asset in the spend: the deposit came back rather than being filled
    renderWith(walletWith({ vtxos: [spentDeposit], history: [spendRow()] }).svcWallet)

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({ status: 'cancelled', spentTxid: FILL_TXID }),
    )
    expect((await getAssetSwaps(repository))[0].completedAt).toBeUndefined()
  })

  it('resolves a spend that lands while the app is left open', async () => {
    // the case a run-once-at-start pass cannot reach: the deposit is spent
    // twenty minutes into the session, and the fill's own history row is what
    // makes it classifiable
    const seams = walletWith({ vtxos: [spentDeposit], history: [] })
    const tree = (txs: unknown[]) =>
      providerTree(
        { asp: { network: '', url: 'https://ark.test' }, wallet: { svcWallet: seams.svcWallet, txs } },
        <CancelHarness />,
      )
    const { rerender } = render(tree([]))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'))
    seams.getTransactionHistory.mockResolvedValue([spendRow(filled)])
    rerender(tree([{ redeemTxid: FILL_TXID }]))

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({
        status: 'fulfilled',
        spentTxid: FILL_TXID,
      }),
    )
  })

  it('leaves the record pending while no history row can classify the spend', async () => {
    // a stored status is skipped by every later scan, so a guess here is permanent
    const seams = walletWith({ vtxos: [spentDeposit], history: [] })
    renderWith(seams.svcWallet)

    await waitFor(() => expect(seams.getTransactionHistory).toHaveBeenCalled())
    expect((await getAssetSwaps(repository))[0].status).toBe('pending')
  })

  it('leaves a BTC-want offer alone, where the moved-value test cannot answer', async () => {
    // its cancel nets to zero against the deposit and so reads exactly like a fill
    decodeOffer.mockReturnValue({ offerAsset: { toString: () => 'asset-alpha' } })
    const seams = walletWith({ vtxos: [spentDeposit], history: [spendRow()] })
    renderWith(seams.svcWallet)

    await waitFor(() => expect(seams.getTransactionHistory).toHaveBeenCalled())
    expect((await getAssetSwaps(repository))[0].status).toBe('pending')
    expect(seams.setContractWatchState).not.toHaveBeenCalled()
  })

  it('resolves a swap left cancelling by a restart mid-cancel', async () => {
    await updateAssetSwap(repository, pendingSwap.id, { status: 'cancelling' })
    renderWith(walletWith({ vtxos: [spentDeposit], history: [spendRow()] }).svcWallet)

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({ status: 'cancelled', spentTxid: FILL_TXID }),
    )
  })

  it('writes nothing once the wallet has been switched out from under it', async () => {
    // the reads are slow enough to outlive a switch, and a write past one would
    // land a record in the wallet the user just left
    const seams = walletWith({ vtxos: [spentDeposit], history: [] })
    let deliver!: (history: unknown[]) => void
    seams.getTransactionHistory.mockReturnValue(new Promise((resolve) => (deliver = resolve)))
    const reloadWallet = vi.fn().mockResolvedValue(undefined)
    const { unmount } = renderWith(seams.svcWallet, reloadWallet)

    await waitFor(() => expect(seams.getTransactionHistory).toHaveBeenCalled())
    unmount()
    // deliver, then drain: the continuation has several awaits of its own, and
    // asserting before they run would pass whether or not it stopped. The count
    // is deliberately far above the awaits actually on that path, so adding one
    // cannot quietly turn this into a test that passes on a regressed guard.
    await act(async () => deliver([spendRow(filled)]))
    for (let i = 0; i < 25; i++) await act(async () => {})

    expect((await getAssetSwaps(repository))[0].status).toBe('pending')
    expect(reloadWallet).not.toHaveBeenCalled()
    expect(seams.setContractWatchState).not.toHaveBeenCalled()
  })

  it('does not read history at all when the deposit is still unspent', async () => {
    const seams = walletWith({
      vtxos: [{ ...spentDeposit, isSpent: false, arkTxId: undefined }],
      history: [spendRow(filled)],
    })
    renderWith(seams.svcWallet)

    await waitFor(() => expect(seams.getContractsWithVtxos).toHaveBeenCalled())
    expect(seams.getTransactionHistory).not.toHaveBeenCalled()
    expect((await getAssetSwaps(repository))[0].status).toBe('pending')
    expect(seams.setContractWatchState).not.toHaveBeenCalled()
  })
})
