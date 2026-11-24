import { useContext, useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InsufficientFunds, type OpenRfqAuction, type OpenRfqOffer, type Quote, type Swap } from '@arkade-os/swap'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { SwapsContext, SwapsProvider } from '../../providers/swaps'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'
import * as lnSwap from '../../lib/lnSwap'
import * as constants from '../../lib/constants'
import { storeAssetPayment } from '../../lib/pendingAssetPayment'
import { saveSolverCards } from '../../lib/solverCards'
import { saveSolverRouting } from '../../lib/solverRouting'
import { solverDirectionKey, solverId, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { btcUsdt } from '../lib/swapFixtures'

const mocks = vi.hoisted(() => ({
  created: vi.fn(),
  discoverMarkets: vi.fn(),
  watchSwapMarkets: vi.fn(),
  offerSwaps: vi.fn(),
  quote: vi.fn(),
  saveSnapshot: vi.fn(),
  getSwapRecord: vi.fn(),
  openRfq: vi.fn(),
  quoteBid: vi.fn(),
  receive: vi.fn(),
  accept: vi.fn(),
  cancel: vi.fn(),
  dispose: vi.fn(),
  swaps: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('../../lib/directTaxiSend', () => ({
  getPendingDirectTaxi: async () => undefined,
  withTaxiPaymentLock: async (_wallet: unknown, network: string, run: (sender: string) => Promise<unknown>) =>
    run(`test-sender-${network}`),
}))

vi.mock('../../lib/swapMarkets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapMarkets')>()),
  discoverMarkets: mocks.discoverMarkets,
  watchSwapMarkets: mocks.watchSwapMarkets,
}))
vi.mock('../../lib/swapRepository', () => ({
  assetSwapRepository: { getSwapRecord: mocks.getSwapRecord },
  saveQuoteSnapshot: mocks.saveSnapshot,
  quoteSnapshotOf: () => undefined,
}))
vi.mock('../../lib/swapRecords', () => ({
  displayAssetOf: (assetId: string) => assetId,
  offerSwaps: mocks.offerSwaps,
}))
vi.mock('../../lib/swapClient', () => ({
  makeSwapClient: (wallet: unknown) => {
    mocks.created(wallet)
    return {
      ready: Promise.resolve(),
      onUpdate: () => () => {},
      quote: mocks.quote,
      openRfq: mocks.openRfq,
      quoteBid: mocks.quoteBid,
      receive: mocks.receive,
      accept: mocks.accept,
      cancel: mocks.cancel,
      swaps: mocks.swaps,
      [Symbol.asyncDispose]: mocks.dispose,
    }
  },
  SwapsHeldElsewhere: class SwapsHeldElsewhere extends Error {},
}))
vi.mock('../../components/Toast', () => ({
  toast: { success: mocks.toastSuccess, error: vi.fn(), info: vi.fn() },
}))

const market = (over: Record<string, unknown> = {}) => ({
  quote_corridor: undefined,
  quote_asset: { id: 'quote-asset', ticker: 'Q', decimals: 0 },
  base_asset: { id: 'base-asset', ticker: 'B', decimals: 0 },
  ...over,
})

const lightningMarket = (over: Record<string, unknown> = {}) =>
  market({
    base_asset: { id: 'btc', ticker: 'BTC', decimals: 8 },
    quote_asset: { id: 'btc', ticker: 'BTC', decimals: 8 },
    quote_corridor: 'lightning',
    ...over,
  })

function LightningProbe({ operation }: { operation: 'send' | 'receive' }) {
  const { quotePay, receiveLightning } = useContext(SwapsContext)
  const [error, setError] = useState('')
  return (
    <>
      <button
        onClick={async () => {
          try {
            if (operation === 'send') await quotePay('lnbc1invoice')
            else await receiveLightning(1000)
          } catch (error) {
            setError((error as Error).message)
          }
        }}
      >
        try Lightning
      </button>
      <output>{error}</output>
    </>
  )
}

const swap = {
  id: 'swap-1',
  outcome: 'funded',
  fundingTxid: 'funding-txid',
  artifact: { kind: 'invoice', bolt11: 'lnbc1invoice' },
  expiresAt: 123,
  give: { amount: BigInt(1010) },
} as unknown as Swap

const ASSET_ID = 'a'.repeat(68)

function OpenQuoteProbe() {
  const { openSwapQuotes, cancelOpenSwapQuotes, chooseSwapQuote, acceptSwapQuote } = useContext(SwapsContext)
  const [auction, setAuction] = useState<OpenRfqAuction>()
  const [quote, setQuote] = useState<Quote>()
  const [error, setError] = useState('')
  const failed = (err: Error) => setError(err.message)
  return (
    <>
      <button onClick={() => void openSwapQuotes('btc', ASSET_ID, 1000n, 'request-1').then(setAuction).catch(failed)}>
        open offers
      </button>
      <button onClick={() => void cancelOpenSwapQuotes('request-1').catch(failed)}>stop offers</button>
      <button
        disabled={!auction}
        onClick={() => void chooseSwapQuote(auction!.id, 'second').then(setQuote).catch(failed)}
      >
        choose second
      </button>
      <button
        disabled={!quote}
        onClick={() => void acceptSwapQuote({ ...quote!, take: { ...quote!.take, amount: 999999n } }).catch(failed)}
      >
        accept chosen
      </button>
      <output>{error}</output>
    </>
  )
}

function FirmQuoteProbe() {
  const { quoteExchange, acceptSwapQuote } = useContext(SwapsContext)
  const [quote, setQuote] = useState<Quote>()
  const [failure, setFailure] = useState('')
  const plan = {
    deposit: { asset: { id: 'btc', decimals: 0 }, atomic: 1000n },
    receive: { asset: { id: ASSET_ID, decimals: 0 }, atomic: 1000n },
  } as never
  return (
    <>
      <button onClick={() => void quoteExchange(plan).then(setQuote, (err: Error) => setFailure(err.name))}>
        firm quote
      </button>
      <button
        disabled={!quote}
        onClick={() => void acceptSwapQuote(quote!).catch((err: Error) => setFailure(err.name))}
      >
        accept firm
      </button>
      <output>{failure}</output>
    </>
  )
}

