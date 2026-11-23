import { useContext, useState, type PropsWithChildren } from 'react'
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { asset } from '@arkade-os/sdk'
import {
  arkadeAsset,
  assetSwapIdOf,
  btcOn,
  claimFeeSats,
  type CorridorSwapRecord,
  type OfferSwapRecord,
  type OpenRfqAuction,
  type Outcome,
  type Quote,
  type Swap,
  type SwapRecord,
  type SwapUpdate,
} from '@arkade-os/swap'
import { recordEndpoint, recordLeg, swapOf } from '@arkade-os/swap/advanced'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { SwapsContext, SwapsProvider } from '../../providers/swaps'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'
import { MUTINYNET_USDT_ASSET_ID } from '../../lib/accountAssets'
import { createSendRouter } from '../../lib/sendRouter'
import { makeSwapClient } from '../../lib/swapClient'
import { checkpointPaymentRecord, type PaymentFundingAttempt } from '../../lib/paymentFunding'
import { assetSwapRepository } from '../../lib/swapRepository'
import { swapRouteFundingKey, swapRouteLegKey, swapRoutePointerKey, swapRouteScope } from '../../lib/swapRouteExecution'
import fixtures from '../fixtures.json'

const success = vi.hoisted(() => vi.fn())
vi.mock('../../components/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../components/Toast')>()),
  toast: { success: (m: string) => success(m), error: vi.fn(), info: vi.fn() },
}))

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
const clientQuote = vi.hoisted(() => vi.fn())
const clientCandidates = vi.hoisted(() => vi.fn())
const openRfq = vi.hoisted(() => vi.fn())
const quoteBid = vi.hoisted(() => vi.fn())
const offboard = vi.hoisted(() => vi.fn())
const receive = vi.hoisted(() => vi.fn())
const recover = vi.hoisted(() => vi.fn())
const claimFeeRate = vi.hoisted(() => vi.fn<() => Promise<number | undefined>>())
/** Set by the provider's own `onUpdate`, so a test can push one through. */
const listeners = vi.hoisted(() => [] as ((update: SwapUpdate) => void)[])

vi.mock('../../lib/swapClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapClient')>()),
  makeSwapClient: vi.fn(() => ({
    get ready() {
      return ready()
    },
    onUpdate: (fn: (update: SwapUpdate) => void) => (listeners.push(fn), () => {}),
    accept,
    cancel: vi.fn(),
    quote: clientQuote,
    candidates: clientCandidates,
    openRfq,
    quoteBid,
    receive,
    pay: vi.fn(),
    quoteExchange: vi.fn(),
    resolve: vi.fn(),
    recover,
    swaps: async () => [],
    markets: async () => [],
    start: async () => {},
    stop: async () => {},
    [Symbol.asyncDispose]: dispose,
  })),
}))

vi.mock('../../lib/asp', async (original) => ({
  ...(await original<typeof import('../../lib/asp')>()),
  collaborativeExitWithFees: offboard,
}))
vi.mock('../../lib/claimFee', async (original) => ({
  ...(await original<typeof import('../../lib/claimFee')>()),
  claimFeeRate,
}))

vi.mock('../../lib/sendRouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/sendRouter')>()
  return { ...actual, createSendRouter: vi.fn(actual.createSendRouter) }
})

vi.mock('../../lib/swapRepository', async () => {
  const { InMemoryAssetSwapRepository: InMemory } = await import('@arkade-os/swap')
  class Repository extends InMemory {
    async saveSwapRecord(record: SwapRecord) {
      await super.saveSwapRecord(record)
      await checkpointPaymentRecord(record.id)
    }
  }
  return { assetSwapRepository: new Repository() }
})

vi.mock('../../lib/swapMarkets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapMarkets')>()),
  discoverMarkets: async () => [],
  watchSwapMarkets: () => () => {},
}))

const SWAP_ID = 'rfq:quote-1'
/** A swept offer's id, as the wallet's swap list carries it. */
const OFFER_ID = 'funding-txid'
const RECIPIENT = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

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
    route: { give: { corridor: 'arkade' }, take: { corridor: 'lightning' } },
    ...over,
  }) as Swap

const update = (swap: Swap): SwapUpdate => ({ swap, outcome: swap.outcome, detail: {} }) as unknown as SwapUpdate

/** The invoice the solver mints, as the client hands it back. */
const INVOICE = 'lnbc1-hold-invoice'

const minted = () =>
  ({
    ...monitored('funded'),
    artifact: { kind: 'invoice', bolt11: INVOICE },
    expiresAt: 4_000_000_000,
  }) as unknown as Swap

