import { useContext, useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OpenRfqAuction, OpenRfqOffer, Quote, Swap } from '@arkade-os/swap'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { SwapsContext, SwapsProvider } from '../../providers/swaps'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'
import * as lnSwap from '../../lib/lnSwap'
import * as constants from '../../lib/constants'
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
  openRfq: vi.fn(),
  quoteBid: vi.fn(),
  receive: vi.fn(),
  accept: vi.fn(),
  cancel: vi.fn(),
  dispose: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('../../lib/swapMarkets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/swapMarkets')>()),
  discoverMarkets: mocks.discoverMarkets,
  watchSwapMarkets: mocks.watchSwapMarkets,
}))
vi.mock('../../lib/swapRepository', () => ({
  saveQuoteSnapshot: vi.fn(),
}))
vi.mock('../../lib/swapRecords', () => ({
  displayAssetOf: (assetId: string) => assetId,
  offerSwaps: mocks.offerSwaps,
}))
vi.mock('../../lib/swapClient', () => ({
  makeSwapClient: () => {
    mocks.created()
    return {
      ready: Promise.resolve(),
      onUpdate: () => () => {},
      quote: mocks.quote,
      openRfq: mocks.openRfq,
      quoteBid: mocks.quoteBid,
      receive: mocks.receive,
      accept: mocks.accept,
      cancel: mocks.cancel,
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

function Harness() {
  const {
    markets,
    discoveryReady,
    swapAvailable,
    swaps,
    runDiscovery,
    quotePay,
    receiveLightning,
    quoteExchange,
    cancelSwap,
  } = useContext(SwapsContext)
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
          void quoteExchange({
            deposit: { asset: { id: 'btc', decimals: 0 }, atomic: BigInt(1000) },
            receive: { asset: { id: ASSET_ID, decimals: 0 }, atomic: BigInt(1000) },
          } as never).then(
            (quote) => {
              const node = document.querySelector('[data-testid="exchange-take"]')
              if (node) node.textContent = String(quote.take.amount)
            },
            (error: Error) => {
              const node = document.querySelector('[data-testid="exchange-error"]')
              if (node) node.textContent = error.message
            },
          )
        }
      >
        exchange
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
          svcWallet: { identity: {} },
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

beforeEach(() => {
  localStorage.removeItem('solverRouting')
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
      pair: `arkade:regtest/slip44:1~arkade:regtest/asset:${ASSET_ID}`,
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

  it('quotes destinations through the swap client', async () => {
    renderProvider()

    await waitFor(() => expect(mocks.quote).not.toHaveBeenCalled())
    screen.getByText('quote').click()

    await waitFor(() => expect(mocks.quote).toHaveBeenCalledWith({ to: 'bitcoin:address' }))
  })

  it('maps a Lightning receive into the UI-facing result', async () => {
    renderProvider()
    screen.getByText('receive').click()

    await waitFor(() => expect(mocks.receive).toHaveBeenCalledWith({ amount: BigInt(1000), via: 'lightning' }))
  })

  it('returns a firm quote below the estimate without funding it', async () => {
    mocks.discoverMarkets.mockResolvedValue([market()])
    mocks.quote.mockResolvedValue({ id: 'firm', take: { amount: BigInt(999) } })
    renderProvider()

    screen.getByText('exchange').click()

    await waitFor(() => expect(screen.getByTestId('exchange-take')).toHaveTextContent('999'))
    expect(screen.getByTestId('exchange-error')).toBeEmptyDOMElement()
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('quotes the pair as CAIP-19 ids', async () => {
    mocks.quote.mockResolvedValue({ take: { amount: BigInt(1000) } })
    renderProvider()

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
    renderProvider()

    screen.getByText('cancel').click()

    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith('swap-1'))
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Swap completed before it could be cancelled')
    expect(mocks.toastSuccess).not.toHaveBeenCalledWith('Swap cancelled, funds returned')
  })
})
