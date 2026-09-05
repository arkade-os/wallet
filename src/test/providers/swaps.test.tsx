import { useContext } from 'react'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { planOffer, type OfferPlan } from '@arkade-os/solver-discovery'
import type { Quote, Swap, SwapRecord, SwapUpdate } from '@arkade-os/swap/client'
import { AspContext } from '../../providers/asp'
import { SwapsContext, SwapsProvider } from '../../providers/swaps'
import { WalletContext } from '../../providers/wallet'
import { assetSwapRepository as repository, quoteSnapshotOf } from '../../lib/swapRepository'
import { btcUsdt, USDT_ID } from '../lib/swapFixtures'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

/**
 * The provider's own wiring, with the client faked at `makeSwapClient`.
 *
 * That seam rather than the package's exports: the v2 client owns the offer
 * encoding, the funding, the persistence and the drive, all inside one bundled
 * module where a mocked export is not the binding it reaches. What is left to
 * test on this side is what the provider does with the client — the route it
 * quotes, the floor it holds the re-quote to, what it does with each cancel
 * outcome, and how an update reaches the UI.
 */

const accept = vi.hoisted(() => vi.fn())
const cancel = vi.hoisted(() => vi.fn())
const quote = vi.hoisted(() => vi.fn())
const ready = vi.hoisted(() => vi.fn())
/** Set by the provider's own `onUpdate`, so a test can push one through. */
const listeners = vi.hoisted(() => [] as ((update: SwapUpdate) => void)[])

vi.mock('../../lib/swapClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapClient')>()),
  makeSwapClient: () => ({
    get ready() {
      return ready()
    },
    onUpdate: (listener: (update: SwapUpdate) => void) => {
      listeners.push(listener)
      return () => {}
    },
    quote,
    accept,
    cancel,
    receive: vi.fn(),
    pay: vi.fn(),
    exchange: vi.fn(),
    resolve: vi.fn(),
    recover: vi.fn(),
    swaps: async () => [],
    markets: async () => [],
    start: async () => {},
    stop: async () => {},
    [Symbol.asyncDispose]: async () => {},
  }),
}))

// the provider's repository, swapped for the in-memory one: jsdom has no
// IndexedDB, and these tests are about the provider's own transitions. The rest
// of the module is kept — the quote snapshot store lives there too.
vi.mock('../../lib/swapRepository', async (importOriginal) => {
  const { InMemoryAssetSwapRepository } = await vi.importActual<typeof import('@arkade-os/swap')>('@arkade-os/swap')
  return {
    ...(await importOriginal<typeof import('../../lib/swapRepository')>()),
    assetSwapRepository: new InMemoryAssetSwapRepository(),
  }
})

// keep the discovery effect off the network; these tests hand plans in directly
vi.mock('../../lib/swapMarkets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapMarkets')>()),
  discoverMarkets: async () => [],
}))

const SWAP_ID = 'offer:quote-1'

const offerRecord = (over: Record<string, unknown> = {}): SwapRecord =>
  ({
    id: 'quote-1',
    family: 'offer',
    status: 'pending',
    route: {
      give: {
        corridor: 'arkade',
        asset: 'arkade:mutinynet/slip44:0',
        instrument: { kind: 'address', address: 'tark1q' },
      },
      take: {
        corridor: 'arkade',
        asset: 'arkade:mutinynet/asset:' + USDT_ID,
        instrument: { kind: 'address', address: 'tark1q' },
      },
    },

    fundingTxid: 'funding-txid',
    offerHex: '0100',
    swapAddress: 'tark1q...',
    swapPkScript: '5120' + 'ab'.repeat(32),
    give: { asset: 'arkade:mutinynet/slip44:0', amount: '10000' },
    take: { asset: `arkade:mutinynet/asset:${USDT_ID}`, amount: '992' },
    fee: { asset: 'arkade:mutinynet/slip44:0', amount: '0' },
    createdAt: 2,
    updatedAt: 2,
    ...over,
  }) as unknown as SwapRecord

const accepted = (over: Partial<Swap> = {}): Swap =>
  ({
    id: SWAP_ID,
    family: 'offer',
    outcome: 'funded',
    fundingTxid: 'funding-txid',
    give: { asset: 'arkade:mutinynet/slip44:0', amount: BigInt(10_000) },
    take: { asset: `arkade:mutinynet/asset:${USDT_ID}`, amount: BigInt(992) },
    ...over,
  }) as Swap

const update = (swap: Swap): SwapUpdate => ({ swap, outcome: swap.outcome, detail: {} }) as unknown as SwapUpdate

// mutinynet is the network with a pinned co-signer key, which arms exchange.
// The provider drives under a Web Lock; jsdom has none, so the fallback path
// runs — which is the single-tab case these tests are about.
const ASP = { network: 'mutinynet', url: 'https://ark.test' }

