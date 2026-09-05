import { useContext, useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Outcome, Quote, Swap, SwapUpdate } from '@arkade-os/swap/client'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { SwapsContext, SwapsProvider } from '../../providers/swaps'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

/**
 * The single-driver rule and the RFQ status plumbing.
 *
 * The client is the package's, and tested there. What is ours is the Web Lock —
 * which used to guard the receive manager alone and now guards the whole client,
 * because it claims on behalf of every corridor — and what the manager's
 * callbacks turn into on screen.
 */
const ready = vi.hoisted(() => vi.fn())
const dispose = vi.hoisted(() => vi.fn())
const accept = vi.hoisted(() => vi.fn())
/** Set by the provider's own `onUpdate`, so a test can push one through. */
const listeners = vi.hoisted(() => [] as ((update: SwapUpdate) => void)[])

vi.mock('../../lib/swapClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapClient')>()),
  makeSwapClient: () => ({
    get ready() {
      return ready()
    },
    onUpdate: (fn: (update: SwapUpdate) => void) => (listeners.push(fn), () => {}),
    accept,
    cancel: vi.fn(),
    quote: vi.fn(),
    receive: vi.fn(),
    pay: vi.fn(),
    exchange: vi.fn(),
    resolve: vi.fn(),
    recover: vi.fn(),
    swaps: async () => [],
    markets: async () => [],
    start: async () => {},
    stop: async () => {},
    [Symbol.asyncDispose]: dispose,
  }),
}))

vi.mock('../../lib/swapRepository', async () => {
  const { InMemoryAssetSwapRepository: InMemory } = await import('@arkade-os/swap')
  return { assetSwapRepository: new InMemory() }
})

vi.mock('../../lib/swapMarkets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapMarkets')>()),
  discoverMarkets: async () => [],
}))

const SWAP_ID = 'rfq:quote-1'

/** A negotiated payment, reduced to what `acceptPay` hands the client. */
const quote = { id: 'quote-1' } as unknown as Quote

const monitored = (outcome: Outcome, over: Partial<Swap> = {}): Swap =>
  ({
    id: SWAP_ID,
    family: 'rfq',
    outcome,
    fundingTxid: 'funding-txid',
    give: { asset: 'arkade:mutinynet/slip44:0', amount: BigInt(1030) },
    take: { asset: 'bolt11:mutinynet/slip44:0', amount: BigInt(1000) },
    ...over,
  }) as Swap

const update = (swap: Swap): SwapUpdate => ({ swap, outcome: swap.outcome, detail: {} }) as unknown as SwapUpdate

function Harness({ tab = 'a' }: { tab?: string }) {
  const { acceptPay, outcomeOf, errorOf } = useContext(SwapsContext)
  const [rejected, setRejected] = useState('')
  return (
    <div data-testid={`tab-${tab}`}>
      <button onClick={() => acceptPay(quote).catch((err: Error) => setRejected(err.name))}>{`Pay ${tab}`}</button>
      <span data-testid='status'>{outcomeOf(SWAP_ID) ?? 'none'}</span>
      <span data-testid='error'>{errorOf(SWAP_ID) ?? 'none'}</span>
      <span data-testid='rejected'>{rejected || 'none'}</span>
    </div>
  )
}

let reloadWallet = vi.fn()

const wrap = (children: React.ReactNode) => (
  <AspContext.Provider
    value={
      {
        ...mockAspContextValue,
        aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet', url: 'http://ark.local' },
      } as never
    }
  >
    <WalletContext.Provider
      value={
        { ...mockWalletContextValue, dataReady: true, txs: [], reloadWallet, svcWallet: { identity: {} } } as never
      }
    >
      {children}
    </WalletContext.Provider>
  </AspContext.Provider>
)

const renderProvider = () =>
  render(
    wrap(
      <SwapsProvider>
        <Harness />
      </SwapsProvider>,
    ),
  )

/**
 * A `navigator.locks` stand-in: the real API cannot be exercised in jsdom, and
 * the property under test is ordering, which a queue reproduces exactly. One
 * FIFO queue per name, the holder releasing by RETURNING — which is the whole
 * point, since an abort cannot release a lock already granted.
 */
const fakeLocks = () => {
  const tails = new Map<string, Promise<void>>()
  return {
    request: (name: string, options: { signal?: AbortSignal }, callback: () => Promise<void>) => {
      const tail = tails.get(name) ?? Promise.resolve()
      let settle = () => {}
      const held = new Promise<void>((resolve) => {
        settle = resolve
      })
      tails.set(
        name,
        tail.then(() => held),
      )
      return tail.then(async () => {
        if (options.signal?.aborted) {
          settle()
          const aborted = new Error('lock request aborted')
          aborted.name = 'AbortError'
          throw aborted
        }
        try {
          await callback()
        } finally {
          settle()
        }
      })
    },
  }
}

/**
 * `fakeLocks` with the grant held open: the request is queued, nothing has run
 * it yet. It stands in for the gap between asking for the lock and being given
 * it — the remount case, where this tab's own request waits on its previous
 * client to stop — which is NOT another tab holding it.
 */
const gatedLocks = () => {
  const locks = fakeLocks()
  let open = () => {}
  const gate = new Promise<void>((resolve) => {
    open = resolve
  })
  return {
    open: () => open(),
    request: (name: string, options: { signal?: AbortSignal }, callback: () => Promise<void>) =>
      locks.request(name, options, async () => {
        await gate
        return callback()
      }),
  }
}

