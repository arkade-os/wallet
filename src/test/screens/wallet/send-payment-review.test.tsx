import { asset, makeHandle, type RouteQuote } from '@arkade-os/sdk'
import { solverId } from '@arkade-os/solver-discovery'
import { arkadeAsset, assetSwapIdOf, btcOn, type OpenRfqAuction, type OpenRfqOffer, type Quote } from '@arkade-os/swap'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ContextType } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveOpenOfferPolicy } from '../../../lib/openOfferPolicy'
import type { PaymentQuoteRequest } from '../../../lib/paymentQuotes'
import { readSolverRouting, saveSolverRouting } from '../../../lib/solverRouting'
import { Unit } from '../../../lib/types'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FeesContext } from '../../../providers/fees'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { NavigationContext } from '../../../providers/navigation'
import { SwapsContext } from '../../../providers/swaps'
import { WalletContext } from '../../../providers/wallet'
import SendDetails from '../../../screens/Wallet/Send/Details'
import fixtures from '../../fixtures.json'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'

const now = 1734606756
const network = 'bitcoin'
const { invoice, amountSats, paymentHash } = fixtures.lib.bolt11
const bitcoin = btcOn('arkade', network)
const lightning = btcOn('bolt11', network)
const address = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'
const reviewId = 'first-review'
const lightningRequest = { kind: 'lightning', invoice, amount: amountSats } as const
const sendInfo = { invoice, satoshis: amountSats, reviewId }
const provider = (solver: string, marker: string) => ({
  solver,
  source: `local:${solver}`,
  sourceType: 'local' as const,
  discovery_pubkey: marker.repeat(64),
})
const harbor = provider('Harbor', 'a')
const bay = provider('Bay', 'b')
const harborId = solverId(harbor, network)
const bayId = solverId(bay, network)
const direction = JSON.stringify([network, bitcoin, lightning])
const lightningQuote = (id: string, total: number, route = harbor): Quote => ({
  id,
  solver: route.solver,
  route: {
    give: { corridor: 'arkade', asset: bitcoin, instrument: { kind: 'wallet' } },
    take: {
      corridor: 'lightning',
      asset: lightning,
      instrument: { kind: 'invoice', bolt11: invoice, paymentHash, expiresAt: now + 600 },
    },
  },
  give: { asset: bitcoin, amount: BigInt(total) },
  take: { asset: lightning, amount: BigInt(amountSats) },
  expiresAt: now + 60,
  market: {
    kind: 'card',
    key: 'arkade:btc/lightning:btc',
    backend: 'rfq',
    source: route.source,
    sourceType: route.sourceType,
    solver: route.solver,
    discoveryPubkey: route.discovery_pubkey,
    pair: 'BTC/lightning:BTC',
    snapshot: { fetchedAt: now * 1000, live: true, source: 'injected' },
  },
  fee: { asset: bitcoin, amount: BigInt(total - amountSats) },
})
const quotePaymentRoute = vi.fn<(request: PaymentQuoteRequest, solverId?: string) => Promise<Quote>>()
const sendRouter = vi.fn()
const paymentRouteCandidates = vi.fn<() => Promise<{ id: string; name: string }[]>>()
const openPaymentQuotes = vi.fn<() => Promise<OpenRfqAuction>>()
const chooseSwapQuote = vi.fn<() => Promise<Quote>>()
const acceptPaymentQuote = vi.fn()
const cancelOpenSwapQuotes = vi.fn().mockResolvedValue(undefined)
const setSendInfo = vi.fn()
const context = {
  ...mockConfigContextValue,
  config: { ...mockConfigContextValue.config, unit: Unit.SATS },
  useFiat: false,
}
const review = (info: SendInfo = sendInfo) => (
  <NavigationContext.Provider value={mockNavigationContextValue}>
    <ConfigContext.Provider value={context}>
      <FiatContext.Provider value={mockFiatContextValue}>
        <AspContext.Provider value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network } }}>
          <FeesContext.Provider value={{ calcOnchainOutputFee: () => 500 } as never}>
            <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo: info, setSendInfo }}>
              <WalletContext.Provider
                value={{
                  ...mockWalletContextValue,
                  balance: 100_000,
                  availableBalance: 100_000,
                  svcWallet: mockSvcWallet as never,
                }}
              >
                <SwapsContext.Provider
                  value={
                    {
                      quotePaymentRoute,
                      paymentRouteCandidates,
                      openPaymentQuotes,
                      chooseSwapQuote,
                      acceptPaymentQuote,
                      cancelOpenSwapQuotes,
                      sendRouter,
                    } as unknown as ContextType<typeof SwapsContext>
                  }
                >
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <SendDetails />
                  </LimitsContext.Provider>
                </SwapsContext.Provider>
              </WalletContext.Provider>
            </FlowContext.Provider>
          </FeesContext.Provider>
        </AspContext.Provider>
      </FiatContext.Provider>
    </ConfigContext.Provider>
  </NavigationContext.Provider>
)

