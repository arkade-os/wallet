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
const assetRequest = {
  kind: 'asset',
  address: fixtures.lib.address.ark[0].address,
  assetId: '12'.repeat(32) + '0000',
  amount: 2_550n,
  fromAssetId: 'btc',
} as const
const assetId = arkadeAsset(network, asset.AssetId.fromString(assetRequest.assetId))
const assetSendInfo: SendInfo = {
  reviewId,
  arkAddress: assetRequest.address,
  assets: [{ assetId: assetRequest.assetId, amount: assetRequest.amount }],
  assetPayment: assetRequest,
}
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
const assetQuote = (id: string, total = 2_200): Quote => ({
  ...lightningQuote(id, total, bay),
  route: {
    give: { corridor: 'arkade', asset: bitcoin, instrument: { kind: 'wallet' } },
    take: { corridor: 'arkade', asset: assetId, instrument: { kind: 'address', address: assetRequest.address } },
  },
  take: { asset: assetId, amount: assetRequest.amount },
  assetPayment: { receiveAddress: assetRequest.address, validUntil: now + 30 },
  fee: { asset: assetId, amount: 2n },
})
const assetBid = {
  id: 'asset-bid',
  solverPubkey: bay.discovery_pubkey,
  solverName: bay.solver,
  fromAmount: 2_250n,
  toAmount: assetRequest.amount,
  expiresAt: now + 60,
} as OpenRfqOffer
const assetAuction = {
  id: 'asset-auction',
  input: { give: bitcoin, take: assetId, amount: assetRequest.amount, amountOn: 'take' },
  pair: JSON.stringify([network, bitcoin, assetId]),
  closedAt: now,
  bids: [assetBid],
} satisfies OpenRfqAuction
const quotePaymentRoute = vi.fn<(request: PaymentQuoteRequest, solverId?: string) => Promise<Quote>>()
const sendRouter = vi.fn()
const paymentRouteCandidates = vi.fn<() => Promise<{ id: string; name: string }[]>>()
const onchainPaymentRouteCandidates = vi.fn().mockResolvedValue([])
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
                  assetMetadataCache: new Map([
                    [
                      assetRequest.assetId,
                      {
                        assetId: assetRequest.assetId,
                        supply: 50_000n,
                        metadata: { name: 'Gucci', ticker: 'GUCCI', decimals: 2 },
                        cachedAt: now * 1000,
                      },
                    ],
                  ]),
                }}
              >
                <SwapsContext.Provider
                  value={
                    {
                      quotePaymentRoute,
                      paymentRouteCandidates,
                      onchainPaymentRouteCandidates,
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
const noProvider = () =>
  Object.assign(new Error('unsupported route: no market serves this pair on the active discovery snapshot'), {
    name: 'UnsupportedRoute',
  })

describe('reviewing a solver payment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now * 1000)
    quotePaymentRoute.mockReset()
    openPaymentQuotes.mockReset()
    chooseSwapQuote.mockReset()
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

  it('quotes the new recipient when the previous draft still has an asset payment', async () => {
    quotePaymentRoute.mockResolvedValueOnce(lightningQuote('new-lightning-payment', 2_110))
    render(
      review({
        ...sendInfo,
        assetPayment: { address: fixtures.lib.address.ark[0].address, assetId: '12'.repeat(34), amount: 42n },
      }),
    )

    expect(await screen.findByTestId('Total')).toHaveTextContent('2,110')
    expect(quotePaymentRoute).toHaveBeenCalledExactlyOnceWith(lightningRequest, undefined)
    expect(pay()).toBeEnabled()
  })

  it('keeps Pay disabled when saved routing fails and asks before publishing an open offer request', async () => {
    saveOpenOfferPolicy(network, 'ask')
    quotePaymentRoute.mockRejectedValue(noProvider())
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
    expect(screen.queryByRole('checkbox', { name: 'Remember this next time' })).toBeNull()
    fireEvent.click(button('Change route'))
    const routes = await screen.findByRole('dialog', { name: 'Change route' })
    expect(within(routes).getByRole('button', { name: 'Find open offers' })).toBeVisible()
    expect(openPaymentQuotes).not.toHaveBeenCalled()
    fireEvent.click(within(routes).getByRole('checkbox', { name: 'Remember this next time' }))
    fireEvent.click(within(routes).getByRole('button', { name: bay.solver }))

    await waitFor(() => expect(screen.getByTestId('Total')).toHaveTextContent('2,150'))
    expect(quotePaymentRoute).toHaveBeenLastCalledWith(lightningRequest, bayId)
    expect(acceptPaymentQuote).not.toHaveBeenCalled()
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

  it('asks before searching for an exact asset payment and reviews only a binding quote to the recipient', async () => {
    quotePaymentRoute.mockRejectedValue(new Error('No saved route'))
    openPaymentQuotes.mockResolvedValue(assetAuction)
    const exact = assetQuote('exact-asset-out')
    chooseSwapQuote
      .mockResolvedValueOnce({ ...exact, take: { asset: assetId, amount: assetRequest.amount - 1n } })
      .mockResolvedValueOnce({ ...exact, assetPayment: { receiveAddress: 'wrong-recipient', validUntil: now + 30 } })
      .mockResolvedValueOnce(exact)
    render(review(assetSendInfo))

    expect(await screen.findByText('No provider could quote this payment.')).toBeVisible()
    expect(button('Swap and pay')).toBeDisabled()
    expect(openPaymentQuotes).not.toHaveBeenCalled()

    fireEvent.click(button('Find open offers'))
    const routes = await screen.findByRole('dialog', { name: 'Change route' })
    expect(within(routes).getByText('Recipient gets 25.5 GUCCI')).toBeVisible()
    expect(within(routes).getByText('Unverified')).toBeVisible()
    const selectBid = await within(routes).findByRole('button', { name: 'Select Bay' })
    expect(openPaymentQuotes).toHaveBeenCalledExactlyOnceWith(assetRequest, expect.any(String), true)

    fireEvent.click(selectBid)
    expect(await within(routes).findByRole('alert')).toHaveTextContent('The solver changed this offer’s terms')
    fireEvent.click(selectBid)
    expect(await within(routes).findByRole('alert')).toHaveTextContent('does not deliver the requested asset amount')
    expect(acceptPaymentQuote).not.toHaveBeenCalled()

    fireEvent.click(selectBid)
    expect(await screen.findByTestId('Total')).toHaveTextContent('2,200')
    expect(acceptPaymentQuote).not.toHaveBeenCalled()
    fireEvent.click(button('Swap and pay'))
    await waitFor(() => expect(acceptPaymentQuote).toHaveBeenCalledExactlyOnceWith(exact, assetRequest, reviewId))
    expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ openOffer: assetBid, txid: 'funding-txid' }))
  })

  it('searches automatically for an exact asset payment when providers are unavailable', async () => {
    let failQuote!: (error: Error) => void
    quotePaymentRoute.mockReturnValueOnce(new Promise<Quote>((_, reject) => (failQuote = reject)))
    let finishAuction!: (auction: OpenRfqAuction) => void
    openPaymentQuotes.mockReturnValueOnce(new Promise<OpenRfqAuction>((resolve) => (finishAuction = resolve)))
    chooseSwapQuote.mockResolvedValue(assetQuote('automatic-asset-quote'))
    render(review(assetSendInfo))

    expect(await screen.findByRole('button', { name: 'Getting quote' })).toBeDisabled()
    expect(openPaymentQuotes).not.toHaveBeenCalled()
    await act(async () => failQuote(noProvider()))
    const dialog = within(await screen.findByRole('dialog', { name: 'Change route' }))
    expect(dialog.getByRole('status')).toHaveTextContent('Waiting for solver offers')
    await waitFor(() =>
      expect(openPaymentQuotes).toHaveBeenCalledExactlyOnceWith(assetRequest, expect.any(String), false),
    )
    expect(screen.queryByText('No provider could quote this payment.')).toBeNull()
    expect(screen.queryByText('Refresh quote')).toBeNull()
    expect(screen.queryByText('Swap and pay')).toBeNull()
    await act(async () => finishAuction(assetAuction))
    expect(chooseSwapQuote).not.toHaveBeenCalled()
    fireEvent.click(await dialog.findByRole('button', { name: 'Select Bay' }))
    expect(await screen.findByTestId('Total')).toHaveTextContent('2,200')
    expect(openPaymentQuotes).toHaveBeenCalledTimes(1)
    expect(acceptPaymentQuote).not.toHaveBeenCalled()
  })

  it.each([
    ['QuoteExpired', 'quote expired'],
    ['QuoteVerificationFailed', 'invalid quote'],
    ['UnsupportedRoute', 'unsupported route: Arkade network changed'],
    ['Error', 'the swap client is not running'],
  ])('offers direct quote recovery when the error is %s', async (name, message) => {
    quotePaymentRoute.mockRejectedValue(Object.assign(new Error(message), { name }))
    render(review(assetSendInfo))

    expect(await screen.findByRole('button', { name: 'Refresh quote' })).toBeEnabled()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(openPaymentQuotes).not.toHaveBeenCalled()
    expect(acceptPaymentQuote).not.toHaveBeenCalled()
  })

  it('respects turning off open offers when no provider can quote', async () => {
    saveOpenOfferPolicy(network, 'off')
    quotePaymentRoute.mockRejectedValue(noProvider())
    render(review(assetSendInfo))

    expect(await screen.findByText('No provider could quote this payment.')).toBeVisible()
    expect(button('Refresh quote')).toBeEnabled()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Find open offers' })).toBeNull()
    expect(openPaymentQuotes).not.toHaveBeenCalled()
  })

  it.each(['the picker closes', 'the linked amount changes'])(
    'discards a binding asset offer that arrives after %s',
    async (change) => {
      quotePaymentRoute.mockRejectedValue(new Error('No saved route'))
      openPaymentQuotes.mockResolvedValue(assetAuction)
      let finishBid!: (quote: Quote) => void
      chooseSwapQuote.mockReturnValueOnce(new Promise<Quote>((resolve) => (finishBid = resolve)))
      const view = render(review(assetSendInfo))

      fireEvent.click(await screen.findByRole('button', { name: 'Find open offers' }))
      const dialog = within(await screen.findByRole('dialog', { name: 'Change route' }))
      fireEvent.click(await dialog.findByRole('button', { name: 'Select Bay' }))
      if (change === 'the picker closes') {
        fireEvent.click(dialog.getByRole('button', { name: 'Close' }))
      } else {
        const amount = assetRequest.amount + 1n
        view.rerender(
          review({
            ...assetSendInfo,
            assets: [{ assetId: assetRequest.assetId, amount }],
            assetPayment: { ...assetRequest, amount },
          }),
        )
      }
      await act(async () => finishBid(assetQuote('dismissed-quote')))

      expect(button('Swap and pay')).toBeDisabled()
      expect(screen.queryByTestId('Total')).toBeNull()
      expect(acceptPaymentQuote).not.toHaveBeenCalled()
      expect(openPaymentQuotes).toHaveBeenCalledTimes(1)
    },
  )

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
    expect(await screen.findByText('A provider returned a quote the wallet could not verify.')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Find open offers' })).toBeNull()
    expect(openPaymentQuotes).not.toHaveBeenCalled()
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

  it('requires a fresh Lightning invoice after a confirmed refund', async () => {
    quotePaymentRoute.mockResolvedValueOnce(lightningQuote('refunded-payment', 2_105))
    acceptPaymentQuote.mockRejectedValueOnce(
      Object.assign(new Error('Refunded'), { name: 'PaymentRequiresNewInvoice' }),
    )
    render(review())

    expect(await screen.findByTestId('Total')).toHaveTextContent('2,105')
    fireEvent.click(pay())
    expect(await screen.findByText('Refund confirmed. Use a new Lightning invoice to retry.')).toBeVisible()
    expect(pay()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Go back' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Refresh quote' })).toBeNull()
  })

  it('pays a fixed BIP21 amount through a prepared exit and keeps solver discovery out of the flow', async () => {
    const send = vi.fn(async () =>
      makeHandle('onchain', async (emit) => {
        const result = { railId: 'onchain', txid: 'exit-funding' }
        emit({ status: 'settled', result })
        return result
      }),
    )
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
    await waitFor(() => expect(exit).toHaveBeenCalledTimes(1))
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
