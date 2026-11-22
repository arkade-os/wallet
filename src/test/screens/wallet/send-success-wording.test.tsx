import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SendSuccess from '../../../screens/Wallet/Send/Success'
import {
  ASSET_SWAP_PAYMENT_RAIL,
  LIGHTNING_RAIL,
  LNURL_ARKADE_RAIL,
  LNURL_LIGHTNING_RAIL,
  ONCHAIN_SWAP_RAIL,
  WALLET_EXIT_RAIL,
} from '../../../lib/sendRouter'
import type { OpenRfqOffer, Outcome } from '@arkade-os/swap'
import { readSolverCards, saveSolverCards } from '../../../lib/solverCards'
import { SwapsContext } from '../../../providers/swaps'
import { redirectToCallback } from '../../../lib/appIntent'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { NotificationsContext } from '../../../providers/notifications'
import { WalletContext } from '../../../providers/wallet'
import { LanguageContext, translate } from '../../../providers/language'
import { Language } from '../../../lib/types'
import { btcUsdt, USDT_ID } from '../../lib/swapFixtures'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../mocks'

vi.mock('../../../lib/appIntent', async (original) => ({
  ...(await original<typeof import('../../../lib/appIntent')>()),
  redirectToCallback: vi.fn(),
}))

const notifications = { notifyPaymentSent: vi.fn() }
const navigate = vi.fn()

const ONCHAIN = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

const renderSuccess = (
  sendInfo: SendInfo,
  flow = {},
  outcomeOf: (id: string) => Outcome | undefined = () => undefined,
  language = Language.English,
) => {
  const tree = () => (
    <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <NotificationsContext.Provider value={notifications as never}>
              <WalletContext.Provider value={mockWalletContextValue as never}>
                <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo, ...flow }}>
                  <SwapsContext.Provider value={{ outcomeOf } as never}>
                    <SendSuccess />
                  </SwapsContext.Provider>
                </FlowContext.Provider>
              </WalletContext.Provider>
            </NotificationsContext.Provider>
          </AspContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>
  )
  const localizedTree = () => (
    <LanguageContext.Provider value={{ language, t: (key, params) => translate(language, key, params) }}>
      {tree()}
    </LanguageContext.Provider>
  )
  const view = render(localizedTree())
  return { ...view, refresh: () => view.rerender(localizedTree()) }
}