function Harness({ plan }: { plan?: OfferPlan }) {
  const { cancelSwap, exchange, swaps } = useContext(SwapsContext)
  return (
    <>
      <button onClick={() => cancelSwap(SWAP_ID).catch(() => {})}>Cancel</button>
      {plan ? <button onClick={() => exchange(btcUsdt, plan, { feeBps: 30 }).catch(() => {})}>Create</button> : null}
      <span data-testid='status'>{swaps.find((s) => s.id === 'quote-1')?.status ?? 'none'}</span>
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

const plan = () => planOffer({ market: btcUsdt, give: 'base', feedValue: 100000, giveAmount: BigInt(10_000) })

beforeEach(async () => {
  listeners.length = 0
  localStorage.clear()
  for (const record of await repository.getAllSwapRecords()) await repository.removeSwapRecord(record.id)
  ready.mockReset().mockResolvedValue(undefined)
  quote.mockReset()
  accept.mockReset().mockResolvedValue(accepted())
  cancel.mockReset().mockResolvedValue({ outcome: 'cancelled' })
})

afterEach(async () => {
  for (const record of await repository.getAllSwapRecords()) await repository.removeSwapRecord(record.id)
})

describe('SwapsProvider lifecycle', () => {
  it('readies the one client that drives every corridor', async () => {
    renderProvider()
    await waitFor(() => expect(ready).toHaveBeenCalledOnce())
  })
})

describe('SwapsProvider exchange', () => {
  it('quotes the pair as CAIP-19 ids with the amount pinned on the give leg', async () => {
    const composed = plan()
    quote.mockResolvedValue({ id: 'quote-1', take: { amount: composed.receive.atomic } } as unknown as Quote)
    renderProvider({ plan: composed })

    await waitFor(() => expect(ready).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(quote).toHaveBeenCalledOnce())
    // The composer's ids are discovery's — `btc` and a bare asset identity —
    // and the client's are CAIP-19. Getting this wrong is a route the client
    // cannot resolve, not a wrong price.
    expect(quote.mock.calls[0][0]).toEqual({
      give: 'arkade:mutinynet/slip44:0',
      take: `arkade:mutinynet/asset:${USDT_ID}`,
      amount: composed.deposit.atomic,
      amountOn: 'give',
    })
    await waitFor(() => expect(accept).toHaveBeenCalledOnce())
  })

  it('refuses to fund a re-quote worse than the price on screen', async () => {
    // The composer priced this plan live and the user confirmed a number; the
    // quote at confirm time is a fresh one. Holding it to the displayed amount
    // is what keeps "the price I agreed to" true.
    const composed = plan()
    quote.mockResolvedValue({
      id: 'quote-1',
      take: { amount: composed.receive.atomic - BigInt(1) },
    } as unknown as Quote)
    renderProvider({ plan: composed })

    await waitFor(() => expect(ready).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(quote).toHaveBeenCalledOnce())
    expect(accept).not.toHaveBeenCalled()
  })

  it('keeps the quote snapshot the client does not own', async () => {
    const composed = plan()
    quote.mockResolvedValue({ id: 'quote-1', take: { amount: composed.receive.atomic } } as unknown as Quote)
    renderProvider({ plan: composed })

    await waitFor(() => expect(ready).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    // Tickers, decimals and the fee rate frozen at quote time are all the
    // activity row has once the market card moves on. Beside the record rather
    // than on it: the client rewrites its own document every pass.
    await waitFor(() => expect(quoteSnapshotOf(SWAP_ID)).toMatchObject({ feeBps: 30 }))
  })
})

describe('SwapsProvider cancellation', () => {
  it('reports the fill that beat the cancel as a completion, not a failure', async () => {
    // v1 threw "no spendable VTXO at the swap address" here and its own docs
    // said the throw meant the swap had completed — a trap this wallet used to
    // reconcile by hand from the transaction history. v2 classifies the spend
    // by the covenant leaf it took and returns it.
    cancel.mockResolvedValue({ outcome: 'filled' })
    const reloadWallet = renderProvider()

    await waitFor(() => expect(ready).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(cancel).toHaveBeenCalledWith(SWAP_ID))
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
  })

  it('surfaces a deposit it cannot classify rather than calling it cancelled', async () => {
    cancel.mockResolvedValue({ outcome: 'needs_recovery' })
    renderProvider()

    await waitFor(() => expect(ready).toHaveBeenCalled())
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(cancel).toHaveBeenCalledOnce())
  })
})

describe('SwapsProvider swap list', () => {
  it("renders the client's own records", async () => {
    await repository.saveSwapRecord(offerRecord())
    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'))
  })

  it('adopts an outcome the client persisted', async () => {
    await repository.saveSwapRecord(offerRecord())
    const reloadWallet = renderProvider()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'))
    await waitFor(() => expect(listeners).toHaveLength(1))

    await repository.saveSwapRecord(offerRecord({ status: 'fulfilled', spentTxid: 'fill-txid' }))
    listeners[0](update(accepted({ outcome: 'filled' })))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('fulfilled'))
    // the fill moved value, so the balance has to be re-read
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
  })
})
