import { useContext } from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { planOffer, type OfferPlan } from '@arkade-os/solver-discovery'
import { addAssetSwap, getAssetSwaps, updateAssetSwap, type UnifiedSwap } from '@arkade-os/swap'
import { AspContext } from '../../providers/asp'
import { SwapsContext, SwapsProvider } from '../../providers/swaps'
import { WalletContext } from '../../providers/wallet'
import { assetSwapRepository as repository, type WalletAssetSwap } from '../../lib/swapRepository'
import { btcUsdt } from '../lib/swapFixtures'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

/**
 * The provider's own wiring, with the client faked at `makeSwapClient`.
 *
 * That seam rather than the package's exports, and the reason is that v2 closed
 * the old one: the wallet used to call `createOffer`, `cancelOffer` and
 * `watchOfferSwaps` itself, so mocking those exports tested the wallet's use of
 * them. `createSwapClient` now calls them internally, from inside one bundled
 * module, where a mocked export is not the binding it reaches. What is left to
 * test on this side is what the provider does with the client — which order it
 * writes in, what it hands `accept`, and how an update reaches the UI — and the
 * offer encoding those tests used to pin is the package's own suite's now.
 */

const getVtxos = vi.hoisted(() => vi.fn())

vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  RestIndexerProvider: class {
    getVtxos = getVtxos
  },
}))

const accept = vi.hoisted(() => vi.fn())
const cancel = vi.hoisted(() => vi.fn())
const start = vi.hoisted(() => vi.fn())
const close = vi.hoisted(() => vi.fn())
const acceptFunding = vi.hoisted(() => vi.fn())
/** Set by the provider's own `onUpdate`, so a test can push one through. */
const listeners = vi.hoisted(() => [] as ((update: UnifiedSwap) => void)[])

vi.mock('../../lib/swapClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapClient')>()),
  makeSwapClient: () => ({
    client: {
      manager: {
        onSwapFailed: () => () => {},
        onSwapCompleted: () => () => {},
        poll: async () => {},
      },
      onUpdate: (listener: (update: UnifiedSwap) => void) => {
        listeners.push(listener)
        return () => {}
      },
      accept,
      cancel,
      start,
      stop: async () => {},
      quote: vi.fn(),
      swaps: async () => [],
      markets: async () => [],
    },
    acceptFunding,
    close,
  }),
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

// mutinynet is the network with a pinned co-signer key, which arms createSwap.
// The provider drives under a Web Lock; jsdom has none, so the fallback path
// runs — which is the single-tab case these tests are about.
const ASP = { network: 'mutinynet', url: 'https://ark.test' }

function Harness({ plan }: { plan?: OfferPlan }) {
  const { cancelSwap, createSwap, swaps } = useContext(SwapsContext)
  return (
    <>
      <button onClick={() => cancelSwap(pendingSwap.id).catch(() => {})}>Cancel</button>
      {plan ? <button onClick={() => createSwap(btcUsdt, plan, { feeBps: 30 }).catch(() => {})}>Create</button> : null}
      <span data-testid='status'>{swaps.find((s) => s.id === pendingSwap.id)?.status ?? 'none'}</span>
    </>
  )
}

function renderProvider({
  plan,
  reloadWallet = vi.fn().mockResolvedValue(undefined),
}: { plan?: OfferPlan; reloadWallet?: ReturnType<typeof vi.fn> } = {}) {
  render(
    <AspContext.Provider value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, ...ASP } } as any}>
      <WalletContext.Provider
        value={
          {
            ...mockWalletContextValue,
            dataReady: true,
            // the restore scan is a separate concern; an empty history keeps it
            // from reaching for an indexer these tests do not stand up
            txs: [],
            reloadWallet,
            svcWallet: { identity: {} },
          } as any
        }
      >
        <SwapsProvider>
          <Harness plan={plan} />
        </SwapsProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )
  return reloadWallet
}

beforeEach(async () => {
  listeners.length = 0
  await repository.clear()
  accept.mockReset()
  cancel.mockReset().mockResolvedValue(undefined)
  start.mockReset().mockResolvedValue(undefined)
  close.mockReset().mockResolvedValue(undefined)
  acceptFunding.mockReset().mockImplementation(async (fn: () => Promise<unknown>) => ({
    result: await fn(),
    fundingTxid: 'funding-txid-2',
  }))
  getVtxos.mockReset()
})

afterEach(async () => await repository.clear())

