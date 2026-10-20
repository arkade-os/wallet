import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SendSuccess from '../../../screens/Wallet/Send/Success'
import { ONCHAIN_SWAP_RAIL, WALLET_EXIT_RAIL } from '../../../lib/sendRouter'
import type { Outcome } from '@arkade-os/swap'
import { SwapsContext } from '../../../providers/swaps'
import { redirectToCallback } from '../../../lib/appIntent'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import { NavigationContext } from '../../../providers/navigation'
import { NotificationsContext } from '../../../providers/notifications'
import { WalletContext } from '../../../providers/wallet'
import { LanguageContext, translate } from '../../../providers/language'
import { Language } from '../../../lib/types'
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

const ONCHAIN = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

const renderSuccess = (
  sendInfo: SendInfo,
  flow = {},
  outcomeOf: (id: string) => Outcome | undefined = () => undefined,
  language = Language.English,
) => {
  const tree = () => (
    <NavigationContext.Provider value={mockNavigationContextValue}>
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
