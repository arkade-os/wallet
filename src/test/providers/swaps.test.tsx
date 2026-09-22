import { useContext } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Quote, Swap } from '@arkade-os/swap'
import { AspContext } from '../../providers/asp'
import { WalletContext } from '../../providers/wallet'
import { SwapsContext, SwapsProvider } from '../../providers/swaps'
import { mockAspContextValue, mockWalletContextValue } from '../screens/mocks'

const mocks = vi.hoisted(() => ({
  discoverMarkets: vi.fn(),
  offerSwaps: vi.fn(),
  quote: vi.fn(),
  receive: vi.fn(),
  accept: vi.fn(),
  cancel: vi.fn(),
  dispose: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('../../lib/swapMarkets', () => ({ discoverMarkets: mocks.discoverMarkets }))
vi.mock('../../lib/swapRepository', () => ({
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
    receive: mocks.receive,
    accept: mocks.accept,
    cancel: mocks.cancel,
    [Symbol.asyncDispose]: mocks.dispose,
  }),
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

const swap = {
  id: 'swap-1',
  outcome: 'funded',
  fundingTxid: 'funding-txid',
  artifact: { kind: 'invoice', bolt11: 'lnbc1invoice' },
  expiresAt: 123,
  give: { amount: BigInt(1010) },
} as unknown as Swap

const ASSET_ID = 'a'.repeat(68)

function Harness() {
  const { markets, swapAvailable, swaps, quotePay, receiveLightning, exchange, cancelSwap } = useContext(SwapsContext)
  return (
    <>
      <output data-testid='market-count'>{markets.length}</output>
      <output data-testid='available'>{String(swapAvailable)}</output>
      <output data-testid='swap-count'>{swaps.length}</output>
      <button onClick={() => void quotePay('bitcoin:address')}>quote</button>
      <button onClick={() => void receiveLightning(1000)}>receive</button>
      <button onClick={() => void cancelSwap('swap-1')}>cancel</button>
      <button
        onClick={() =>
          void exchange(
            market() as never,
            {
              deposit: { asset: { id: 'btc', decimals: 0 }, atomic: BigInt(1000) },
              receive: { asset: { id: ASSET_ID, decimals: 0 }, atomic: BigInt(1000) },
            } as never,
          ).catch((error: Error) => {
            const node = document.querySelector('[data-testid="exchange-error"]')
            if (node) node.textContent = error.message
          })
        }
      >
        exchange
      </button>
      <output data-testid='exchange-error' />
    </>
  )
}

const renderProvider = (wallet = {}) =>
  render(
    <AspContext.Provider value={mockAspContextValue}>
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
        <SwapsProvider>
          <Harness />
        </SwapsProvider>
      </WalletContext.Provider>
    </AspContext.Provider>,
  )

beforeEach(() => {
  Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true })
  mocks.discoverMarkets.mockResolvedValue([])
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
  it('loads swaps and filters corridor markets from the offer list', async () => {
    mocks.offerSwaps.mockResolvedValue([swap])
    mocks.discoverMarkets.mockResolvedValue([market(), market({ quote_corridor: 'lightning' })])
    const setAssetSwaps = vi.fn()

    renderProvider({ setAssetSwaps })

    await waitFor(() => expect(screen.getByTestId('swap-count')).toHaveTextContent('1'))
    await waitFor(() => expect(screen.getByTestId('market-count')).toHaveTextContent('1'))
    expect(screen.getByTestId('available')).toHaveTextContent('true')
    expect(setAssetSwaps).toHaveBeenCalledWith([swap])
  })

  it('hides a canonical corridor market that names the rail on the asset id', async () => {
    mocks.discoverMarkets.mockResolvedValue([
      market(),
      market({
        base_asset: { id: 'arkade:bitcoin/slip44:0', ticker: 'BTC', decimals: 8 },
        quote_asset: { id: 'bolt11:bitcoin/slip44:0', ticker: 'BTC', decimals: 8 },
      }),
    ])

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('market-count')).toHaveTextContent('1'))
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

  it('refuses to fund a re-quote worse than the price on screen', async () => {
    mocks.discoverMarkets.mockResolvedValue([market()])
    mocks.quote.mockResolvedValue({ take: { amount: BigInt(999) } })
    renderProvider()

    screen.getByText('exchange').click()

    await waitFor(() =>
      expect(screen.getByTestId('exchange-error')).toHaveTextContent(
        'The rate moved while you were confirming — go back and try again',
      ),
    )
    expect(mocks.accept).not.toHaveBeenCalled()
  })

  it('quotes the pair as CAIP-19 ids', async () => {
    mocks.quote.mockResolvedValue({ take: { amount: BigInt(1000) } })
    renderProvider()

    screen.getByText('exchange').click()

    await waitFor(() =>
      expect(mocks.quote).toHaveBeenCalledWith({
        give: 'arkade:regtest/slip44:0',
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
