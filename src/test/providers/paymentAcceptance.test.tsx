import { useContext, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { btcOn, type Quote, type Swap, type SwapRecord } from '@arkade-os/swap'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { SwapsContext, SwapsProvider } from '../../providers/swaps'
import { checkpointPaymentRecord, readPaymentFunding, type PaymentFundingAttempt } from '../../lib/paymentFunding'
import { paymentAttemptKey } from '../../lib/paymentQuotes'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'
import fixtures from '../fixtures.json'

const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  quote: vi.fn(),
  offerSwaps: vi.fn(),
  getSwapRecord: vi.fn(),
  discoverMarkets: vi.fn(),
  watchSwapMarkets: vi.fn(),
}))

vi.mock('../../lib/swapMarkets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapMarkets')>()),
  discoverMarkets: mocks.discoverMarkets,
  watchSwapMarkets: mocks.watchSwapMarkets,
}))
vi.mock('../../lib/swapRepository', () => ({
  assetSwapRepository: { getSwapRecord: mocks.getSwapRecord },
  saveQuoteSnapshot: vi.fn(),
}))
vi.mock('../../lib/swapRecords', () => ({
  displayAssetOf: (assetId: string) => assetId,
  offerSwaps: mocks.offerSwaps,
}))
vi.mock('../../lib/swapClient', () => ({
  makeSwapClient: () => ({
    ready: Promise.resolve(),
    onUpdate: () => () => {},
    quote: mocks.quote,
    accept: mocks.accept,
    [Symbol.asyncDispose]: vi.fn(),
  }),
  SwapsHeldElsewhere: class SwapsHeldElsewhere extends Error {},
}))
vi.mock('../../components/Toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

/** The `attempts` store, enough of it for `paymentFunding` to run for real. A
 * broken store aborts every transaction, which is how storage fails mid-accept. */
const store = new Map<string, unknown>()
let broken = false

const fakeIndexedDb = {
  open: () => {
    const request: Record<string, unknown> = { result: undefined, error: null }
    const objectStore = {
      get: (key: string) => {
        const read: Record<string, unknown> = { result: undefined }
        queueMicrotask(() => {
          if (broken) return
          read.result = store.get(key)
          ;(read.onsuccess as (() => void) | undefined)?.()
        })
        return read
      },
      put: (value: unknown, key: string) => store.set(key, value),
      delete: (key: string) => store.delete(key),
    }
    const db = {
      transaction: () => {
        const tx: Record<string, unknown> = { error: null, objectStore: () => objectStore }
        queueMicrotask(() =>
          queueMicrotask(() => {
            if (broken) {
              tx.error = new Error('Payment safety storage was interrupted')
              ;(tx.onabort as (() => void) | undefined)?.()
              return
            }
            ;(tx.oncomplete as (() => void) | undefined)?.()
          }),
        )
        return tx
      },
      close: () => {},
    }
    queueMicrotask(() => {
      request.result = db
      ;(request.onsuccess as (() => void) | undefined)?.()
    })
    return request
  },
}

const { invoice, amountSats, paymentHash } = fixtures.lib.bolt11
const now = 1734606756
const network = 'bitcoin'
const btc = btcOn('arkade', network)
const lightning = btcOn('bolt11', network)
const request = { kind: 'lightning', invoice, amount: amountSats } as const
// The invoice's own liveness is checked, so the key only exists under the pinned clock.
const attemptKey = () => paymentAttemptKey(request, network, 'walletpub')

const lnQuote = (id: string): Quote => ({
  id,
  route: {
    give: { corridor: 'arkade', asset: btc, instrument: { kind: 'wallet' } },
    take: {
      corridor: 'lightning',
      asset: lightning,
      instrument: { kind: 'invoice', bolt11: invoice, paymentHash, expiresAt: now + 600 },
    },
  },
  give: { asset: btc, amount: BigInt(amountSats + 5) },
  take: { asset: lightning, amount: BigInt(amountSats) },
  expiresAt: now + 60,
  market: { kind: 'restored', backend: 'rfq' },
  fee: { asset: btc, amount: 5n },
})

const unfundedRecord = (id: string) =>
  ({
    id,
    family: 'rfq',
    kind: 'lightning_send',
    state: 'pending',
    route: { give: { instrument: { kind: 'wallet' } } },
    expiresAt: now + 60,
  }) as unknown as SwapRecord

const fundedSwap = (id: string) => ({ id, outcome: 'funded', fundingTxid: 'funding-txid' }) as unknown as Swap

function PayProbe() {
  const { quotePaymentRoute, acceptPaymentQuote } = useContext(SwapsContext)
  const [outcome, setOutcome] = useState('')
  return (
    <>
      <button
        onClick={async () => {
          try {
            const quote = await quotePaymentRoute(request)
            setOutcome(`paid:${(await acceptPaymentQuote(quote, request)).id}`)
          } catch (error) {
            setOutcome(`${(error as Error).name} — ${(error as Error).message}`)
          }
        }}
      >
        pay invoice
      </button>
      <output>{outcome}</output>
    </>
  )
}

const renderProvider = () =>
  render(
    <AspContext.Provider value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network } }}>
      <WalletContext.Provider
        value={
          {
            ...mockWalletContextValue,
            dataReady: true,
            wallet: { ...mockWalletContextValue.wallet, pubkey: 'walletpub' },
            svcWallet: { identity: {} },
            isVerifiedAsset: () => true,
          } as never
        }
      >
        <SwapsProvider>
          <PayProbe />
        </SwapsProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )

const pay = async (expected: string) => {
  fireEvent.click(screen.getByText('pay invoice'))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(expected))
}

const attempt = () => store.get(attemptKey()) as PaymentFundingAttempt | undefined

beforeEach(() => {
  store.clear()
  broken = false
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now * 1000)
  vi.stubGlobal('indexedDB', fakeIndexedDb)
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: (_name: string, _options: unknown, run: (lock: object) => unknown) => run({}) },
  })
  mocks.discoverMarkets.mockResolvedValue([])
  mocks.watchSwapMarkets.mockReturnValue(() => {})
  mocks.offerSwaps.mockResolvedValue([])
  mocks.getSwapRecord.mockResolvedValue(undefined)
  mocks.quote.mockImplementation(async () => lnQuote('quote-next'))
  mocks.accept.mockImplementation(async (quote: Quote) => fundedSwap(quote.id))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })
  vi.clearAllMocks()
})

describe('reserved payment acceptance', () => {
  it('pays the invoice again after the pre-funding checkpoint failed', async () => {
    const records = new Map<string, SwapRecord>()
    mocks.getSwapRecord.mockImplementation(async (id: string) => records.get(id))
    mocks.quote.mockImplementationOnce(async () => lnQuote('quote-a'))
    // The SDK commits its record and awaits the wrapper's checkpoint before funding.
    mocks.accept.mockImplementationOnce(async (quote: Quote) => {
      records.set(quote.id, unfundedRecord(quote.id))
      broken = true
      await checkpointPaymentRecord(quote.id)
      throw new Error('funding is never reached')
    })
    renderProvider()
    await pay('PaymentSubmissionPending')
    expect(attempt()).toMatchObject({ quoteId: 'quote-a', guarded: true })
    expect(attempt()?.recordSaved).toBeUndefined()

    broken = false
    mocks.quote.mockImplementationOnce(async () => lnQuote('quote-b'))
    await pay('paid:quote-b')
    expect(attempt()).toMatchObject({ quoteId: 'quote-b' })
  })

  it('keeps a reservation past its checkpoint fenced as possibly submitted', async () => {
    store.set(attemptKey(), { quoteId: 'quote-a', swapId: 'rfq:quote-a', guarded: true, recordSaved: true })
    mocks.getSwapRecord.mockImplementation(async (id: string) => (id === 'quote-a' ? unfundedRecord(id) : undefined))
    renderProvider()
    await pay('PaymentSubmissionPending')
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('keeps a reservation fenced as possibly submitted without Web Locks', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })
    store.set(attemptKey(), { quoteId: 'quote-a', swapId: 'rfq:quote-a', guarded: true })
    mocks.getSwapRecord.mockImplementation(async (id: string) => (id === 'quote-a' ? unfundedRecord(id) : undefined))
    renderProvider()
    await pay('PaymentSubmissionPending')
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('checkpoints a record the SDK can fund without saving it again, before accepting', async () => {
    let savedAtAccept: unknown
    mocks.getSwapRecord.mockImplementation(async (id: string) => (id === 'quote-next' ? unfundedRecord(id) : undefined))
    mocks.accept.mockImplementation(async () => {
      savedAtAccept = attempt()?.recordSaved
      throw new Error('the wallet never heard back')
    })
    renderProvider()
    await pay('PaymentSubmissionPending')
    expect(mocks.accept).toHaveBeenCalledOnce()
    expect(savedAtAccept).toBe(true)
    expect(await readPaymentFunding(attemptKey())).toMatchObject({ recordSaved: true })
  })

  it('refuses to accept when that checkpoint cannot be written', async () => {
    mocks.getSwapRecord.mockImplementation(async (id: string) => {
      if (id !== 'quote-next') return undefined
      broken = true
      return unfundedRecord(id)
    })
    renderProvider()
    await pay('PaymentSubmissionPending')
    expect(mocks.accept).not.toHaveBeenCalled()
  })
})