/** Reached on the FUNDING now, so what it says has to be true at that instant. */
describe('what the send success screen claims', () => {
  it('says a Lightning send is on the way, never that it is sent', async () => {
    renderSuccess({ invoice: 'lnbc10u1p...', total: 10_000 })

    expect((await screen.findAllByText(/on the way/i)).length).toBeGreaterThan(0)
    expect(screen.queryByText(/sent successfully/i)).toBeNull()
  })

  it('says an on-chain send is on the way too — it is not paid until we claim', async () => {
    renderSuccess({ address: 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7', total: 10_000 })

    expect((await screen.findAllByText(/on the way/i)).length).toBeGreaterThan(0)
    expect(screen.queryByText(/sent successfully/i)).toBeNull()
  })

  it('asks only the on-chain sender to stay, because only that claim is ours', async () => {
    renderSuccess({ address: 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7', total: 10_000 })

    expect(await screen.findByText(/keep the wallet open/i)).toBeDefined()
  })

  it('asks the on-chain sender to stay in their own language', async () => {
    renderSuccess({ address: ONCHAIN, total: 10_000 }, {}, undefined, Language.Spanish)

    expect(await screen.findByText(/en camino — mantén la wallet abierta hasta que se complete/)).toBeDefined()
    expect(screen.queryByText(/keep the wallet open/i)).toBeNull()
  })

  it('does not ask a Lightning sender to stay — the solver claims, not us', async () => {
    renderSuccess({ invoice: 'lnbc10u1p...', total: 10_000 })

    expect(screen.queryByText(/keep the wallet open/i)).toBeNull()
  })

  it('still says sent for an Arkade send, which really is', async () => {
    renderSuccess({ arkAddress: 'ark1...', address: '', total: 10_000 })

    expect(await screen.findByText(/sent successfully/i)).toBeDefined()
  })

  it('says sent when the collaborative exit paid, not that it is on the way', async () => {
    renderSuccess({ address: ONCHAIN, total: 10_000, railId: WALLET_EXIT_RAIL })

    expect(await screen.findByText(/sent successfully/i)).toBeDefined()
    expect(screen.queryByText(/on the way/i)).toBeNull()
    expect(screen.queryByText(/keep the wallet open/i)).toBeNull()
  })

  it('still says on the way when the solver rail funded it', async () => {
    renderSuccess({ address: ONCHAIN, total: 10_000, railId: ONCHAIN_SWAP_RAIL })

    expect((await screen.findAllByText(/on the way/i)).length).toBeGreaterThan(0)
    expect(await screen.findByText(/keep the wallet open/i)).toBeDefined()
    expect(screen.queryByText(/sent successfully/i)).toBeNull()
  })

  it('says an LNURL send over Lightning is on the way, though the flow carries no invoice', async () => {
    renderSuccess({ lnUrl: 'alice@pay.example', total: 10_000, railId: LNURL_LIGHTNING_RAIL })

    expect((await screen.findAllByText(/on the way/i)).length).toBeGreaterThan(0)
    expect(screen.queryByText(/keep the wallet open/i)).toBeNull()
  })

  it('says sent for an LNURL send paid inside Arkade, even beside a unified QR address', async () => {
    renderSuccess({ lnUrl: 'alice@pay.example', address: ONCHAIN, total: 10_000, railId: LNURL_ARKADE_RAIL })

    expect(await screen.findByText(/sent successfully/i)).toBeDefined()
    expect(screen.queryByText(/on the way/i)).toBeNull()
  })
})

const appSend = {
  status: 'send' as const,
  request: `bitcoin:${ONCHAIN}`,
  callback: 'https://app.example/return',
  started: true,
}
const fundedSend: SendInfo & { swapId: string } = {
  address: ONCHAIN,
  railId: ONCHAIN_SWAP_RAIL,
  swapId: 'rfq:owned',
  txid: 'funding-txid',
  total: 10_000,
}

const committedAppSend = { ...appSend, committedOnchain: { swapId: 'rfq:owned', fundingTxid: 'funding-txid' } }

describe('onchain app handoff', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    [Language.English, 'An onchain payment is still on the way — keep the wallet open until it completes'],
    [Language.Spanish, 'Un pago onchain sigue en camino — mantén la wallet abierta hasta que se complete'],
  ])('localizes the pending warning after a later manual send (%s)', (language, warning) => {
    renderSuccess(
      { arkAddress: 'ark1manual', txid: 'manual-txid', total: 2000 },
      { appIntent: committedAppSend },
      () => 'funded',
      language as Language,
    )
    expect(screen.getByText(warning)).toBeInTheDocument()
  })

  it.each(['funded', 'needs_recovery', 'refunded'] as const)(
    'keeps a %s swap in the wallet without clearing its handoff',
    (outcome) => {
      const setAppIntent = vi.fn()
      renderSuccess(fundedSend, { appIntent: committedAppSend, setAppIntent }, () => outcome)
      expect(screen.getByText(/keep the wallet open/i)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button'))
      expect(redirectToCallback).not.toHaveBeenCalled()
      expect(setAppIntent).not.toHaveBeenCalled()
    },
  )

  it('does not let another claimed record unlock the funded swap', () => {
    const outcomeOf = vi.fn((id: string) => (id === 'rfq:other' ? ('claimed' as const) : undefined))
    renderSuccess(fundedSend, { appIntent: committedAppSend }, outcomeOf)
    fireEvent.click(screen.getByRole('button'))
    expect(outcomeOf).toHaveBeenCalledWith('rfq:owned')
    expect(redirectToCallback).not.toHaveBeenCalled()
  })

  it('keeps a funded send with no swap id open', () => {
    renderSuccess(
      { ...fundedSend, swapId: undefined } as SendInfo,
      { appIntent: { ...committedAppSend, committedOnchain: { fundingTxid: 'funding-txid' } } },
      () => 'claimed',
    )
    fireEvent.click(screen.getByRole('button'))
    expect(redirectToCallback).not.toHaveBeenCalled()
  })

  it('returns once with the funding txid after its exact record is claimed', () => {
    let outcome: Outcome = 'funded'
    const setAppIntent = vi.fn()
    const view = renderSuccess(fundedSend, { appIntent: committedAppSend, setAppIntent }, () => outcome)
    fireEvent.click(screen.getByRole('button'))
    expect(redirectToCallback).not.toHaveBeenCalled()
    outcome = 'claimed'
    view.refresh()
    expect(screen.queryByText(/keep the wallet open/i)).toBeNull()
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    expect(redirectToCallback).toHaveBeenCalledExactlyOnceWith(appSend.callback, {
      status: 'sent',
      txid: 'funding-txid',
    })
    expect(setAppIntent).toHaveBeenCalledOnce()
  })

  it('does not complete the external handoff with a later manual send after navigating home', () => {
    const sendInfo: SendInfo = { ...fundedSend }
    const view = renderSuccess(sendInfo, { appIntent: committedAppSend }, () => 'funded')
    fireEvent.click(screen.getByRole('button'))
    expect(redirectToCallback).not.toHaveBeenCalled()
    for (const field of Object.keys(sendInfo)) delete sendInfo[field as keyof typeof sendInfo]
    Object.assign(sendInfo, { arkAddress: 'ark1manual', txid: 'manual-txid', total: 2000 })
    view.refresh()
    expect(screen.getByText(/keep the wallet open/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(redirectToCallback).not.toHaveBeenCalled()
  })

  it('returns B funding txid after B claims even when the success screen now shows manual C', () => {
    renderSuccess(
      { arkAddress: 'ark1manual', txid: 'manual-txid', total: 2000 },
      { appIntent: committedAppSend },
      () => 'claimed',
    )
    fireEvent.click(screen.getByRole('button'))
    expect(redirectToCallback).toHaveBeenCalledWith(appSend.callback, { status: 'sent', txid: 'funding-txid' })
  })

  it('finishes inside the wallet when the app send has no callback', () => {
    const setAppIntent = vi.fn()
    renderSuccess(fundedSend, { appIntent: { ...committedAppSend, callback: undefined }, setAppIntent }, () => 'funded')
    fireEvent.click(screen.getByRole('button'))
    expect(setAppIntent).toHaveBeenCalledWith(undefined)
    expect(redirectToCallback).not.toHaveBeenCalled()
  })

  it.each([
    { arkAddress: 'ark1...', address: '' },
    { address: ONCHAIN, railId: WALLET_EXIT_RAIL },
    { invoice: 'lnbc10u1p...' },
  ])('returns an ordinary committed send without waiting for a swap claim', (destination) => {
    renderSuccess({ ...destination, total: 10_000, txid: 'direct-txid' }, { appIntent: appSend })
    fireEvent.click(screen.getByRole('button'))
    expect(redirectToCallback).toHaveBeenCalledWith(appSend.callback, { status: 'sent', txid: 'direct-txid' })
  })
})

describe('tracked payment receipts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  const signedOffer: OpenRfqOffer = {
    id: 'bid-id',
    solverPubkey: 'c0fd90d75bfb7830956244e3ba1ed331f2d69b699a686d016ce23977c1a4177c',
    solverName: 'Example provider',
    market: btcUsdt,
    signedCard: {
      version: 0,
      name: 'example-provider',
      discovery_pubkey: 'c0fd90d75bfb7830956244e3ba1ed331f2d69b699a686d016ce23977c1a4177c',
      markets: [
        {
          base_asset: { id: 'arkade:regtest/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
          quote_asset: { id: `arkade:regtest/asset:${USDT_ID}`, name: 'Test asset', ticker: 'TEST', decimals: 2 },
          fee_bps: 10,
          price_feed: 'https://example.com/price',
          price_feed_schema: { type: 'json', price_path: '/price' },
          price_decimals: 6,
          min_base_amount: '1000',
          max_base_amount: '1000000',
          min_quote_amount: '10',
          max_quote_amount: '1000000',
        },
      ],
      sig: 'bd324b2722c9c605be956076532e8a3c22ee792dacbe16053e2f10276de3af78ee72e44ae4ba0cd18e36bf3b34f89f49ff6c759742e6ba0a283aab5854037b57',
    },
    fromAmount: 10_000n,
    toAmount: 9900n,
    expiresAt: 1000,
  }

  it.each([
    [LIGHTNING_RAIL, 'paid'],
    [ONCHAIN_SWAP_RAIL, 'claimed'],
    [ASSET_SWAP_PAYMENT_RAIL, 'filled'],
  ] as const)('waits for %s delivery before notifying or returning to the external app', (railId, delivery) => {
    let outcome: Outcome = 'funded'
    const setAppIntent = vi.fn()
    const trackedIntent = {
      ...appSend,
      committedSwap: { swapId: fundedSend.swapId, railId, fundingTxid: fundedSend.txid },
    }
    const view = renderSuccess(
      { ...fundedSend, reviewId: 'review', railId },
      { appIntent: trackedIntent, setAppIntent },
      () => outcome,
    )

    expect(screen.getByRole('heading', { name: 'Payment processing' })).toBeInTheDocument()
    expect(notifications.notifyPaymentSent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(navigate).toHaveBeenCalledWith(Pages.Wallet)
    expect(redirectToCallback).not.toHaveBeenCalled()
    expect(setAppIntent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'View activity' }))
    expect(navigate).toHaveBeenCalledWith(Pages.Activity)

    outcome = delivery === 'paid' ? 'claimed' : 'paid'
    view.refresh()
    expect(screen.getByRole('heading', { name: 'Payment processing' })).toBeInTheDocument()
    expect(notifications.notifyPaymentSent).not.toHaveBeenCalled()

    outcome = delivery
    view.refresh()
    expect(screen.getByRole('heading', { name: 'Payment sent' })).toBeInTheDocument()
    expect(notifications.notifyPaymentSent).toHaveBeenCalledExactlyOnceWith(fundedSend.total)
    fireEvent.click(screen.getByRole('button', { name: 'Return to app.example' }))
    expect(redirectToCallback).toHaveBeenCalledExactlyOnceWith(appSend.callback, {
      status: 'sent',
      txid: fundedSend.txid,
    })
  })

  it('reports a refund without a sent notification, provider action, or app callback', () => {
    let outcome: Outcome = 'refunding'
    const setAppIntent = vi.fn()
    const view = renderSuccess(
      { ...fundedSend, reviewId: 'review', openOffer: signedOffer },
      { appIntent: appSend, setAppIntent },
      () => outcome,
    )
    expect(screen.getByRole('heading', { name: 'Refund in progress' })).toBeInTheDocument()
    outcome = 'refunded'
    view.refresh()
    expect(screen.getByRole('heading', { name: 'Payment refunded' })).toBeInTheDocument()
    expect(screen.queryByText(/keep the wallet open/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save provider' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(setAppIntent).toHaveBeenCalledWith(undefined)
    expect(redirectToCallback).not.toHaveBeenCalled()
    expect(notifications.notifyPaymentSent).not.toHaveBeenCalled()
  })

  it('retains an earlier onchain app payment after a different tracked send is delivered', () => {
    const setAppIntent = vi.fn()
    renderSuccess(
      { ...fundedSend, swapId: 'rfq:manual', reviewId: 'review', railId: LIGHTNING_RAIL },
      { appIntent: committedAppSend, setAppIntent },
      (swapId) => (swapId === 'rfq:manual' ? 'paid' : 'funded'),
    )
    expect(screen.getByRole('heading', { name: 'Payment sent' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(redirectToCallback).not.toHaveBeenCalled()
    expect(setAppIntent).not.toHaveBeenCalled()
  })

  it('saves the verified provider only after delivery, keyed by its network and signing key', () => {
    let outcome: Outcome = 'funded'
    const elsewhere = { network: 'signet' as const, label: 'Other network', card: signedOffer.signedCard }
    const unsigned = {
      network: 'regtest' as const,
      label: 'Unsigned',
      card: { ...signedOffer.signedCard, sig: undefined },
    }
    saveSolverCards([elsewhere, unsigned])
    const view = renderSuccess(
      { ...fundedSend, railId: ASSET_SWAP_PAYMENT_RAIL, openOffer: signedOffer },
      {},
      () => outcome,
    )
    expect(screen.queryByRole('button', { name: 'Save provider' })).not.toBeInTheDocument()
    outcome = 'filled'
    view.refresh()
    fireEvent.click(screen.getByRole('button', { name: 'Save provider' }))
    expect(screen.getByText('Provider saved')).toBeInTheDocument()
    expect(readSolverCards()).toEqual([
      elsewhere,
      { network: 'regtest', label: signedOffer.solverName, card: signedOffer.signedCard },
    ])
  })

  it('omits the save action when the signed card does not match the winning bidder', () => {
    renderSuccess({ ...fundedSend, openOffer: { ...signedOffer, solverPubkey: '1'.repeat(64) } }, {}, () => 'claimed')
    expect(screen.queryByRole('button', { name: 'Save provider' })).not.toBeInTheDocument()
    expect(readSolverCards()).toEqual([])
  })
})