function Harness({ canonical = false, network = 'regtest' } = {}) {
  const {
    markets,
    discoveryReady,
    swapAvailable,
    swaps,
    runDiscovery,
    quotePay,
    receiveLightning,
    quoteExchange,
    acceptSwapQuote,
    cancelSwap,
  } = useContext(SwapsContext)
  const plan = {
    deposit: { asset: { id: canonical ? `arkade:${network}/slip44:1` : 'btc', decimals: 0 }, atomic: BigInt(1000) },
    receive: {
      asset: { id: canonical ? `arkade:${network}/asset:${ASSET_ID}` : ASSET_ID, decimals: 0 },
      atomic: BigInt(1000),
    },
  } as never
  const showError = (error: Error) => {
    const node = document.querySelector('[data-testid="exchange-error"]')
    if (node) node.textContent = error.message
  }
  return (
    <>
      <output data-testid='market-count'>{markets.length}</output>
      <output data-testid='discovery-ready'>{String(discoveryReady)}</output>
      <output data-testid='available'>{String(swapAvailable)}</output>
      <output data-testid='swap-count'>{swaps.length}</output>
      <button onClick={() => void quotePay('bitcoin:address')}>quote</button>
      <button onClick={() => runDiscovery(false)}>refresh discovery</button>
      <button onClick={() => void receiveLightning(1000)}>receive</button>
      <button onClick={() => void cancelSwap('swap-1')}>cancel</button>
      <button
        onClick={() =>
          void quoteExchange(plan).then((quote) => {
            const node = document.querySelector('[data-testid="exchange-take"]')
            if (node) node.textContent = String(quote.take.amount)
          }, showError)
        }
      >
        exchange
      </button>
      <button
        onClick={() =>
          void quoteExchange(plan)
            .then((quote) => acceptSwapQuote(quote, { fromTicker: 'BTC' }))
            .catch(showError)
        }
      >
        fund
      </button>
      <output data-testid='exchange-take' />
      <output data-testid='exchange-error' />
    </>
  )
}

const providerTree = (wallet = {}, children = <Harness />, asp = mockAspContextValue) => (
  <AspContext.Provider value={asp}>
    <WalletContext.Provider
      value={
        {
          ...mockWalletContextValue,
          dataReady: true,
          svcWallet: { identity: { xOnlyPublicKey: async () => new Uint8Array(32) } },
          isVerifiedAsset: () => true,
          ...wallet,
        } as never
      }
    >
      <SwapsProvider>{children}</SwapsProvider>
    </WalletContext.Provider>
  </AspContext.Provider>
)

const renderProvider = (wallet = {}, children = <Harness />) => render(providerTree(wallet, children))
// The driver starts once the wallet identity resolves into its scope.
const renderReady = async (wallet = {}, children = <Harness />) => {
  const view = renderProvider(wallet, children)
  await act(async () => {})
  return view
}

beforeEach(() => {
  localStorage.clear()
  mocks.swaps.mockResolvedValue([])
  mocks.getSwapRecord.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true })
  mocks.discoverMarkets.mockResolvedValue([])
  mocks.watchSwapMarkets.mockReturnValue(() => {})
  mocks.offerSwaps.mockResolvedValue([])
  mocks.quote.mockResolvedValue({ id: 'quote-1' } as Quote)
  mocks.receive.mockResolvedValue(swap)
  mocks.accept.mockResolvedValue(swap)
  mocks.cancel.mockResolvedValue({ outcome: 'cancelled' })
  mocks.dispose.mockResolvedValue(undefined)
  mocks.toastSuccess.mockReset()
})

afterEach(() => vi.clearAllMocks())

function Payer() {
  const { quoteAssetPayment, acceptAssetPayment } = useContext(SwapsContext)
  const [state, setState] = useState('pay asset')
  return (
    <button
      onClick={async () => {
        try {
          const quote = await quoteAssetPayment(
            { arkAddress: 'recipient', assetId: ASSET_ID, amount: 500n },
            { receiveAddress: 'recipient', carrier: { mode: 'purchase' } },
          )
          await acceptAssetPayment(quote)
        } catch (error) {
          setState((error as Error).message)
        }
      }}
    >
      {state}
    </button>
  )
}

const unsentRecord = (over: Record<string, unknown> = {}) => ({
  id: 'original',
  family: 'offer',
  status: 'cancelled',
  route: { give: { instrument: { kind: 'wallet' } } },
  expiresAt: 200,
  fundingNotSubmitted: { reason: 'send_deadline', validUntil: 100 },
  ...over,
})

function PaymentCheck() {
  const { checkAssetPayment } = useContext(SwapsContext)
  const [state, setState] = useState('check')
  return (
    <button
      onClick={async () => {
        try {
          setState((await checkAssetPayment()).fundingTxid!)
        } catch (error) {
          setState((error as Error).message)
        }
      }}
    >
      {state}
    </button>
  )
}