const button = (name: string) => screen.getByRole('button', { name })
const pay = () => button('Pay')

describe('reviewing a solver payment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now * 1000)
    quotePaymentRoute.mockReset()
    paymentRouteCandidates.mockResolvedValue([])
    sendRouter.mockResolvedValue({ options: async () => [] })
    acceptPaymentQuote.mockReset().mockImplementation(async (quote: Quote, request: PaymentQuoteRequest) => ({
      id: assetSwapIdOf(request.kind === 'asset' ? 'offer' : 'rfq', quote.id),
      fundingTxid: 'funding-txid',
      give: quote.give,
      fee: quote.fee,
    }))
  })
  afterEach(() => vi.useRealTimers())

  it('keeps Pay disabled when saved routing fails and asks before publishing an open offer request', async () => {
    quotePaymentRoute.mockRejectedValue(new Error('No saved route can quote'))
    openPaymentQuotes.mockResolvedValue({
      id: 'auction',
      input: { to: invoice },
      pair: direction,
      closedAt: now,
      bids: [],
    })
    render(review())

    expect(await screen.findByText('No provider could quote this payment.')).toBeVisible()
    expect(pay()).toBeDisabled()
    expect(screen.getByText('Searching shares your pair and amount publicly.')).toBeVisible()
    fireEvent.click(pay())
    expect(openPaymentQuotes).not.toHaveBeenCalled()
    expect(acceptPaymentQuote).not.toHaveBeenCalled()

    fireEvent.click(button('Find open offers'))
    expect(await screen.findByRole('region', { name: 'Open offers' })).toBeVisible()
    await waitFor(() =>
      expect(openPaymentQuotes).toHaveBeenCalledExactlyOnceWith(lightningRequest, expect.any(String), true),
    )
  })

  it('quotes the chosen saved provider, displays its total, and remembers it only after payment', async () => {
    const first = lightningQuote('harbor-quote', 2_110)
    const alternate = lightningQuote('bay-quote', 2_150, bay)
    quotePaymentRoute.mockResolvedValueOnce(first).mockResolvedValueOnce(alternate)
    paymentRouteCandidates.mockResolvedValue([
      { id: harborId, name: harbor.solver },
      { id: bayId, name: bay.solver },
    ])
    saveSolverRouting(network, direction, { mode: 'cost', priority: [harborId] })
    render(review())

    expect(await screen.findByTestId('Total')).toHaveTextContent('2,110')
    fireEvent.click(button('Change route'))
    const routes = await screen.findByRole('dialog', { name: 'Change route' })
    expect(within(routes).getByRole('button', { name: 'Find open offers' })).toBeVisible()
    expect(openPaymentQuotes).not.toHaveBeenCalled()
    fireEvent.click(within(routes).getByRole('button', { name: bay.solver }))

    await waitFor(() => expect(screen.getByTestId('Total')).toHaveTextContent('2,150'))
    expect(quotePaymentRoute).toHaveBeenLastCalledWith(lightningRequest, bayId)
    expect(acceptPaymentQuote).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Remember this next time' }))
    expect(readSolverRouting(network, direction).preferFirst).toBeUndefined()
    fireEvent.click(pay())

    await waitFor(() =>
      expect(acceptPaymentQuote).toHaveBeenCalledExactlyOnceWith(alternate, lightningRequest, reviewId),
    )
    expect(readSolverRouting(network, direction)).toMatchObject({
      mode: 'cost',
      priority: [harborId],
      preferFirst: bayId,
    })
    expect(openPaymentQuotes).not.toHaveBeenCalled()
  })

  it('verifies the terms of the open offer before allowing funding', async () => {
    const bid = {
      id: 'bay-bid',
      solverPubkey: bay.discovery_pubkey,
      solverName: bay.solver,
      fromAmount: 2_170n,
      toAmount: BigInt(amountSats),
      expiresAt: now + 60,
    } as OpenRfqOffer
    const costlier = lightningQuote('costlier-quote', 2_171, bay)
    const firm = lightningQuote('open-quote', 2_166, bay)
    quotePaymentRoute.mockRejectedValue(new Error('No saved route'))
    openPaymentQuotes.mockResolvedValue({
      id: 'auction',
      input: { to: invoice },
      pair: direction,
      closedAt: now,
      bids: [bid],
    })
    chooseSwapQuote.mockResolvedValueOnce(costlier).mockResolvedValueOnce(firm)
    render(review())

    fireEvent.click(await screen.findByRole('button', { name: 'Find open offers' }))
    const offers = await screen.findByRole('region', { name: 'Open offers' })
    const selectBid = await within(offers).findByRole('button', { name: 'Select Bay' })
    fireEvent.click(selectBid)
    expect(await screen.findByRole('alert')).toHaveTextContent('The solver changed this offer’s terms')
    expect(acceptPaymentQuote).not.toHaveBeenCalled()

    fireEvent.click(selectBid)
    expect(await screen.findByTestId('Total')).toHaveTextContent('2,166')
    expect(chooseSwapQuote).toHaveBeenLastCalledWith('auction', bid.id)
    expect(acceptPaymentQuote).not.toHaveBeenCalled()
    fireEvent.click(pay())

    await waitFor(() => expect(acceptPaymentQuote).toHaveBeenCalledExactlyOnceWith(firm, lightningRequest, reviewId))
    expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ openOffer: bid, txid: 'funding-txid' }))
  })

  it('rejects a late result from a previous request and accepts only an exact asset payment quote', async () => {
    saveOpenOfferPolicy(network, 'off')
    const assetId = '12'.repeat(32) + '0000'
    const address = fixtures.lib.address.ark[0].address
    const amount = 25n
    const token = arkadeAsset(network, asset.AssetId.fromString(assetId))
    const assetRequest = { address, amount, assetId }
    const exact: Quote = {
      ...lightningQuote('exact-asset-out', 2_200),
      route: {
        give: { corridor: 'arkade', asset: bitcoin, instrument: { kind: 'wallet' } },
        take: { corridor: 'arkade', asset: token, instrument: { kind: 'address', address } },
      },
      take: { asset: token, amount },
      assetPayment: { receiveAddress: address, validUntil: now + 60 },
    }
    const wrongAmount = { ...exact, take: { asset: token, amount: amount - 1n } }
    let resolveOldQuote!: (quote: Quote) => void
    const oldResult = new Promise<Quote>((resolve) => (resolveOldQuote = resolve))
    quotePaymentRoute.mockReturnValueOnce(oldResult).mockResolvedValueOnce(wrongAmount).mockResolvedValueOnce(exact)
    const view = render(review())

    view.rerender(review({ reviewId, arkAddress: address, assets: [{ assetId, amount }], assetPayment: assetRequest }))
    expect(await screen.findByText('No provider could quote this payment.')).toBeVisible()
    await act(async () => resolveOldQuote(lightningQuote('stale-lightning-quote', 2_110)))
    expect(button('Swap and pay')).toBeDisabled()
    expect(screen.queryByTestId('Total')).toBeNull()
    expect(acceptPaymentQuote).not.toHaveBeenCalled()

    fireEvent.click(button('Refresh quote'))
    expect(await screen.findByTestId('Total')).toHaveTextContent('2,200')
    fireEvent.click(button('Swap and pay'))
    await waitFor(() =>
      expect(acceptPaymentQuote).toHaveBeenCalledExactlyOnceWith(exact, { kind: 'asset', ...assetRequest }, reviewId),
    )
  })

  it('does not fund a quote whose deadline passes before the payment click', async () => {
    const first = lightningQuote('expired-quote', 2_105)
    quotePaymentRoute.mockResolvedValueOnce(first)
    render(review())

    expect(await screen.findByTestId('Total')).toHaveTextContent('2,105')
    vi.setSystemTime(first.expiresAt * 1000)
    fireEvent.click(pay())
    expect(acceptPaymentQuote).not.toHaveBeenCalled()
  })

  it('keeps route changes and retries disabled while funding is unresolved', async () => {
    quotePaymentRoute.mockResolvedValueOnce(lightningQuote('pending-funding', 2_105))
    acceptPaymentQuote.mockRejectedValueOnce(
      Object.assign(new Error('Wallet has no funding acknowledgement'), { name: 'PaymentSubmissionPending' }),
    )
    render(review())
    expect(await screen.findByTestId('Total')).toHaveTextContent('2,105')
    fireEvent.click(pay())

    expect(await screen.findByText(/wallet is still checking this payment/i)).toBeVisible()
    expect(button('View activity')).toBeEnabled()
    expect(pay()).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Change route' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Refresh quote' })).toBeNull()
    fireEvent.click(pay())
    expect(acceptPaymentQuote).toHaveBeenCalledTimes(1)
    expect(openPaymentQuotes).not.toHaveBeenCalled()
  })

  it('pays a fixed BIP21 amount through a prepared exit and keeps solver discovery out of the flow', async () => {
    const send = vi.fn(async () => makeHandle('onchain', async () => ({ railId: 'onchain', txid: 'exit-funding' })))
    let resolveQuote!: (quote: RouteQuote) => void
    const exit = vi.fn(() => new Promise<RouteQuote>((resolve) => (resolveQuote = resolve)))
    const solver = vi.fn()
    sendRouter.mockResolvedValue({
      options: async () => [
        { railId: 'onchain-swap', quote: solver },
        { railId: 'onchain', quote: exit },
      ],
    })
    render(review({ address, recipient: `bitcoin:${address}?amount=0.0001`, satoshis: 10_000, reviewId }))

    const loading = await screen.findByRole('button', { name: 'Getting quote' })
    expect(loading).toBeDisabled()
    fireEvent.click(loading)
    expect(acceptPaymentQuote).not.toHaveBeenCalled()
    expect(sendRouter).toHaveBeenCalledWith(expect.objectContaining({ exitOnly: true }))
    expect(solver).not.toHaveBeenCalled()
    expect(quotePaymentRoute).not.toHaveBeenCalled()
    await act(async () => resolveQuote({ railId: 'onchain', amount: 10_000, total: 10_770, fee: 770, send }))
    expect(screen.getByTestId('Total')).toHaveTextContent('10,770')
    expect(screen.getByRole('region', { name: 'Recipient gets' })).toHaveTextContent('10,000')
    expect(screen.queryByRole('button', { name: 'Change route' })).toBeNull()
    fireEvent.click(button('Tap to Sign'))
    await waitFor(() => expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ txid: 'exit-funding' })))
    expect(send).toHaveBeenCalledTimes(1)
    expect(acceptPaymentQuote).not.toHaveBeenCalled()
  })

  it('prepares a collaborative exit when the on-chain solver cannot quote', async () => {
    const send = vi.fn(async () =>
      makeHandle('onchain', async (emit) => {
        const result = { railId: 'onchain', txid: 'exit-funding' }
        emit({ status: 'settled', result })
        return result
      }),
    )
    const exit = vi.fn(async () => ({ railId: 'onchain', amount: 10_000, total: 10_500, fee: 500, send }))
    const solver = vi.fn(async () => {
      throw new Error('No saved on-chain route')
    })
    sendRouter.mockResolvedValue({
      options: async () => [
        { railId: 'onchain-swap', quote: solver },
        { railId: 'onchain', quote: exit },
      ],
    })
    render(review({ address, satoshis: 10_500, reviewId }))

    expect(await screen.findByText('Collaborative exit')).toBeVisible()
    expect(screen.getByTestId('Total')).toHaveTextContent('10,500')
    expect(send).not.toHaveBeenCalled()
    expect(solver).toHaveBeenCalledTimes(1)
    expect(openPaymentQuotes).not.toHaveBeenCalled()

    fireEvent.click(button('Tap to Sign'))
    await waitFor(() => expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ txid: 'exit-funding' })))
    expect(send).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledTimes(1)
    expect(acceptPaymentQuote).not.toHaveBeenCalled()
  })
})