function Harness({ tab = 'a' }: { tab?: string }) {
  const {
    acceptPay,
    receiveLightning,
    recoverSwap,
    outcomeOf,
    errorOf,
    sendRouter,
    onchainPaymentRouteCandidates,
    openSwapQuotes,
    openPaymentQuotes,
    chooseSwapQuote,
    acceptSwapQuote,
  } = useContext(SwapsContext)
  const [rejected, setRejected] = useState('')
  const [invoice, setInvoice] = useState('')
  const [routed, setRouted] = useState('')
  const [recovered, setRecovered] = useState('')
  const [router, setRouter] = useState('')
  const [providers, setProviders] = useState('')
  const [auction, setAuction] = useState<OpenRfqAuction>()
  const [chosen, setChosen] = useState<Quote>()
  const [accepted, setAccepted] = useState('')
  return (
    <div data-testid={`tab-${tab}`}>
      <button
        onClick={() =>
          void openSwapQuotes('btc', MUTINYNET_USDT_ASSET_ID, 1000n)
            .then(setAuction)
            .catch((err: Error) => setRejected(err.message))
        }
      >{`Offers ${tab}`}</button>
      <button
        onClick={() =>
          void openPaymentQuotes(
            {
              kind: 'asset',
              address: 'tark1recipient',
              assetId: MUTINYNET_USDT_ASSET_ID,
              amount: 20n,
              fromAssetId: 'btc',
            },
            'asset-request',
            true,
          ).catch((err: Error) => setRejected(err.message))
        }
      >{`Asset payment offers ${tab}`}</button>
      <button
        disabled={!auction}
        onClick={() =>
          void chooseSwapQuote(auction!.id, 'second')
            .then(setChosen)
            .catch((err: Error) => setRejected(err.message))
        }
      >{`Choose ${tab}`}</button>
      <button
        disabled={!chosen}
        onClick={() =>
          void acceptSwapQuote(chosen!)
            .then((swap) => setAccepted(swap.id))
            .catch((err: Error) => setRejected(err.message))
        }
      >{`Accept offer ${tab}`}</button>
      <span data-testid='accepted'>{accepted || 'none'}</span>
      <button onClick={() => acceptPay(quote).catch((err: Error) => setRejected(err.name))}>{`Pay ${tab}`}</button>
      <button
        onClick={() =>
          sendRouter({ swapsOptional: true })
            .then(() => setRouted('router'))
            .catch((err: Error) => setRouted(err.message))
        }
      >{`Route ${tab}`}</button>
      <span data-testid='routed'>{routed || 'none'}</span>
      <button
        onClick={() =>
          sendRouter({ outputFee: () => 100, intentFee: () => undefined })
            .then((router) => setRouter(typeof router.options))
            .catch((err: Error) => setRejected(err.name))
        }
      >{`Router ${tab}`}</button>
      <button
        onClick={() =>
          onchainPaymentRouteCandidates(RECIPIENT, 5_000)
            .then((choices) => setProviders(choices.map(({ name }) => name).join(',')))
            .catch((err: Error) => setRejected(err.name))
        }
      >{`Bitcoin providers ${tab}`}</button>
      <button
        onClick={() =>
          receiveLightning(1000)
            .then((accepted) => setInvoice(accepted.invoice))
            .catch((err: Error) => setRejected(err.name))
        }
      >{`Receive ${tab}`}</button>
      <button
        onClick={() =>
          recoverSwap(OFFER_ID)
            .then((went) => setRecovered(String(went)))
            .catch((err: Error & { reason?: string }) => setRejected(`${err.name}:${err.reason ?? ''}`))
        }
      >{`Recover ${tab}`}</button>
      <span data-testid='status'>{outcomeOf(SWAP_ID) ?? 'none'}</span>
      <span data-testid='error'>{errorOf(SWAP_ID) ?? 'none'}</span>
      <span data-testid='rejected'>{rejected || 'none'}</span>
      <span data-testid='invoice'>{invoice || 'none'}</span>
      <span data-testid='recovered'>{recovered || 'none'}</span>
      <span data-testid='router'>{router || 'none'}</span>
      <span data-testid='providers'>{providers || 'none'}</span>
    </div>
  )
}

let reloadWallet = vi.fn()
const getSpendableVtxos = vi.fn()