describe('SwapsProvider lifecycle', () => {
  it('starts the one client that drives every corridor', async () => {
    renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalledOnce())
  })
})

describe('SwapsProvider createSwap', () => {
  const plan = () => planOffer({ market: btcUsdt, give: 'base', feedValue: 100000, giveAmount: BigInt(10_000) })

  it('accepts the plan the composer quoted, against the market it quoted it on', async () => {
    const composed = plan()
    accept.mockImplementation(async () => {
      await addAssetSwap(repository, { ...pendingSwap, id: 'funding-txid-2', fundingTxid: 'funding-txid-2' })
      return { family: 'offer', swap: { ...pendingSwap, id: 'funding-txid-2', fundingTxid: 'funding-txid-2' } }
    })
    renderProvider({ plan: composed })

    await waitFor(() => expect(start).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(accept).toHaveBeenCalledOnce())
    // Not a re-quote at confirm time: the plan the user read is the plan funded,
    // and the market is the card it was priced on rather than one looked up again.
    expect(accept.mock.calls[0][0]).toEqual({ kind: 'spot', market: btcUsdt, plan: composed })
  })

  it('merges the quote snapshot the client does not own onto the record', async () => {
    accept.mockImplementation(async () => {
      await addAssetSwap(repository, pendingSwap)
      return { family: 'offer', swap: pendingSwap }
    })
    renderProvider({ plan: plan() })

    await waitFor(() => expect(start).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    // Tickers, decimals and the fee rate frozen at quote time are all the
    // activity row has once the market card moves on. Written after the record
    // rather than into it — the repository stores records whole, so the merge
    // survives package-side writes.
    await waitFor(async () => expect((await getAssetSwaps(repository))[0]).toMatchObject({ quote: { feeBps: 30 } }))
  })
})

describe('SwapsProvider cancellation', () => {
  beforeEach(async () => await addAssetSwap(repository, pendingSwap))

  it('marks the record cancelling before the spend, so a fill cannot read as ours', async () => {
    let statusAtCancel: string | undefined
    cancel.mockImplementation(async () => {
      statusAtCancel = (await getAssetSwaps(repository))[0].status
    })
    const reloadWallet = renderProvider()

    await waitFor(() => expect(start).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(cancel).toHaveBeenCalledWith(pendingSwap.fundingTxid))
    expect(statusAtCancel).toBe('cancelling')
    // `cancelOffer` records its own outcome when it can match the record; this
    // is the write for when it did not.
    await waitFor(async () => expect((await getAssetSwaps(repository))[0].status).toBe('cancelled'))
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
  })

  it('leaves the outcome the package already wrote alone', async () => {
    cancel.mockImplementation(async () => {
      await updateAssetSwap(repository, pendingSwap.id, { status: 'cancelled', spentTxid: 'cancel-txid' })
    })
    renderProvider()

    await waitFor(() => expect(start).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(async () =>
      expect((await getAssetSwaps(repository))[0]).toMatchObject({ status: 'cancelled', spentTxid: 'cancel-txid' }),
    )
  })

  it('does not restore a stale status after another path resolves the cancellation', async () => {
    cancel.mockRejectedValue(new Error('cancel failed'))
    let resolveVtxos!: (value: { vtxos: { txid: string; virtualStatus: { state: string } }[] }) => void
    getVtxos.mockReturnValue(new Promise((resolve) => (resolveVtxos = resolve)))

    renderProvider()

    await waitFor(() => expect(start).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(async () => expect((await getAssetSwaps(repository))[0].status).toBe('cancelling'))

    await updateAssetSwap(repository, pendingSwap.id, { status: 'fulfilled' })
    resolveVtxos({ vtxos: [{ txid: pendingSwap.fundingTxid, virtualStatus: { state: 'settled' } }] })

    await waitFor(async () => expect((await getAssetSwaps(repository))[0].status).toBe('fulfilled'))
  })
})

describe('SwapsProvider updates', () => {
  beforeEach(async () => await addAssetSwap(repository, pendingSwap))

  it('adopts an offer status the client persisted', async () => {
    const reloadWallet = renderProvider()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'))
    await waitFor(() => expect(listeners).toHaveLength(1))

    listeners[0]({ family: 'offer', swap: { ...pendingSwap, status: 'fulfilled', spentTxid: 'fill-txid' } as never })

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('fulfilled'))
    // the fill moved value, so the balance has to be re-read
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
  })
})