const withLocks = (locks: unknown) =>
  Object.defineProperty(navigator, 'locks', { value: locks, configurable: true, writable: true })

beforeEach(() => {
  listeners.length = 0
  reloadWallet = vi.fn().mockResolvedValue(undefined)
  ready.mockReset().mockResolvedValue(undefined)
  dispose.mockReset().mockResolvedValue(undefined)
  accept.mockReset().mockResolvedValue(monitored('funded'))
  withLocks(fakeLocks())
})

afterEach(() => vi.clearAllMocks())

describe('SwapsProvider single-driver rule', () => {
  it('lets only one tab drive, and tells the other one why', async () => {
    render(
      wrap(
        <>
          <SwapsProvider>
            <Harness tab='a' />
          </SwapsProvider>
          <SwapsProvider>
            <Harness tab='b' />
          </SwapsProvider>
        </>,
      ),
    )
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(1))

    // Two clients over one repository would mean two `pushClaim`s over the same
    // VTXOs: one lands, the other fails as a double-spend, and both write
    // records that disagree.
    const b = within(screen.getByTestId('tab-b'))
    await userEvent.click(b.getByText('Pay b'))
    // Named, not generic: nothing is unavailable, and "the client is not
    // running" would be false — the other tab is driving perfectly well.
    await waitFor(() => expect(b.getByTestId('rejected')).toHaveTextContent('SwapsHeldElsewhere'), { timeout: 3000 })
    expect(ready).toHaveBeenCalledTimes(1)
    expect(accept).not.toHaveBeenCalled()
  })

  it('waits out its own pending request rather than blaming a tab that is not there', async () => {
    const locks = gatedLocks()
    withLocks(locks)
    renderProvider()
    await userEvent.click(screen.getByText('Pay a'))

    // Pending says nothing about WHO holds it — this tab's own request is
    // pending too, right up until it is granted. Answering "another tab is
    // handling swaps" here tells the only open tab to close a tab that does not
    // exist.
    expect(screen.getByTestId('rejected')).toHaveTextContent('none')
    expect(accept).not.toHaveBeenCalled()

    locks.open()
    await waitFor(() => expect(accept).toHaveBeenCalled())
    expect(screen.getByTestId('rejected')).toHaveTextContent('none')
  })

  it('releases the lock on effect teardown, so the next mount can drive', async () => {
    const first = renderProvider()
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(1))

    // The case that actually bites: `setSvcWallet` re-runs this effect in-page,
    // and StrictMode would double-mount it. An abort-only cleanup leaves the
    // callback never returning, so the next request queues behind a lock nobody
    // will ever release and swaps are dead until a full reload. Disposal is
    // terminal for the instance and leaves every durable record in place.
    first.unmount()
    await waitFor(() => expect(dispose).toHaveBeenCalled())
    renderProvider()
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(2), { timeout: 2000 })
  })

  it('drives without Web Locks rather than refusing to run', async () => {
    // An insecure context, or a browser without the API. Single-tab is the
    // common case, and refusing would lose every live swap to protect against a
    // race that may never happen.
    withLocks(undefined)
    renderProvider()
    await waitFor(() => expect(ready).toHaveBeenCalled())

    await userEvent.click(screen.getByText('Pay a'))
    await waitFor(() => expect(accept).toHaveBeenCalled())
  })
})

describe('SwapsProvider outcomes', () => {
  it('reports a lapsed receive as the loss it is, and refreshes the balance', async () => {
    renderProvider()
    await waitFor(() => expect(listeners).toHaveLength(1))

    // The whole reason v2's vocabulary is worth adopting. On a receive leg every
    // non-claim leaf of the covenant is the SOLVER's, so a lockup spent any
    // other way means the incoming payment never arrived. v1 called that
    // `refunded` — the same word it used for the trader's own money coming
    // back — and this wallet had to know which leg it was looking at to tell
    // them apart. `lapsed` says it once, for both families.
    listeners[0](update(monitored('lapsed')))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('lapsed'))
    expect(reloadWallet).toHaveBeenCalled()
  })

  it('keeps a refund distinct from a lapse, which is the same swap ending well', async () => {
    renderProvider()
    await waitFor(() => expect(listeners).toHaveLength(1))

    listeners[0](update(monitored('refunded')))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('refunded'))
  })

  it('surfaces a paid swap and reloads: the claim lands off the worker', async () => {
    renderProvider()
    await waitFor(() => expect(listeners).toHaveLength(1))

    listeners[0](update(monitored('paid')))
    // The claim and the refund go out through the client's own broadcaster, so
    // no VTXO_UPDATE comes from the service worker and nothing else would
    // refresh the balance.
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
    expect(screen.getByTestId('status')).toHaveTextContent('paid')
  })

  it('keys a blocked swap by its tagged id and clears it when the swap ends', async () => {
    renderProvider()
    await waitFor(() => expect(listeners).toHaveLength(1))

    // `needs_recovery` is surfaced, never retried silently: the money is at the
    // covenant and the client cannot name how it got there.
    listeners[0](update(monitored('needs_recovery', { blockedReason: 'lockup was swept' })))
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('lockup was swept'))
    expect(screen.getByTestId('status')).toHaveTextContent('needs_recovery')

    listeners[0](update(monitored('paid')))
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('none'))
  })
})
