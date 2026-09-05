import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BTC_ASSET_ID } from '@arkade-os/swap'
import AppAssets from '../../../screens/Apps/Assets/Index'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { AspContext } from '../../../providers/asp'
import { OrderBookContext } from '../../../providers/orderBook'
import { buildBook, pairKeyOf, type BookOrder } from '../../../lib/book'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'

const id = (n: string) => n.repeat(64).slice(0, 64)
const PEPE = id('a')
const DOGE = id('b')
const MOON = id('c')
const HELD1 = id('d')
const HELD2 = id('e')

const order = (o: Partial<BookOrder> & Pick<BookOrder, 'give' | 'want'>): BookOrder => ({
  id: `${o.give.assetId}-${o.want.amount}`,
  fundingTxid: 'tx',
  vout: 0,
  offerHex: '',
  swapPkScript: '',
  makerPkScript: 'someone-else',
  depositSats: BigInt(1000),
  createdAt: 0,
  ...o,
})

const ask = (assetId: string, units: bigint, sats: bigint) =>
  order({ give: { assetId, amount: units }, want: { assetId: BTC_ASSET_ID, amount: sats } })
const bid = (assetId: string, units: bigint, sats: bigint) =>
  order({ give: { assetId: BTC_ASSET_ID, amount: sats }, want: { assetId, amount: units } })

const orders = [
  ask(PEPE, BigInt(100), BigInt(25_000)), // 250 sats
  bid(PEPE, BigInt(100), BigInt(24_000)), // 240 sats -> 4% spread
  ask(PEPE, BigInt(50), BigInt(13_000)),
  ask(DOGE, BigInt(1), BigInt(1_234_567)), // big number
  bid(DOGE, BigInt(1), BigInt(1_200_000)),
  ask(MOON, BigInt(10), BigInt(70)), // asks only -> no bids
]

const meta = (name: string, ticker: string) => ({ metadata: { name, ticker, decimals: 0 } }) as any

const cache = new Map<string, any>([
  [PEPE, meta('Pepe Coin', 'PEPE')],
  [DOGE, meta('Doge Coin', 'DOGE')],
  [MOON, meta('Moon Token', 'MOON')],
  [HELD1, meta('Held One', 'HELD1')],
  [HELD2, meta('Held Two', 'HELD2')],
])

const renderScreen = (ready = true) =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue as any}>
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <AspContext.Provider value={mockAspContextValue as any}>
          <FlowContext.Provider value={mockFlowContextValue as any}>
            <WalletContext.Provider
              value={
                {
                  ...mockWalletContextValue,
                  svcWallet: { ...mockSvcWallet, assetManager: { getAssetDetails: () => Promise.resolve(null) } },
                  assetBalances: [
                    { assetId: HELD1, amount: BigInt(42) },
                    { assetId: HELD2, amount: BigInt(7) },
                  ],
                  assetMetadataCache: cache,
                } as any
              }
            >
              <OrderBookContext.Provider
                value={
                  {
                    orders,
                    pairs: [
                      { pairKey: pairKeyOf(PEPE, BTC_ASSET_ID), count: 3 },
                      { pairKey: pairKeyOf(DOGE, BTC_ASSET_ID), count: 2 },
                      { pairKey: pairKeyOf(MOON, BTC_ASSET_ID), count: 1 },
                    ],
                    bookFor: (k: string) => buildBook(orders, k, new Set()),
                    myOrders: [],
                    takeable: true,
                    ready,
                  } as any
                }
              >
                <AppAssets />
              </OrderBookContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>,
  )

describe('Arkade Mint index', () => {
  it('splits markets from held assets', async () => {
    renderScreen()
    expect(await screen.findByText('markets')).toBeInTheDocument()

    const cards = screen.getAllByTestId(/^market-card-/)
    expect(cards.map((c) => c.textContent)).toEqual([
      'PPEPE250sats4% spread',
      'DDOGE1,235,000sats2.8% spread',
      'MMOON7satsno bids',
    ])

    expect(screen.getByText('your assets')).toBeInTheDocument()
    expect(screen.getByTestId(`asset-row-HELD1-${HELD1}`)).toBeInTheDocument()
    expect(screen.getByTestId(`asset-row-HELD2-${HELD2}`)).toBeInTheDocument()
    // held assets never appear in the grid
    expect(screen.queryByTestId(`market-card-${HELD1}`)).not.toBeInTheDocument()
  })

  it('shows no markets section before the book is ready', async () => {
    renderScreen(false)
    expect(await screen.findByTestId(`asset-row-HELD1-${HELD1}`)).toBeInTheDocument()
    expect(screen.queryByText('markets')).not.toBeInTheDocument()
    expect(screen.queryByText('your assets')).not.toBeInTheDocument()
    expect(screen.queryAllByTestId(/^market-card-/)).toHaveLength(0)
  })
})