const wrap = (children: React.ReactNode, network = 'mutinynet') => (
  <AspContext.Provider
    value={
      {
        ...mockAspContextValue,
        aspInfo: { ...mockAspContextValue.aspInfo, network, url: 'http://ark.local' },
      } as never
    }
  >
    <WalletContext.Provider
      value={
        {
          ...mockWalletContextValue,
          dataReady: true,
          txs: [],
          wallet: { ...mockWalletContextValue.wallet, pubkey: 'test-wallet' },
          reloadWallet,
          svcWallet: { identity: {}, getSpendableVtxos },
          isVerifiedAsset: () => true,
        } as never
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
  const waiting = new Map<string, Promise<void>>()
  return {
    request: <T,>(
      name: string,
      options: { signal?: AbortSignal; ifAvailable?: boolean },
      callback: (lock: { name: string } | null) => Promise<T>,
    ) => {
      const active = waiting.get(name)
      if (active && options.ifAvailable) return callback(null)
      const tail = active ?? Promise.resolve()
      let settle = () => {}
      const held = new Promise<void>((resolve) => {
        settle = resolve
      })
      const queued = tail.then(() => held)
      waiting.set(name, queued)
      return tail.then(async () => {
        try {
          if (options.signal?.aborted) throw new DOMException('lock request aborted', 'AbortError')
          return await callback({ name })
        } finally {
          if (waiting.get(name) === queued) waiting.delete(name)
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
  clientQuote.mockReset()
  getSpendableVtxos.mockReset().mockResolvedValue([])
  clientCandidates.mockReset().mockResolvedValue([])
  openRfq.mockReset()
  quoteBid.mockReset()
  claimFeeRate.mockReset().mockResolvedValue(2)
  offboard.mockReset()
  receive.mockReset().mockResolvedValue(minted())
  recover.mockReset().mockResolvedValue({ recovered: true, txid: 'round-txid', swap: monitored('cancelled') })
  withLocks(fakeLocks())
})

afterEach(() => vi.clearAllMocks())

/** Two providers in one window stand in for two tabs: each opens its own
 * BroadcastChannel, and a channel never delivers to the instance that posted,
 * so the two talk to each other exactly as two tabs would. */
const renderTwoTabs = () =>
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

const now = 1734606756
const { invoice, paymentHash, amountSats } = fixtures.lib.bolt11
const request = { kind: 'lightning', invoice, amount: amountSats } as const
const btc = btcOn('arkade', 'bitcoin')
const ln = btcOn('bolt11', 'bitcoin')
const token = arkadeAsset('bitcoin', asset.AssetId.fromString(MUTINYNET_USDT_ASSET_ID))
const debit = BigInt(amountSats) + 35n
const carrier = mockAspContextValue.aspInfo.dust
const script = `5120${'aa'.repeat(32)}`
const payout = { txid: 'conversion-fill', vout: 1, script, value: Number(debit) }
const assetInput = {
  txid: 'wallet-asset',
  vout: 0,
  script,
  value: Number(carrier),
  assets: [{ assetId: MUTINYNET_USDT_ASSET_ID, amount: 20n }],
}

const lightningQuote = (id = 'chained-ln', expiresAt = now + 60): Quote => ({
  id,
  route: {
    give: { corridor: 'arkade', asset: btc, instrument: { kind: 'wallet' } },
    take: {
      corridor: 'lightning',
      asset: ln,
      instrument: { kind: 'invoice', bolt11: invoice, paymentHash, expiresAt: now + 120 },
    },
  },
  give: { asset: btc, amount: debit },
  take: { asset: ln, amount: BigInt(amountSats) },
  fee: { asset: btc, amount: 35n },
  expiresAt,
  market: { kind: 'restored', backend: 'rfq' },
})

const conversionQuote = (id = 'chained-conversion'): Quote & { carrierSats: bigint } => ({
  id,
  route: {
    give: { corridor: 'arkade', asset: token, instrument: { kind: 'wallet' } },
    take: { corridor: 'arkade', asset: btc, instrument: { kind: 'wallet' } },
  },
  give: { asset: token, amount: 20n },
  take: { asset: btc, amount: debit },
  fee: { asset: btc, amount: 10n },
  expiresAt: now + 90,
  market: { kind: 'restored', backend: 'rfq' },
  carrierSats: carrier,
})

const recordTerms = (quote: Quote) => ({
  id: quote.id,
  route: { give: recordEndpoint(quote.route.give), take: recordEndpoint(quote.route.take) },
  give: recordLeg(quote.give),
  take: recordLeg(quote.take),
  fee: recordLeg(quote.fee),
  market: quote.market,
  expiresAt: quote.expiresAt,
  createdAt: now,
  updatedAt: now,
})

const assetRecord = (quote: Quote): OfferSwapRecord => ({
  ...recordTerms(quote),
  family: 'offer',
  status: 'pending',
  swapAddress: 'asset-lockup',
  swapPkScript: script,
  binding: {
    version: 'asset-swap-directed-nonce',
    receiverPkScript: script,
    amount: String(debit),
    offerAsset: MUTINYNET_USDT_ASSET_ID,
    userPublicKey: 'aa'.repeat(32),
    serverPublicKey: 'bb'.repeat(32),
    emulatorPublicKey: 'cc'.repeat(32),
  },
  fundingTxid: 'conversion-deposit',
})

const lightningRecord = (quote: Quote): CorridorSwapRecord => ({
  ...recordTerms(quote),
  family: 'rfq',
  kind: 'lightning_send',
  state: 'pending',
  rfqId: 'invoice-rfq',
  lockupAddress: 'invoice-lockup',
  lockupPkScript: script,
  lock: { hash: paymentHash },
  refundLocktime: now + 600,
  profile: {},
  fundingTxid: 'lightning-deposit',
})

const attempts = new Map<IDBValidKey, PaymentFundingAttempt>()

// Run the real funding lock and checkpoint logic against an in-memory store.
const fundingStore = {
  open: () => {
    const open = {
      onsuccess: () => {},
      result: {
        transaction: () => {
          const tx = {
            oncomplete: () => {},
            objectStore: () => ({
              get: (key: IDBValidKey) => {
                const read = { result: undefined as PaymentFundingAttempt | undefined, onsuccess: () => {} }
                queueMicrotask(() => {
                  read.result = attempts.get(key)
                  read.onsuccess()
                  tx.oncomplete()
                })
                return read
              },
              put: (value: PaymentFundingAttempt, key: IDBValidKey) => attempts.set(key, value),
              delete: (key: IDBValidKey) => attempts.delete(key),
            }),
          }
          return tx
        },
      },
    }
    queueMicrotask(() => open.onsuccess())
    return open
  },
}

const mountChainedPayment = async () => {
  const clients = ready.mock.calls.length
  const hook = renderHook(() => useContext(SwapsContext), {
    wrapper: ({ children }: PropsWithChildren) => wrap(<SwapsProvider>{children}</SwapsProvider>, 'bitcoin'),
  })
  await waitFor(() => expect(ready).toHaveBeenCalledTimes(clients + 1))
  return hook
}

describe('SwapsProvider chained Lightning payments', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(now * 1000)
    attempts.clear()
    getSpendableVtxos.mockResolvedValue([assetInput])
    vi.stubGlobal('indexedDB', fundingStore)
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    await assetSwapRepository.clear()
  })

  it('fences direct pay during conversion and funds Lightning once from the exact credited output', async () => {
    const lightning = lightningQuote()
    const conversion = conversionQuote()
    const replacement = lightningQuote('replacement-ln')
    clientQuote.mockResolvedValueOnce(lightning).mockResolvedValueOnce(conversion).mockResolvedValueOnce(replacement)
    const { result } = await mountChainedPayment()
    await expect(result.current.quotePaymentRoute(request)).resolves.toEqual(lightning)
    await expect(result.current.quoteChainedPayment(MUTINYNET_USDT_ASSET_ID, lightning, request)).resolves.toEqual(
      conversion,
    )
    await expect(result.current.quotePaymentRoute(request)).resolves.toEqual(replacement)
    expect(clientQuote).toHaveBeenNthCalledWith(2, { give: token, take: btc, amount: debit, amountOn: 'take' })
    expect(accept).not.toHaveBeenCalled()
    getSpendableVtxos.mockResolvedValueOnce([])
    await expect(
      result.current.startChainedPayment(MUTINYNET_USDT_ASSET_ID, conversion, lightning, request),
    ).rejects.toMatchObject({ name: 'PaymentNotSubmitted' })
    await expect(result.current.getChainedPayment(request)).resolves.toBeUndefined()
    expect(accept).not.toHaveBeenCalled()

    const deposit = assetRecord(conversion)
    const gate = Promise.withResolvers<void>()
    accept.mockImplementationOnce(async () => {
      await assetSwapRepository.saveSwapRecord(deposit)
      await gate.promise
      return swapOf(deposit, 'open')
    })
    const started = result.current.startChainedPayment(MUTINYNET_USDT_ASSET_ID, conversion, lightning, request)
    try {
      await waitFor(() => expect(accept).toHaveBeenCalledTimes(1))
      await expect(result.current.acceptPaymentQuote(replacement, request)).rejects.toMatchObject({
        name: 'PaymentNotSubmitted',
      })
    } finally {
      await act(async () => {
        gate.resolve()
        await started
      })
    }
    const swapId = assetSwapIdOf('offer', conversion.id)
    expect(accept).toHaveBeenNthCalledWith(1, conversion, {
      validUntil: lightning.expiresAt,
      maxChangeFee: 0,
      selectedVtxos: [assetInput],
    })
    await expect(result.current.getChainedPayment(request)).resolves.toEqual({
      phase: 'converting',
      swapId,
      sats: debit,
    })
    await expect(result.current.acceptPaymentQuote(replacement, request)).rejects.toMatchObject({
      name: 'PaymentSubmissionPending',
      reason: swapId,
    })
    await expect(result.current.finishChainedPayment(lightning, request)).rejects.toThrow('not ready')
    await result.current.startChainedPayment(MUTINYNET_USDT_ASSET_ID, conversion, lightning, request)
    expect(accept).toHaveBeenCalledTimes(1)

    await assetSwapRepository.saveSwapRecord({ ...deposit, spentTxid: payout.txid, status: 'fulfilled' })
    await expect(result.current.finishChainedPayment(replacement, request)).rejects.toThrow('not ready')
    getSpendableVtxos.mockResolvedValue([{ ...payout, txid: 'unrelated-btc' }])
    await expect(result.current.finishChainedPayment(lightning, request)).rejects.toMatchObject({
      name: 'PaymentNotSubmitted',
    })
    expect(accept).toHaveBeenCalledTimes(1)

    getSpendableVtxos.mockResolvedValue([payout])
    await expect(result.current.getChainedPayment(request)).resolves.toEqual({
      phase: 'credited',
      swapId,
      sats: debit,
      spendable: true,
    })
    const final = lightningRecord(lightning)
    accept.mockImplementationOnce(async () => {
      await assetSwapRepository.saveSwapRecord(final)
      return swapOf(final, 'funding')
    })
    await act(async () => {
      await expect(result.current.finishChainedPayment(lightning, request)).resolves.toMatchObject({
        fundingTxid: final.fundingTxid,
      })
    })
    expect(accept).toHaveBeenNthCalledWith(2, lightning, {
      validUntil: lightning.expiresAt,
      maxChangeFee: 0,
      selectedVtxos: [payout],
    })
    getSpendableVtxos.mockResolvedValue([])
    await expect(result.current.finishChainedPayment(lightning, request)).resolves.toMatchObject({
      fundingTxid: final.fundingTxid,
    })
    await expect(result.current.acceptPaymentQuote(replacement, request)).resolves.toMatchObject({
      fundingTxid: final.fundingTxid,
    })
    expect(accept).toHaveBeenCalledTimes(2)
  })

  it('retains a checkpointed conversion fence across a driver restart when the SDK record goes missing', async () => {
    const lightning = lightningQuote()
    const conversion = conversionQuote()
    clientQuote.mockResolvedValueOnce(lightning).mockResolvedValueOnce(conversion)
    const first = await mountChainedPayment()
    await first.result.current.quotePaymentRoute(request)
    await first.result.current.quoteChainedPayment(MUTINYNET_USDT_ASSET_ID, lightning, request)
    accept.mockImplementationOnce(async () => {
      await assetSwapRepository.saveSwapRecord({ ...assetRecord(conversion), fundingTxid: undefined })
      await assetSwapRepository.removeSwapRecord(conversion.id)
      throw new Error('wallet disconnected during funding')
    })
    await expect(
      first.result.current.startChainedPayment(MUTINYNET_USDT_ASSET_ID, conversion, lightning, request),
    ).rejects.toMatchObject({ name: 'PaymentSubmissionPending' })
    first.unmount()

    const replacement = lightningQuote('replacement-ln')
    const requoted = conversionQuote('replacement-conversion')
    clientQuote.mockResolvedValueOnce(replacement).mockResolvedValueOnce(requoted)
    const { result } = await mountChainedPayment()
    await result.current.quotePaymentRoute(request)
    await result.current.quoteChainedPayment(MUTINYNET_USDT_ASSET_ID, replacement, request)
    const swapId = assetSwapIdOf('offer', conversion.id)
    await expect(result.current.getChainedPayment(request)).resolves.toMatchObject({ phase: 'converting', swapId })
    await expect(
      result.current.startChainedPayment(MUTINYNET_USDT_ASSET_ID, requoted, replacement, request),
    ).rejects.toMatchObject({ name: 'PaymentSubmissionPending', reason: swapId })
    await expect(result.current.acceptPaymentQuote(replacement, request)).rejects.toMatchObject({
      name: 'PaymentSubmissionPending',
      reason: swapId,
    })
    expect(accept).toHaveBeenCalledTimes(1)
  })

  it('fences a different active route and records a stop when the driver loses its issued quotes', async () => {
    const scope = swapRouteScope('bitcoin', 'test-wallet')
    const first = conversionQuote()
    const destination = arkadeAsset('bitcoin', asset.AssetId.fromString(`${'ab'.repeat(32)}0000`))
    const next: Quote = {
      ...first,
      id: 'route-destination',
      route: {
        give: { corridor: 'arkade', asset: btc, instrument: { kind: 'wallet' } },
        take: { corridor: 'arkade', asset: destination, instrument: { kind: 'wallet' } },
      },
      give: { asset: btc, amount: debit },
      take: { asset: destination, amount: 9n },
    }
    const plan = { id: 'approved-route', quotes: [first, next], expiresAt: first.expiresAt }
    const key = swapRouteFundingKey(scope, plan.id)
    const swapId = assetSwapIdOf('offer', first.id)
    attempts.set(swapRouteFundingKey(scope, 'active'), { quoteId: plan.id, swapId })
    attempts.set(key, { quoteId: plan.id, swapId, route: plan })
    attempts.set(swapRouteLegKey(key, 0), { quoteId: first.id, swapId })
    await assetSwapRepository.saveSwapRecord(assetRecord(first))

    const { result } = await mountChainedPayment()
    localStorage.setItem(swapRoutePointerKey(scope), 'replacement-route')
    try {
      await expect(result.current.startSwapRoute('replacement-route')).rejects.toMatchObject({
        name: 'PaymentSubmissionPending',
        reason: swapId,
      })
      await assetSwapRepository.saveSwapRecord({ ...assetRecord(first), status: 'fulfilled', spentTxid: payout.txid })
      getSpendableVtxos.mockResolvedValue([payout])
      await expect(result.current.getSwapRoute(plan.id)).resolves.toMatchObject({
        progress: { phase: 'ready', step: 1 },
      })
      await expect(result.current.advanceSwapRoute(plan.id)).resolves.toMatchObject({
        phase: 'stopped',
        reason: 'quote-unavailable',
      })
      await expect(result.current.getSwapRoute(plan.id)).resolves.toMatchObject({
        progress: { phase: 'stopped', reason: 'quote-unavailable' },
      })
      expect(accept).not.toHaveBeenCalled()
    } finally {
      localStorage.removeItem(swapRoutePointerKey(scope))
    }
  })
})

describe('SwapsProvider single-driver rule', () => {
  it('sends an exact asset payment request to the holder-owned auction', async () => {
    openRfq.mockResolvedValue({ id: 'payment-offers', bids: [] })
    renderTwoTabs()
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(1))

    await userEvent.click(within(screen.getByTestId('tab-b')).getByText('Asset payment offers b'))

    await waitFor(() => expect(openRfq).toHaveBeenCalledTimes(1))
    expect(openRfq.mock.calls[0][0]).toEqual({
      give: 'arkade:mutinynet/slip44:1',
      take: `arkade:mutinynet/asset:${MUTINYNET_USDT_ASSET_ID}`,
      amount: 20n,
      amountOn: 'take',
      assetPayment: { receiveAddress: 'tark1recipient' },
    })
    expect(accept).not.toHaveBeenCalled()
  })

  it('closes and accepts a follower choice using only the holder-owned auction and quote', async () => {
    const auction = {
      id: 'open-1',
      bids: [
        { id: 'first', expiresAt: 4_000_000_000 },
        { id: 'second', expiresAt: 4_000_000_000 },
      ],
    } as unknown as OpenRfqAuction
    const selected = { id: 'chosen-1', expiresAt: 4_000_000_000 } as Quote
    openRfq.mockResolvedValue(auction)
    quoteBid.mockResolvedValue(selected)
    renderTwoTabs()
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(1))
    const follower = within(screen.getByTestId('tab-b'))
    await userEvent.click(follower.getByText('Offers b'))
    await waitFor(() => expect(follower.getByText('Choose b')).toBeEnabled())
    await userEvent.click(follower.getByText('Choose b'))
    await waitFor(() => expect(follower.getByText('Accept offer b')).toBeEnabled())
    expect(quoteBid.mock.calls[0][0]).toBe(auction)
    expect(quoteBid.mock.calls[0][1]).toBe(auction.bids[1])
    await userEvent.click(follower.getByText('Accept offer b'))
    await waitFor(() => expect(follower.getByTestId('accepted')).toHaveTextContent(SWAP_ID))
    expect(accept).toHaveBeenCalledWith(selected, { validUntil: selected.expiresAt })
    expect(accept.mock.calls[0][0]).toBe(selected)
    expect(clientQuote).not.toHaveBeenCalled()
    expect(ready).toHaveBeenCalledTimes(1)
  })

  it('builds an optional router on the driver without waiting for onchain fees, retaining its client', async () => {
    claimFeeRate.mockReturnValue(new Promise(() => {}))
    renderProvider()
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
    expect(ready).toHaveBeenCalledTimes(1)
    const client = vi.mocked(makeSwapClient).mock.results[0].value

    await userEvent.click(screen.getByText('Route a'))

    await waitFor(() => expect(screen.getByTestId('routed')).toHaveTextContent('router'))
    expect(claimFeeRate).not.toHaveBeenCalled()
    expect(createSendRouter).toHaveBeenCalledWith(expect.objectContaining({ client }))
    expect(vi.mocked(createSendRouter).mock.calls[0][0].client).toBe(client)
  })

  it('builds an optional router without the client when the client failed to start', async () => {
    ready.mockRejectedValue(new Error('swap repository unreadable'))
    renderProvider()
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())

    await userEvent.click(screen.getByText('Route a'))
    await waitFor(() => expect(screen.getByTestId('routed')).toHaveTextContent('router'))
    expect(vi.mocked(createSendRouter).mock.calls[0][0].client).toBeUndefined()

    await userEvent.click(screen.getByText('Router a'))
    await waitFor(() => expect(screen.getByTestId('rejected')).toHaveTextContent('Error'))
  })

  it('waits for onchain fees on the normal driver router and retains the returned rate', async () => {
    let finishFee!: (rate: number) => void
    claimFeeRate.mockReturnValue(new Promise<number>((resolve) => (finishFee = resolve)))
    renderProvider()
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
    expect(ready).toHaveBeenCalledTimes(1)
    const client = vi.mocked(makeSwapClient).mock.results[0].value

    await userEvent.click(screen.getByText('Router a'))
    await waitFor(() => expect(claimFeeRate).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('router')).toHaveTextContent('none')
    expect(createSendRouter).not.toHaveBeenCalled()

    finishFee(7)
    await waitFor(() => expect(screen.getByTestId('router')).toHaveTextContent('function'))
    const deps = vi.mocked(createSendRouter).mock.calls[0][0]
    expect(deps.client).toBe(client)
    expect(deps.claimFeeRateSatVb).toBe(7)
    expect(deps.outputFee?.()).toBe(100)
  })

  it('lists unique onchain RFQ providers at the payout plus the claim fee without requesting a quote', async () => {
    claimFeeRate.mockResolvedValue(7)
    const rfqProvider = (solverId: string, solver: string) => ({ solverId, backend: 'rfq', card: { solver } })
    clientCandidates.mockResolvedValue([
      rfqProvider('harbor', 'Harbor'),
      rfqProvider('harbor', 'Harbor'),
      { solverId: 'other', backend: 'offer', card: { solver: 'Other' } },
      rfqProvider('bay', 'Bay'),
    ])
    renderProvider()
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
    await userEvent.click(screen.getByText('Bitcoin providers a'))

    await waitFor(() => expect(screen.getByTestId('providers')).toHaveTextContent('Harbor,Bay'))
    expect(clientCandidates).toHaveBeenCalledExactlyOnceWith({
      to: RECIPIENT,
      amountOn: 'take',
      amount: 5_000n + claimFeeSats({ claimFeeRateSatVb: 7 }),
    })
    expect(clientQuote).not.toHaveBeenCalled()
    expect(accept).not.toHaveBeenCalled()
  })

  it('refuses a follower send router without quoting, accepting or offboarding', async () => {
    renderTwoTabs()
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(1))
    const b = within(screen.getByTestId('tab-b'))

    await userEvent.click(b.getByText('Router b'))

    await waitFor(() => expect(b.getByTestId('rejected')).toHaveTextContent('SwapsHeldElsewhere'))
    expect(b.getByTestId('router')).toHaveTextContent('none')
    expect(clientQuote).not.toHaveBeenCalled()
    expect(accept).not.toHaveBeenCalled()
    expect(offboard).not.toHaveBeenCalled()
    expect(ready).toHaveBeenCalledTimes(1)
  })

  it('waits for its queued startup grant before constructing a local send router', async () => {
    const locks = gatedLocks()
    withLocks(locks)
    renderProvider()

    await userEvent.click(screen.getByText('Router a'))
    expect(screen.getByTestId('rejected')).toHaveTextContent('none')
    expect(screen.getByTestId('router')).toHaveTextContent('none')
    expect(ready).not.toHaveBeenCalled()

    locks.open()
    await waitFor(() => expect(screen.getByTestId('router')).toHaveTextContent('function'))
    expect(screen.getByTestId('rejected')).toHaveTextContent('none')
    expect(ready).toHaveBeenCalledTimes(1)
    expect(clientQuote).not.toHaveBeenCalled()
    expect(accept).not.toHaveBeenCalled()
    expect(offboard).not.toHaveBeenCalled()
  })

  it('lets only one tab drive, and runs the other tab’s action on it', async () => {
    renderTwoTabs()
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(1))

    // Two clients over one repository would mean two `pushClaim`s over the same
    // VTXOs: one lands, the other fails as a double-spend, and both write
    // records that disagree. One client is still the rule.
    const b = within(screen.getByTestId('tab-b'))
    await userEvent.click(b.getByText('Receive b'))

    // The tab that asked shows an invoice, not an explanation. Starting a
    // receive is not the race the lock exists for — a fresh one mints its own
    // preimage, rfq id and lockup — so there is nothing to refuse, only
    // somewhere else to run it.
    await waitFor(() => expect(b.getByTestId('invoice')).toHaveTextContent(INVOICE), { timeout: 3000 })
    expect(b.getByTestId('rejected')).toHaveTextContent('none')
    expect(ready).toHaveBeenCalledTimes(1)
    expect(receive).toHaveBeenCalledTimes(1)

    // The swap's first outcome is the return value, not an `onUpdate`, so
    // without the driver publishing it the tab that asked would be blind on the
    // one swap it is most likely to be watching.
    expect(b.getByTestId('status')).toHaveTextContent('funded')
  })

  it('gives the tab that is not driving a router of its own, without the swap rails', async () => {
    renderTwoTabs()
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(1))

    const b = within(screen.getByTestId('tab-b'))
    await userEvent.click(b.getByText('Route b'))

    await waitFor(() => expect(b.getByTestId('routed')).toHaveTextContent('router'))
  })

  it('tells the tab that asked when no tab is driving at all', async () => {
    // Granted to nobody: the ask goes out and no client is there to ack it.
    // The message this produces is the last resort, not the ordinary answer to
    // a second tab, which is why it can afford to be about availability.
    withLocks(gatedLocks())
    renderProvider()
    await userEvent.click(screen.getByText('Receive a'))

    await waitFor(() => expect(screen.getByTestId('rejected')).toHaveTextContent('SwapsHeldElsewhere'), {
      timeout: 5000,
    })
    expect(receive).not.toHaveBeenCalled()
  })

  it('promotes the asking tab when the driver goes away mid-request', async () => {
    // Mounted separately so the holder can be closed on its own, which is the
    // situation being reproduced — one tab of two going away.
    const tabA = render(
      wrap(
        <SwapsProvider>
          <Harness tab='a' />
        </SwapsProvider>,
      ),
    )
    render(
      wrap(
        <SwapsProvider>
          <Harness tab='b' />
        </SwapsProvider>,
      ),
    )
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(1))

    // The holder takes the request and never answers it. Waiting on a tab that
    // is gone would be the obvious bug here.
    receive.mockImplementationOnce(() => new Promise(() => {}))
    const b = within(screen.getByTestId('tab-b'))
    await userEvent.click(b.getByText('Receive b'))
    await waitFor(() => expect(receive).toHaveBeenCalledTimes(1))

    // Closing it grants the lock request this tab has been holding all along,
    // so the ask stops being the way to get this done and the action re-runs
    // here — on this tab's own client, against the same repository.
    tabA.unmount()
    await waitFor(() => expect(b.getByTestId('invoice')).toHaveTextContent(INVOICE), { timeout: 3000 })
    expect(b.getByTestId('rejected')).toHaveTextContent('none')
    expect(ready).toHaveBeenCalledTimes(2)
    expect(receive).toHaveBeenCalledTimes(2)
  })

  it('carries an outcome the driver saw to the tab that is not driving', async () => {
    renderTwoTabs()
    await waitFor(() => expect(listeners).toHaveLength(1))

    // `outcomes` and `errors` are per-tab in-memory maps fed by the client, and
    // only one tab has a client. A follower that could start a receive but
    // never hear it was lost would be a worse place to be paid than a refusal.
    listeners[0](update(monitored('lapsed')))
    const b = within(screen.getByTestId('tab-b'))
    await waitFor(() => expect(b.getByTestId('status')).toHaveTextContent('lapsed'))
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

describe('SwapsProvider recovery', () => {
  it('runs the recovery on the client, and reloads the balance it moved', async () => {
    renderProvider()
    await waitFor(() => expect(ready).toHaveBeenCalled())

    await userEvent.click(screen.getByText('Recover a'))

    await waitFor(() => expect(screen.getByTestId('recovered')).toHaveTextContent('true'))
    expect(recover).toHaveBeenCalledWith(OFFER_ID)
    expect(reloadWallet).toHaveBeenCalled()
  })

  it('hands back a round that left this deposit out, rather than calling it done', async () => {
    recover.mockResolvedValue({ recovered: false, txid: 'round-txid', swap: monitored('needs_recovery') })
    renderProvider()
    await waitFor(() => expect(ready).toHaveBeenCalled())

    await userEvent.click(screen.getByText('Recover a'))

    await waitFor(() => expect(screen.getByTestId('recovered')).toHaveTextContent('false'))
  })

  it('runs another tab’s recovery on the driver, once', async () => {
    renderTwoTabs()
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(1))

    const b = within(screen.getByTestId('tab-b'))
    await userEvent.click(b.getByText('Recover b'))

    await waitFor(() => expect(b.getByTestId('recovered')).toHaveTextContent('true'), { timeout: 3000 })
    expect(recover).toHaveBeenCalledTimes(1)
  })

  it('carries a refusal’s reason to the tab that asked', async () => {
    recover.mockRejectedValue(
      Object.assign(new Error('offer swap is cancelled, so it has nothing swept to recover'), {
        name: 'SwapDriveRefusedError',
        reason: 'nothing-swept',
      }),
    )
    renderTwoTabs()
    await waitFor(() => expect(ready).toHaveBeenCalledTimes(1))

    const b = within(screen.getByTestId('tab-b'))
    await userEvent.click(b.getByText('Recover b'))

    await waitFor(() => expect(b.getByTestId('rejected')).toHaveTextContent('SwapDriveRefusedError:nothing-swept'), {
      timeout: 3000,
    })
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

  it.each(['paid', 'claimed'] as const)('does not call a %s SEND money received', async (outcome) => {
    renderProvider()
    await waitFor(() => expect(listeners).toHaveLength(1))

    listeners[0](update(monitored(outcome)))
    await waitFor(() => expect(success).toHaveBeenCalled())
    expect(success).toHaveBeenCalledWith('Payment complete')
  })

  it('still says received when the swap really did take delivery in Arkade', async () => {
    renderProvider()
    await waitFor(() => expect(listeners).toHaveLength(1))

    const receive = monitored('claimed', {
      route: { give: { corridor: 'lightning' }, take: { corridor: 'arkade' } },
    } as Partial<Swap>)
    listeners[0](update(receive))
    await waitFor(() => expect(success).toHaveBeenCalled())
    expect(String(success.mock.calls[0][0])).toMatch(/received/)
  })

  it('stays quiet through a SECOND client’s restore, not just the first', async () => {
    // The ref is component-scoped, so a network switch re-runs the effect in
    // the SAME instance with the gate already open.
    let finishFirst = () => {}
    ready.mockReturnValueOnce(new Promise<void>((resolve) => (finishFirst = () => resolve())))
    const view = render(
      wrap(
        <SwapsProvider>
          <Harness />
        </SwapsProvider>,
      ),
    )
    await waitFor(() => expect(listeners).toHaveLength(1))
    finishFirst()
    await waitFor(() => {
      listeners[0](update(monitored('paid')))
      expect(success).toHaveBeenCalled()
    })
    success.mockClear()

    let finishSecond = () => {}
    ready.mockReturnValueOnce(new Promise<void>((resolve) => (finishSecond = () => resolve())))
    view.rerender(
      wrap(
        <SwapsProvider>
          <Harness />
        </SwapsProvider>,
        'signet',
      ),
    )
    await waitFor(() => expect(listeners.length).toBeGreaterThan(1))

    listeners[listeners.length - 1](update(monitored('claimed')))
    await new Promise((r) => setTimeout(r, 50))
    expect(success).not.toHaveBeenCalled()
    finishSecond()
  })

  it('names a designated asset the way every other screen does', async () => {
    renderProvider()
    await waitFor(() => expect(listeners).toHaveLength(1))

    const usd = (outcome: Outcome) =>
      monitored(outcome, {
        route: { give: { corridor: 'lightning' }, take: { corridor: 'arkade' } },
        take: { asset: `arkade:mutinynet/asset:${MUTINYNET_USDT_ASSET_ID}`, amount: BigInt(199) },
      } as unknown as Partial<Swap>)
    listeners[0](update(usd('claimed')))

    await waitFor(() => expect(success).toHaveBeenCalled())
    expect(success).toHaveBeenCalledWith('Swap completed, USD received')
  })

  it('says nothing about the history its own restore just replayed', async () => {
    let finishRestore = () => {}
    ready.mockReturnValueOnce(new Promise<void>((resolve) => (finishRestore = () => resolve())))
    renderProvider()
    await waitFor(() => expect(listeners).toHaveLength(1))

    listeners[0](update(monitored('paid')))
    listeners[0](update(monitored('claimed')))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('claimed'))
    expect(success).not.toHaveBeenCalled()
    expect(reloadWallet).not.toHaveBeenCalled()

    finishRestore()
    await waitFor(() => {
      listeners[0](update(monitored('paid')))
      expect(success).toHaveBeenCalledWith('Payment complete')
    })
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
