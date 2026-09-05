import { useContext, useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LightningSendQuote, RfqSwap, RfqSwapState } from '@arkade-os/swap'
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
const start = vi.hoisted(() => vi.fn())
const close = vi.hoisted(() => vi.fn())
const accept = vi.hoisted(() => vi.fn())
const acceptFunding = vi.hoisted(() => vi.fn())
const listeners = vi.hoisted(() => ({
  completed: [] as ((swap: RfqSwap) => void)[],
  failed: [] as ((swap: RfqSwap, err: unknown) => void)[],
}))

vi.mock('../../lib/swapClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapClient')>()),
  makeSwapClient: () => ({
    client: {
      manager: {
        onSwapCompleted: (fn: (swap: RfqSwap) => void) => (listeners.completed.push(fn), () => {}),
        onSwapFailed: (fn: (swap: RfqSwap, err: unknown) => void) => (listeners.failed.push(fn), () => {}),
        poll: async () => {},
      },
      onUpdate: () => () => {},
      accept,
      cancel: vi.fn(),
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

vi.mock('../../lib/swapRepository', async () => {
  const { InMemoryAssetSwapRepository: InMemory } = await import('@arkade-os/swap')
  return { assetSwapRepository: new InMemory() }
})

vi.mock('../../lib/swapMarkets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapMarkets')>()),
  discoverMarkets: async () => [],
}))

const RFQ_ID = 'rfq-1'

/** A negotiated send, reduced to what `acceptLnSend` hands the client. */
const quote = { kind: 'ln_send', request: { rfqId: RFQ_ID } } as unknown as LightningSendQuote

const monitored = (state: RfqSwapState): RfqSwap => ({ rfqId: RFQ_ID, kind: 'lightning_send', state }) as RfqSwap

function Harness({ tab = 'a' }: { tab?: string }) {
  const { acceptLnSend, lnStatus, lnError } = useContext(SwapsContext)
  const [rejected, setRejected] = useState('')
  return (
    <div data-testid={`tab-${tab}`}>
      <button onClick={() => acceptLnSend(quote).catch((err: Error) => setRejected(err.name))}>{`Pay ${tab}`}</button>
      <span data-testid='status'>{lnStatus(RFQ_ID) ?? 'none'}</span>
      <span data-testid='error'>{lnError(RFQ_ID) ?? 'none'}</span>
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
  listeners.completed.length = 0
  listeners.failed.length = 0
  reloadWallet = vi.fn().mockResolvedValue(undefined)
  start.mockReset().mockResolvedValue(undefined)
  close.mockReset().mockResolvedValue(undefined)
  accept.mockReset().mockResolvedValue({ family: 'rfq', swap: monitored('pending') })
  acceptFunding.mockReset().mockImplementation(async (fn: () => Promise<unknown>) => ({
    result: await fn(),
    fundingTxid: 'funding-txid',
  }))
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
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1))

    // Two clients over one repository would mean two `pushClaim`s over the same
    // VTXOs: one lands, the other fails as a double-spend, and both write
    // records that disagree.
    const b = within(screen.getByTestId('tab-b'))
    await userEvent.click(b.getByText('Pay b'))
    // Named, not generic: nothing is unavailable, and "the client is not
    // running" would be false — the other tab is driving perfectly well.
    await waitFor(() => expect(b.getByTestId('rejected')).toHaveTextContent('SwapsHeldElsewhere'), { timeout: 3000 })
    expect(start).toHaveBeenCalledTimes(1)
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
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1))

    // The case that actually bites: `setSvcWallet` re-runs this effect in-page,
    // and StrictMode would double-mount it. An abort-only cleanup leaves the
    // callback never returning, so the next request queues behind a lock nobody
    // will ever release and swaps are dead until a full reload.
    first.unmount()
    await waitFor(() => expect(close).toHaveBeenCalled())
    renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2), { timeout: 2000 })
  })

  it('drives without Web Locks rather than refusing to run', async () => {
    // An insecure context, or a browser without the API. Single-tab is the
    // common case, and refusing would lose every live swap to protect against a
    // race that may never happen.
    withLocks(undefined)
    renderProvider()
    await waitFor(() => expect(start).toHaveBeenCalled())

    await userEvent.click(screen.getByText('Pay a'))
    await waitFor(() => expect(accept).toHaveBeenCalled())
  })
})

describe('SwapsProvider rfq outcomes', () => {
  it('reports a refunded receive as the loss it is, and refreshes the balance', async () => {
    renderProvider()
    await waitFor(() => expect(listeners.completed).toHaveLength(1))

    // On a receive leg every non-claim leaf is the SOLVER's, so a lockup spent
    // any other way means the incoming payment never arrived.
    listeners.completed[0](monitored('refunded'))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('refunded'))
    expect(reloadWallet).toHaveBeenCalled()
  })

  it('surfaces a settled swap and reloads: the claim lands off the worker', async () => {
    renderProvider()
    await waitFor(() => expect(listeners.completed).toHaveLength(1))

    listeners.completed[0](monitored('settled'))
    // The claim and the refund go out through the client's own broadcaster, so
    // no VTXO_UPDATE comes from the service worker and nothing else would
    // refresh the balance.
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
    expect(screen.getByTestId('status')).toHaveTextContent('settled')
  })

  it('keys a failure by rfqId and clears it when the swap ends', async () => {
    renderProvider()
    await waitFor(() => expect(listeners.failed).toHaveLength(1))

    // Fired for every throwing action, retried ones included — so it is a
    // reason to show, not an outcome to end on.
    listeners.failed[0](monitored('claimable'), new Error('claim rejected'))
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('claim rejected'))
    expect(screen.getByTestId('status')).toHaveTextContent('none')

    listeners.completed[0](monitored('settled'))
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('none'))
  })
})