describe('SwapsProvider', () => {
  it('waits for current discovery before treating an empty market list as settled', () => {
    let publish!: (markets: DiscoveredMarket[]) => void
    mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: typeof publish) => {
      publish = onMarkets
      return () => {}
    })
    renderProvider()
    expect(screen.getByTestId('discovery-ready')).toHaveTextContent('false')
    act(() => publish([]))
    expect(screen.getByTestId('discovery-ready')).toHaveTextContent('true')
    expect(screen.getByTestId('market-count')).toHaveTextContent('0')
  })

  it('invalidates readiness for pinned-card changes and rejects the old watch result', () => {
    const publish: ((markets: DiscoveredMarket[]) => void)[] = []
    const stop = vi.fn()
    mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (typeof publish)[number]) => {
      publish.push(onMarkets)
      return stop
    })
    renderProvider()
    act(() => publish[0]([btcUsdt]))
    expect(screen.getByTestId('discovery-ready')).toHaveTextContent('true')
    act(() => saveSolverCards([]))
    expect(stop).toHaveBeenCalledOnce()
    expect(screen.getByTestId('discovery-ready')).toHaveTextContent('false')
    expect(screen.getByTestId('market-count')).toHaveTextContent('1')
    act(() => publish[0]([]))
    expect(screen.getByTestId('discovery-ready')).toHaveTextContent('false')
    expect(screen.getByTestId('market-count')).toHaveTextContent('1')
    act(() => publish[1]([]))
    expect(screen.getByTestId('discovery-ready')).toHaveTextContent('true')
    expect(screen.getByTestId('market-count')).toHaveTextContent('0')
  })

  it('rejects a late watch result after the network changes', () => {
    const publish: ((markets: DiscoveredMarket[]) => void)[] = []
    mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (typeof publish)[number]) => {
      publish.push(onMarkets)
      return () => {}
    })
    const view = renderProvider()
    act(() => publish[0]([btcUsdt]))
    view.rerender(
      providerTree({}, <Harness />, {
        ...mockAspContextValue,
        aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet' },
      }),
    )
    expect(screen.getByTestId('discovery-ready')).toHaveTextContent('false')
    act(() => publish[0]([btcUsdt]))
    expect(screen.getByTestId('discovery-ready')).toHaveTextContent('false')
    expect(screen.getByTestId('market-count')).toHaveTextContent('0')
    act(() => publish[1]([]))
    expect(screen.getByTestId('discovery-ready')).toHaveTextContent('true')
  })

  it('ignores a manual discovery result from the previous pinned-card version', async () => {
    let finish!: (markets: DiscoveredMarket[]) => void
    const publish: ((markets: DiscoveredMarket[]) => void)[] = []
    mocks.discoverMarkets.mockReturnValue(
      new Promise<DiscoveredMarket[]>((resolve) => {
        finish = resolve
      }),
    )
    mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (typeof publish)[number]) => {
      publish.push(onMarkets)
      return () => {}
    })
    renderProvider()
    act(() => publish[0]([btcUsdt]))
    fireEvent.click(screen.getByText('refresh discovery'))
    expect(screen.getByTestId('discovery-ready')).toHaveTextContent('false')
    act(() => saveSolverCards([]))
    act(() => publish[1]([]))
    await act(async () => finish([btcUsdt]))
    expect(screen.getByTestId('discovery-ready')).toHaveTextContent('true')
    expect(screen.getByTestId('market-count')).toHaveTextContent('0')
  })

  it('publishes only the latest of overlapping manual discovery refreshes', async () => {
    const finish: ((markets: DiscoveredMarket[]) => void)[] = []
    mocks.discoverMarkets.mockImplementation(() => new Promise<DiscoveredMarket[]>((resolve) => finish.push(resolve)))
    renderProvider()
    fireEvent.click(screen.getByText('refresh discovery'))
    fireEvent.click(screen.getByText('refresh discovery'))
    await act(async () => finish[1]([]))
    expect(screen.getByTestId('discovery-ready')).toHaveTextContent('true')
    await act(async () => finish[0]([btcUsdt]))
    expect(screen.getByTestId('market-count')).toHaveTextContent('0')
  })

  it('refreshes the current card scope while discovery remains unready', async () => {
    // Decoding a fresh key would accidentally refresh the stale context memo.
    const emulatorPubkey = vi.spyOn(constants, 'getEmulatorPubkeyForNetwork').mockReturnValue(new Uint8Array(32))
    mocks.watchSwapMarkets.mockImplementation(() => () => {})
    mocks.discoverMarkets.mockResolvedValue([btcUsdt])
    try {
      renderProvider()
      await waitFor(() => expect(mocks.created).toHaveBeenCalledOnce())
      expect(screen.getByTestId('discovery-ready')).toHaveTextContent('false')
      expect(screen.getByTestId('market-count')).toHaveTextContent('0')
      act(() => saveSolverCards([]))
      await waitFor(() => expect(mocks.created).toHaveBeenCalledTimes(2))
      expect(screen.getByTestId('discovery-ready')).toHaveTextContent('false')
      expect(screen.getByTestId('market-count')).toHaveTextContent('0')
      fireEvent.click(screen.getByText('refresh discovery'))
      await waitFor(() => expect(screen.getByTestId('discovery-ready')).toHaveTextContent('true'))
      expect(screen.getByTestId('market-count')).toHaveTextContent('1')
    } finally {
      emulatorPubkey.mockRestore()
    }
  })

  it('does not turn a failed refresh into a settled empty discovery', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.watchSwapMarkets.mockImplementation((_network: string, publish: (markets: DiscoveredMarket[]) => void) => {
      publish([])
      return () => {}
    })
    mocks.discoverMarkets.mockRejectedValue(new Error('registry unavailable'))
    try {
      renderProvider()
      expect(screen.getByTestId('discovery-ready')).toHaveTextContent('true')
      fireEvent.click(screen.getByText('refresh discovery'))
      expect(screen.getByTestId('discovery-ready')).toHaveTextContent('false')
      await waitFor(() => expect(error).toHaveBeenCalledWith('solver discovery failed: registry unavailable'))
      expect(screen.getByTestId('discovery-ready')).toHaveTextContent('false')
    } finally {
      error.mockRestore()
    }
  })

  it.each([
    { name: 'native BTC', wallet: { availableBalance: 1000, availableAssetBalances: [] } },
    {
      name: 'Arkade token',
      wallet: { availableBalance: 0, availableAssetBalances: [{ assetId: ASSET_ID, amount: 1000n }] },
    },
  ])('allows public discovery without known markets from $name', async ({ wallet }) => {
    renderProvider(wallet)
    await waitFor(() => expect(mocks.created).toHaveBeenCalled())
    expect(screen.getByTestId('market-count')).toHaveTextContent('0')
    expect(screen.getByTestId('available')).toHaveTextContent('true')
  })

  it('keeps the selected auction offer and its original verified quote through acceptance', async () => {
    const auction: OpenRfqAuction = {
      id: 'auction-1',
      input: {
        give: 'arkade:regtest/slip44:1',
        take: `arkade:regtest/asset:${ASSET_ID}`,
        amount: 1000n,
        amountOn: 'give',
      },
      pair: `arkade:regtest/slip44:1->arkade:regtest/asset:${ASSET_ID}`,
      closedAt: 123,
      bids: ['first', 'second'].map(
        (id, index) =>
          ({
            id,
            solverPubkey: 'ab'.repeat(32),
            solverName: id,
            market: btcUsdt,
            signedCard: {},
            fromAmount: 1000n,
            toAmount: BigInt(990 - index * 10),
            expiresAt: 9999999999,
          }) as OpenRfqOffer,
      ),
    }
    const quote = { id: 'selected-quote', expiresAt: 9999999999, take: { amount: 980n } } as Quote
    mocks.openRfq.mockResolvedValue(auction)
    mocks.quoteBid.mockResolvedValue(quote)
    renderProvider({}, <OpenQuoteProbe />)
    await waitFor(() => expect(mocks.created).toHaveBeenCalled())
    fireEvent.click(screen.getByText('open offers'))
    await waitFor(() => expect(screen.getByText('choose second')).toBeEnabled())
    expect(mocks.openRfq).toHaveBeenCalledWith(
      {
        give: 'arkade:regtest/slip44:1',
        take: `arkade:regtest/asset:${ASSET_ID}`,
        amount: 1000n,
        amountOn: 'give',
      },
      expect.objectContaining({ secretKey: expect.any(Uint8Array), signal: expect.any(AbortSignal) }),
    )
    const relays = mocks.openRfq.mock.calls[0][1].relays as string[]
    expect(relays.length).toBeGreaterThan(0)
    expect(relays.every((value) => /^wss?:/.test(value))).toBe(true)
    fireEvent.click(screen.getByText('choose second'))
    await waitFor(() => expect(screen.getByText('accept chosen')).toBeEnabled())
    expect(mocks.quoteBid).toHaveBeenCalledWith(auction, auction.bids[1])
    fireEvent.click(screen.getByText('accept chosen'))
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith(quote, { validUntil: quote.expiresAt }))
    expect(mocks.accept.mock.calls[0][0]).toBe(quote)
    expect(mocks.quote).not.toHaveBeenCalled()
  })

  it('drops a malformed card relay instead of failing the public request', async () => {
    mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (markets: unknown[]) => void) => {
      onMarkets([market({ transports: { nostr: { relays: ['not a relay', 'wss://relay.example'] } } })])
      return () => {}
    })
    mocks.openRfq.mockResolvedValue({ id: 'auction-1', bids: [] })
    renderProvider({}, <OpenQuoteProbe />)
    await waitFor(() => expect(mocks.created).toHaveBeenCalled())

    fireEvent.click(screen.getByText('open offers'))

    await waitFor(() => expect(mocks.openRfq).toHaveBeenCalledOnce())
    expect(mocks.openRfq.mock.calls[0][1].relays).toContain('wss://relay.example/')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('keeps a relay slot for the requested pair and skips non-websocket relays', async () => {
    const crowded = Array.from({ length: 16 }, (_, index) => `wss://other-${index}.example`)
    mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (markets: unknown[]) => void) => {
      onMarkets([
        market({ transports: { nostr: { relays: ['nostr:relay.example'] } } }),
        market({ transports: { nostr: { relays: crowded } } }),
        {
          ...btcUsdt,
          quote_asset: { ...btcUsdt.quote_asset, id: ASSET_ID },
          transports: { nostr: { relays: ['wss://pair.example'] } },
        },
      ])
      return () => {}
    })
    mocks.openRfq.mockResolvedValue({ id: 'auction-1', bids: [] })
    renderProvider({}, <OpenQuoteProbe />)
    await waitFor(() => expect(mocks.created).toHaveBeenCalled())

    fireEvent.click(screen.getByText('open offers'))

    await waitFor(() => expect(mocks.openRfq).toHaveBeenCalledOnce())
    const relays = mocks.openRfq.mock.calls[0][1].relays as string[]
    expect(relays).toHaveLength(16)
    expect(relays).toContain('wss://pair.example/')
    expect(relays.every((relay) => /^wss?:/.test(relay))).toBe(true)
  })

  it('aborts an outstanding public request without funding', async () => {
    mocks.openRfq.mockImplementation(
      (_input, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new Error('Request cancelled')))
        }),
    )
    renderProvider({}, <OpenQuoteProbe />)
    await waitFor(() => expect(mocks.created).toHaveBeenCalled())
    fireEvent.click(screen.getByText('open offers'))
    await waitFor(() => expect(mocks.openRfq).toHaveBeenCalled())
    fireEvent.click(screen.getByText('stop offers'))
    await screen.findByText('Request cancelled')
    expect(mocks.openRfq.mock.calls[0][1].signal.aborted).toBe(true)
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('accepts a Lightning amount supported by an alternate solver', async () => {
    mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (markets: unknown[]) => void) => {
      onMarkets([
        lightningMarket({ min_base_amount: '100', max_base_amount: '500' }),
        lightningMarket({ min_base_amount: '1000', max_base_amount: '2000' }),
      ])
      return () => {}
    })
    renderProvider()
    await waitFor(() => expect(mocks.created).toHaveBeenCalled())
    fireEvent.click(screen.getByText('receive'))
    await waitFor(() => expect(mocks.receive).toHaveBeenCalledWith({ amount: BigInt(1000), via: 'lightning' }))
  })

  it.each(['send', 'receive'] as const)(
    'accepts %s through a reversed larger BTC Lightning card',
    async (operation) => {
      const decoder = vi
        .spyOn(lnSwap, 'toInvoiceFacts')
        .mockReturnValue({ raw: 'lnbc1invoice', amountSats: 1000, paymentHash: 'a'.repeat(64), expiresAt: 9999999999 })
      try {
        mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (markets: unknown[]) => void) => {
          onMarkets([
            lightningMarket({
              min_base_amount: '100',
              max_base_amount: '500',
              min_quote_amount: '100',
              max_quote_amount: '500',
            }),
            lightningMarket({
              base_corridor: 'lightning',
              quote_corridor: 'arkade',
              min_base_amount: operation === 'send' ? '1000' : '3000',
              max_base_amount: operation === 'send' ? '2000' : '4000',
              min_quote_amount: operation === 'receive' ? '1000' : '3000',
              max_quote_amount: operation === 'receive' ? '2000' : '4000',
            }),
          ])
          return () => {}
        })
        renderProvider({}, <LightningProbe operation={operation} />)
        await waitFor(() => expect(mocks.created).toHaveBeenCalled())
        fireEvent.click(screen.getByText('try Lightning'))
        await waitFor(() => expect(operation === 'send' ? mocks.quote : mocks.receive).toHaveBeenCalled())
      } finally {
        decoder.mockRestore()
      }
    },
  )

  it.each(['send', 'receive'] as const)(
    'reports the actual %s payout bounds on a reversed-only card',
    async (operation) => {
      const decoder = vi
        .spyOn(lnSwap, 'toInvoiceFacts')
        .mockReturnValue({ raw: 'lnbc1invoice', amountSats: 1000, paymentHash: 'a'.repeat(64), expiresAt: 9999999999 })
      try {
        mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (markets: unknown[]) => void) => {
          onMarkets([
            lightningMarket({
              base_corridor: 'lightning',
              quote_corridor: 'arkade',
              min_base_amount: '100',
              max_base_amount: '500',
              min_quote_amount: '2000',
              max_quote_amount: '3000',
            }),
          ])
          return () => {}
        })
        renderProvider({}, <LightningProbe operation={operation} />)
        fireEvent.click(screen.getByText('try Lightning'))
        expect(
          await screen.findByText(
            `Amount outside solver bounds (${operation === 'send' ? '100-500' : '2,000-3,000'} sats)`,
          ),
        ).toBeInTheDocument()
        expect(mocks.quote).not.toHaveBeenCalled()
        expect(mocks.receive).not.toHaveBeenCalled()
      } finally {
        decoder.mockRestore()
      }
    },
  )

  it('reports all applicable disjoint ranges without admitting their gap', async () => {
    function ReceiveProbe() {
      const { receiveLightning } = useContext(SwapsContext)
      const [error, setError] = useState('')
      return (
        <>
          <button
            onClick={async () => {
              try {
                await receiveLightning(1000)
              } catch (error) {
                setError((error as Error).message)
              }
            }}
          >
            try receive
          </button>
          <output>{error}</output>
        </>
      )
    }
    mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (markets: unknown[]) => void) => {
      onMarkets([
        lightningMarket({ min_base_amount: '100', max_base_amount: '500' }),
        lightningMarket({ min_base_amount: '2000', max_base_amount: '3000' }),
      ])
      return () => {}
    })
    renderProvider({}, <ReceiveProbe />)
    fireEvent.click(screen.getByText('try receive'))
    expect(await screen.findByText('Amount outside solver bounds (100-500, 2,000-3,000 sats)')).toBeInTheDocument()
    expect(mocks.receive).not.toHaveBeenCalled()
  })

  it.each(['send', 'receive'] as const)('ignores a paused solver when checking %s bounds', async (operation) => {
    const small = lightningMarket({
      solver: 'small',
      source: 'small',
      min_base_amount: '100',
      max_base_amount: '500',
      min_quote_amount: '100',
      max_quote_amount: '500',
    }) as DiscoveredMarket
    const wide = lightningMarket({
      solver: 'wide',
      source: 'wide',
      min_base_amount: '1000',
      max_base_amount: '2000',
      min_quote_amount: '1000',
      max_quote_amount: '2000',
    }) as DiscoveredMarket
    const network = mockAspContextValue.aspInfo.network
    saveSolverRouting(network, solverDirectionKey(wide, operation === 'send' ? 'base' : 'quote', network), {
      disabled: [solverId(wide, network)],
    })
    mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (markets: unknown[]) => void) => {
      onMarkets([small, wide])
      return () => {}
    })
    const decoder = vi
      .spyOn(lnSwap, 'toInvoiceFacts')
      .mockReturnValue({ raw: 'lnbc1invoice', amountSats: 1000, paymentHash: 'a'.repeat(64), expiresAt: 9999999999 })
    try {
      renderProvider({}, <LightningProbe operation={operation} />)
      fireEvent.click(screen.getByText('try Lightning'))
      expect(await screen.findByText('Amount outside solver bounds (100-500 sats)')).toBeInTheDocument()
      expect(mocks.quote).not.toHaveBeenCalled()
      expect(mocks.receive).not.toHaveBeenCalled()
    } finally {
      decoder.mockRestore()
    }
  })

  it('discards identity resolution from an obsolete wallet before starting a driver', async () => {
    let finish!: (pubkey: Uint8Array) => void
    const first = {
      identity: {
        xOnlyPublicKey: () =>
          new Promise<Uint8Array>((resolve) => {
            finish = resolve
          }),
      },
    }
    const second = { identity: { xOnlyPublicKey: async () => new Uint8Array(32).fill(1) } }
    const view = await renderReady({ svcWallet: first })
    expect(mocks.created).not.toHaveBeenCalled()
    view.rerender(providerTree({ svcWallet: second }))
    await waitFor(() => expect(mocks.created).toHaveBeenCalledOnce())
    expect(mocks.created.mock.calls[0][0]).toBe(second)
    await act(async () => finish(new Uint8Array(32)))
    expect(mocks.created).toHaveBeenCalledOnce()
  })

  it('prepares a review without funding and accepts exactly its original quote', async () => {
    const quoted = {
      id: 'reviewed-quote',
      give: { amount: 1000n },
      take: { amount: 1000n },
      expiresAt: Math.floor(Date.now() / 1000) + 600,
    } as Quote
    mocks.quote.mockResolvedValue(quoted)
    function Trade() {
      const { quoteExchange, acceptSwapQuote } = useContext(SwapsContext)
      const [review, setReview] = useState<Quote>()
      return (
        <>
          <button
            onClick={async () =>
              setReview(
                await quoteExchange({
                  deposit: { asset: { id: 'btc' }, atomic: 1000n },
                  receive: { asset: { id: ASSET_ID }, atomic: 1000n },
                } as never),
              )
            }
          >
            review
          </button>
          <button disabled={!review} onClick={() => review && void acceptSwapQuote(review)}>
            confirm
          </button>
        </>
      )
    }
    await renderReady({}, <Trade />)
    fireEvent.click(screen.getByText('review'))
    await waitFor(() => expect(screen.getByText('confirm')).toBeEnabled())
    expect(mocks.quote).toHaveBeenCalledOnce()
    expect(mocks.accept).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('confirm'))
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith(quoted, { validUntil: quoted.expiresAt }))
    expect(mocks.accept.mock.calls[0][0]).toBe(quoted)
    expect(mocks.quote).toHaveBeenCalledOnce()
  })

  it('refuses a prepared quote after the owning wallet client changes', async () => {
    const quoted = { id: 'old-wallet-quote', take: { amount: 1000n }, expiresAt: Date.now() / 1000 + 600 } as Quote
    mocks.quote.mockResolvedValue(quoted)
    function Trade() {
      const { quoteExchange, acceptSwapQuote } = useContext(SwapsContext)
      const [review, setReview] = useState<Quote>()
      const [error, setError] = useState('')
      return (
        <>
          <button
            onClick={() =>
              void quoteExchange({
                deposit: { asset: { id: 'btc' }, atomic: 1000n },
                receive: { asset: { id: ASSET_ID }, atomic: 1000n },
              } as never)
                .then(setReview)
                .catch((error: Error) => setError(error.message))
            }
          >
            review
          </button>
          <button
            disabled={!review}
            onClick={() => review && void acceptSwapQuote(review).catch((error: Error) => setError(error.message))}
          >
            confirm
          </button>
          <output>{error}</output>
        </>
      )
    }
    const view = await renderReady({}, <Trade />)
    fireEvent.click(screen.getByText('review'))
    await waitFor(() => expect(screen.getByText('confirm')).toBeEnabled())
    view.rerender(
      providerTree({ svcWallet: { identity: { xOnlyPublicKey: async () => new Uint8Array(32) } } }, <Trade />),
    )
    await waitFor(() => expect(mocks.created).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByText('confirm'))
    await screen.findByText('This quote is no longer available — refresh to try again')
    expect(mocks.quote).toHaveBeenCalledOnce()
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('discards a quote that resolves after the owning client was replaced', async () => {
    let resolve!: (quote: Quote) => void
    mocks.quote.mockReturnValue(
      new Promise<Quote>((done) => {
        resolve = done
      }),
    )
    function Trade() {
      const { quoteExchange } = useContext(SwapsContext)
      const [error, setError] = useState('')
      return (
        <>
          <button
            onClick={() =>
              void quoteExchange({
                deposit: { asset: { id: 'btc' }, atomic: 1000n },
                receive: { asset: { id: ASSET_ID }, atomic: 1000n },
              } as never).catch((error: Error) => setError(error.message))
            }
          >
            review
          </button>
          <output>{error}</output>
        </>
      )
    }
    const view = await renderReady({}, <Trade />)
    fireEvent.click(screen.getByText('review'))
    await waitFor(() => expect(mocks.quote).toHaveBeenCalledOnce())
    view.rerender(
      providerTree({ svcWallet: { identity: { xOnlyPublicKey: async () => new Uint8Array(32) } } }, <Trade />),
    )
    await waitFor(() => expect(mocks.created).toHaveBeenCalledTimes(2))
    await act(async () => resolve({ id: 'late-quote', take: { amount: 1000n } } as Quote))
    await screen.findByText('This quote is no longer available — refresh to try again')
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('quotes an exact asset payment and accepts the original prepared quote', async () => {
    const quoted = {
      id: 'asset-payment-quote',
      give: { amount: 1000n },
      expiresAt: Math.floor(Date.now() / 1000) + 600,
    } as Quote
    mocks.quote.mockResolvedValue(quoted)
    mocks.accept.mockResolvedValue({ ...swap, id: `offer:${quoted.id}` })
    function AssetPaymentScreen() {
      const { quoteAssetPayment, acceptAssetPayment } = useContext(SwapsContext)
      const [state, setState] = useState('ready')
      return (
        <button
          onClick={async () => {
            try {
              const quote = await quoteAssetPayment(
                { arkAddress: 'recipient', assetId: ASSET_ID, amount: 500n },
                { receiveAddress: 'recipient', carrier: { mode: 'purchase' } },
              )
              const accepted = await acceptAssetPayment(quote)
              setState(accepted.fundingTxid!)
            } catch (error) {
              setState((error as Error).message)
            }
          }}
        >
          {state}
        </button>
      )
    }
    await renderReady({}, <AssetPaymentScreen />)
    fireEvent.click(screen.getByText('ready'))
    await screen.findByText('funding-txid')
    expect(mocks.quote).toHaveBeenCalledWith({
      give: 'arkade:regtest/slip44:1',
      take: `arkade:regtest/asset:${ASSET_ID}`,
      amount: 500n,
      amountOn: 'take',
      assetPayment: { receiveAddress: 'recipient', carrier: { mode: 'purchase' } },
    })
    expect(mocks.accept).toHaveBeenCalledOnce()
    expect(mocks.accept.mock.calls[0][0]).toBe(quoted)
    expect(mocks.saveSnapshot).toHaveBeenCalledWith(quoted.id, { payee: 'recipient' })
  })

  it('blocks a new quote after ambiguous acceptance, including a remounted payer with spare funds', async () => {
    mocks.quote.mockResolvedValue({ id: 'ambiguous-asset-quote', give: { amount: 1000n } })
    mocks.accept.mockRejectedValue(new Error('reply lost after submission'))
    const view = await renderReady({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText('reply lost after submission')
    await act(async () => {
      fireEvent.click(screen.getByText('reply lost after submission'))
    })
    expect([mocks.quote.mock.calls.length, mocks.accept.mock.calls.length]).toEqual([1, 1])
    view.unmount()
    await renderReady({}, <Payer />)
    await act(async () => {
      fireEvent.click(screen.getByText('pay asset'))
    })
    expect(mocks.quote).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Check asset payment'))
    expect(mocks.accept).toHaveBeenCalledOnce()
  })

  it('aborts before acceptance when its critical journal cannot be written', async () => {
    mocks.quote.mockResolvedValue({ id: 'storage-quote', give: { amount: 1000n } })
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    await renderReady({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText('storage unavailable')
    expect(mocks.accept).not.toHaveBeenCalled()
    write.mockRestore()
  })

  it('checks only the original stored swap after ambiguity, without accepting or quoting again', async () => {
    mocks.quote.mockResolvedValue({ id: 'original', give: { amount: 1000n } })
    mocks.accept.mockRejectedValue(new Error('reply lost'))
    const view = await renderReady({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText('reply lost')
    view.unmount()
    mocks.swaps.mockResolvedValue([{ ...swap, id: 'another', fundingTxid: 'wrong' }])
    const check = await renderReady({}, <PaymentCheck />)
    fireEvent.click(screen.getByText('check'))
    await screen.findByText('Check asset payment: its funding is still unresolved')
    expect(localStorage.length).toBe(1)
    mocks.swaps.mockResolvedValue([{ ...swap, id: 'offer:original', fundingTxid: 'original-txid' }])
    fireEvent.click(screen.getByText('Check asset payment: its funding is still unresolved'))
    await screen.findByText('original-txid')
    expect(mocks.quote).toHaveBeenCalledOnce()
    expect(mocks.accept).toHaveBeenCalledOnce()
    expect(localStorage.length).toBe(0)
    check.unmount()
  })

  it('releases only the original proven-unsent payment after remount, allowing a new payment', async () => {
    mocks.quote.mockResolvedValue({ id: 'original', give: { amount: 1000n } })
    mocks.accept.mockRejectedValueOnce(new Error('reply lost'))
    const payer = await renderReady({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText('reply lost')
    payer.unmount()
    mocks.getSwapRecord.mockResolvedValue(unsentRecord())
    const check = await renderReady({}, <PaymentCheck />)
    fireEvent.click(screen.getByText('check'))
    await screen.findByText('The payment was not sent. Please try again.')
    expect(mocks.getSwapRecord).toHaveBeenCalledWith('original')
    expect(localStorage.length).toBe(0)
    expect(mocks.quote).toHaveBeenCalledOnce()
    expect(mocks.accept).toHaveBeenCalledOnce()
    check.unmount()
    mocks.quote.mockResolvedValue({ id: 'next', give: { amount: 1000n } })
    mocks.accept.mockResolvedValue({ ...swap, id: 'offer:next' })
    await renderReady({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledTimes(2))
    expect(mocks.quote).toHaveBeenCalledTimes(2)
    expect(localStorage.length).toBe(0)
  })

  it.each([
    ['missing record', undefined],
    ['wrong record', unsentRecord({ id: 'other' })],
    ['wrong family', unsentRecord({ family: 'rfq', state: 'failed' })],
    ['cancelled without proof', unsentRecord({ fundingNotSubmitted: undefined })],
    ['malformed proof', unsentRecord({ fundingNotSubmitted: { reason: 'send_deadline', validUntil: '100' } })],
    ['proof beyond expiry', unsentRecord({ fundingNotSubmitted: { reason: 'send_deadline', validUntil: 201 } })],
    ['already funded', unsentRecord({ fundingTxid: 'submitted' })],
    ['unresolved record', unsentRecord({ status: 'pending' })],
  ])('retains the journal for %s', async (_name, record) => {
    storeAssetPayment('test-sender-regtest', 'regtest', {
      quoteId: 'original',
      arkAddress: 'recipient',
      assetId: ASSET_ID,
      amount: '500',
      payAmountSats: '1000',
    })
    mocks.getSwapRecord.mockResolvedValue(record)
    await renderReady({}, <PaymentCheck />)
    fireEvent.click(screen.getByText('check'))
    await screen.findByText('Check asset payment: its funding is still unresolved')
    expect(localStorage.length).toBe(1)
    expect(mocks.accept).not.toHaveBeenCalled()
    expect(mocks.quote).not.toHaveBeenCalled()
  })

  it.each(['read', 'clear'])(
    'retains the journal when storage %s fails during proven-unsent recovery',
    async (stage) => {
      storeAssetPayment('test-sender-regtest', 'regtest', {
        quoteId: 'original',
        arkAddress: 'recipient',
        assetId: ASSET_ID,
        amount: '500',
        payAmountSats: '1000',
      })
      mocks.getSwapRecord.mockResolvedValue(unsentRecord())
      if (stage === 'read') mocks.getSwapRecord.mockRejectedValue(new Error('storage unavailable'))
      else
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
          throw new Error('storage unavailable')
        })
      await renderReady({}, <PaymentCheck />)
      fireEvent.click(screen.getByText('check'))
      await screen.findByText('storage unavailable')
      expect(localStorage.length).toBe(1)
      expect(mocks.accept).not.toHaveBeenCalled()
    },
  )

  it('clears only a real SDK insufficient-funds refusal before persistence', async () => {
    mocks.quote.mockResolvedValue({ id: 'unfundable', give: { asset: 'btc', amount: 1000n } })
    mocks.accept.mockRejectedValue(new InsufficientFunds('btc' as never, 1000n, 0n))
    await renderReady({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText(/funding needs/)
    expect(localStorage.length).toBe(0)
    expect(mocks.accept).toHaveBeenCalledOnce()
  })

  it('retains a named impostor refusal and blocks corruption before a new quote', async () => {
    mocks.quote.mockResolvedValue({ id: 'impostor', give: { amount: 1000n } })
    mocks.accept.mockRejectedValue(Object.assign(new Error('unknown acceptance'), { name: 'InsufficientFunds' }))
    const view = await renderReady({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText('unknown acceptance')
    expect(localStorage.length).toBe(1)
    const storageKey = localStorage.key(0)!
    localStorage.setItem(storageKey, '{}')
    view.unmount()
    await renderReady({}, <Payer />)
    fireEvent.click(screen.getByText('pay asset'))
    await screen.findByText('Stored asset payment is unreadable; refusing a new payment')
    expect(mocks.quote).toHaveBeenCalledOnce()
    expect(mocks.accept).toHaveBeenCalledOnce()
  })

  it('preserves canonical discovered currencies when requesting the executable quote', async () => {
    mocks.quote.mockResolvedValue({ id: 'canonical-quote', take: { amount: BigInt(1000) } })
    mocks.accept.mockResolvedValue({ ...swap, id: 'offer:canonical-quote' })
    await renderReady({}, <Harness canonical />)
    screen.getByText('fund').click()
    await waitFor(() =>
      expect(mocks.quote).toHaveBeenCalledWith({
        give: 'arkade:regtest/slip44:1',
        take: `arkade:regtest/asset:${ASSET_ID}`,
        amount: BigInt(1000),
        amountOn: 'give',
      }),
    )
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledOnce())
  })

  it('refuses a canonical market on another network before requesting or funding a quote', async () => {
    await renderReady({}, <Harness canonical network='bitcoin' />)
    screen.getByText('exchange').click()
    await waitFor(() => expect(screen.getByTestId('exchange-error')).toHaveTextContent('different network or rail'))
    expect(mocks.quote).not.toHaveBeenCalled()
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('stores the exchange snapshot under the quote id used by history', async () => {
    mocks.quote.mockResolvedValue({ id: 'market-quote', take: { amount: BigInt(1000) } })
    mocks.accept.mockResolvedValue({ ...swap, id: 'offer:market-quote' })
    await renderReady()
    screen.getByText('fund').click()
    await waitFor(() => expect(mocks.saveSnapshot).toHaveBeenCalledWith('market-quote', { fromTicker: 'BTC' }))
  })

  it('keeps the client live while its mounted wallet content navigates', async () => {
    function NavigatingScreens() {
      const [page, setPage] = useState('send success')
      return <button onClick={() => setPage('wallet')}>{page}</button>
    }
    const view = renderProvider({}, <NavigatingScreens />)
    await waitFor(() => expect(mocks.created).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByText('send success'))
    expect(screen.getByText('wallet')).toBeInTheDocument()
    expect(mocks.created).toHaveBeenCalledOnce()
    expect(mocks.dispose).not.toHaveBeenCalled()
    view.unmount()
    await waitFor(() => expect(mocks.dispose).toHaveBeenCalledOnce())
  })

  it('loads swaps and filters corridor markets from the offer list', async () => {
    mocks.offerSwaps.mockResolvedValue([swap])
    mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (markets: unknown[]) => void) => {
      onMarkets([market(), market({ quote_corridor: 'lightning' })])
      return () => {}
    })
    const setAssetSwaps = vi.fn()

    renderProvider({ setAssetSwaps })

    await waitFor(() => expect(screen.getByTestId('swap-count')).toHaveTextContent('1'))
    await waitFor(() => expect(screen.getByTestId('market-count')).toHaveTextContent('1'))
    expect(screen.getByTestId('available')).toHaveTextContent('true')
    expect(setAssetSwaps).toHaveBeenCalledWith([swap])
  })

  it('reads arkd metadata for a market asset the wallet has never held', async () => {
    const details = { assetId: ASSET_ID, metadata: { name: 'Tether', ticker: 'USDT' } }
    const getAssetDetails = vi.fn().mockResolvedValue(details)
    const setCacheEntry = vi.fn()
    mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (markets: unknown[]) => void) => {
      onMarkets([market({ quote_asset: { id: ASSET_ID, ticker: 'aaaaaaaa', decimals: 2 } })])
      return () => {}
    })

    renderProvider({ svcWallet: { identity: {}, assetManager: { getAssetDetails } }, setCacheEntry })

    await waitFor(() => expect(setCacheEntry).toHaveBeenCalledWith(ASSET_ID, details))
    expect(getAssetDetails).toHaveBeenCalledTimes(1)
  })

  it('hides a canonical corridor market that names the rail on the asset id', async () => {
    mocks.watchSwapMarkets.mockImplementation((_network: string, onMarkets: (markets: unknown[]) => void) => {
      onMarkets([
        market(),
        market({
          base_asset: { id: 'arkade:bitcoin/slip44:0', ticker: 'BTC', decimals: 8 },
          quote_asset: { id: 'bolt11:bitcoin/slip44:0', ticker: 'BTC', decimals: 8 },
        }),
      ])
      return () => {}
    })

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('market-count')).toHaveTextContent('1'))
  })

  it('watches the network’s markets while mounted and stops watching on unmount', () => {
    const stop = vi.fn()
    mocks.watchSwapMarkets.mockReturnValue(stop)
    const view = renderProvider()
    expect(mocks.watchSwapMarkets).toHaveBeenCalledWith('regtest', expect.any(Function))
    expect(stop).not.toHaveBeenCalled()
    view.unmount()
    expect(stop).toHaveBeenCalledOnce()
  })

  it('restarts the cache-bypassing watch when a pinned card changes', async () => {
    renderProvider()
    expect(mocks.discoverMarkets).not.toHaveBeenCalled()

    act(() => saveSolverCards([]))

    await waitFor(() => expect(mocks.watchSwapMarkets).toHaveBeenCalledTimes(2))
    expect(mocks.discoverMarkets).not.toHaveBeenCalled()
  })

  it('rebuilds the swap client when a pinned card changes, so it routes with the card', async () => {
    renderProvider()
    await waitFor(() => expect(mocks.created).toHaveBeenCalledOnce())

    act(() => saveSolverCards([]))

    await waitFor(() => expect(mocks.created).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mocks.dispose).toHaveBeenCalledOnce())
  })

  it('refuses by name a firm quote that a rebuilt client never prepared', async () => {
    mocks.quote.mockResolvedValue({ id: 'firm-1', expiresAt: 9999999999 } as Quote)
    renderProvider({}, <FirmQuoteProbe />)
    await waitFor(() => expect(mocks.created).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByText('firm quote'))
    await waitFor(() => expect(screen.getByText('accept firm')).toBeEnabled())

    act(() => saveSolverCards([]))
    await waitFor(() => expect(mocks.created).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByText('accept firm'))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('QuoteUnavailable'))
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('refuses a firm quote that lands after its client was rebuilt', async () => {
    let finish!: (quote: Quote) => void
    mocks.quote.mockReturnValue(new Promise<Quote>((resolve) => (finish = resolve)))
    renderProvider({}, <FirmQuoteProbe />)
    await waitFor(() => expect(mocks.created).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByText('firm quote'))
    await waitFor(() => expect(mocks.quote).toHaveBeenCalledOnce())

    act(() => saveSolverCards([]))
    await waitFor(() => expect(mocks.created).toHaveBeenCalledTimes(2))
    await act(async () => finish({ id: 'late', expiresAt: 9999999999 } as Quote))

    expect(screen.getByRole('status')).toHaveTextContent('QuoteUnavailable')
    expect(screen.getByText('accept firm')).toBeDisabled()
  })

  it('quotes destinations through the swap client', async () => {
    renderProvider()

    await waitFor(() => expect(mocks.quote).not.toHaveBeenCalled())
    screen.getByText('quote').click()

    await waitFor(() => expect(mocks.quote).toHaveBeenCalledWith({ to: 'bitcoin:address' }))
  })

  it('maps a Lightning receive into the UI-facing result', async () => {
    await renderReady()
    screen.getByText('receive').click()

    await waitFor(() => expect(mocks.receive).toHaveBeenCalledWith({ amount: BigInt(1000), via: 'lightning' }))
  })

  it('returns a firm quote below the estimate without funding it', async () => {
    mocks.discoverMarkets.mockResolvedValue([market()])
    mocks.quote.mockResolvedValue({ id: 'firm', take: { amount: BigInt(999) } })
    await renderReady()

    screen.getByText('exchange').click()

    await waitFor(() => expect(screen.getByTestId('exchange-take')).toHaveTextContent('999'))
    expect(screen.getByTestId('exchange-error')).toBeEmptyDOMElement()
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('quotes the pair as CAIP-19 ids', async () => {
    mocks.quote.mockResolvedValue({ take: { amount: BigInt(1000) } })
    await renderReady()

    screen.getByText('exchange').click()

    await waitFor(() =>
      expect(mocks.quote).toHaveBeenCalledWith({
        give: 'arkade:regtest/slip44:1',
        take: `arkade:regtest/asset:${ASSET_ID}`,
        amount: BigInt(1000),
        amountOn: 'give',
      }),
    )
  })

  it('reports the fill that beat the cancel as a completion', async () => {
    mocks.cancel.mockResolvedValue({ outcome: 'filled' })
    await renderReady()

    screen.getByText('cancel').click()

    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith('swap-1'))
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Swap completed before it could be cancelled')
    expect(mocks.toastSuccess).not.toHaveBeenCalledWith('Swap cancelled, funds returned')
  })
})
