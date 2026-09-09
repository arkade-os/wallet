import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SendSuccess from '../../../screens/Wallet/Send/Success'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import { NavigationContext } from '../../../providers/navigation'
import { NotificationsContext } from '../../../providers/notifications'
import { WalletContext } from '../../../providers/wallet'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../mocks'

const notifications = { notifyPaymentSent: vi.fn() }

const renderSuccess = (sendInfo: SendInfo) =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <NotificationsContext.Provider value={notifications as never}>
              <WalletContext.Provider value={mockWalletContextValue as never}>
                <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo }}>
                  <SendSuccess />
                </FlowContext.Provider>
              </WalletContext.Provider>
            </NotificationsContext.Provider>
          </AspContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>,
  )

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

  it('does not ask a Lightning sender to stay — the solver claims, not us', async () => {
    renderSuccess({ invoice: 'lnbc10u1p...', total: 10_000 })

    expect(screen.queryByText(/keep the wallet open/i)).toBeNull()
  })

  it('still says sent for an Arkade send, which really is', async () => {
    renderSuccess({ arkAddress: 'ark1...', address: '', total: 10_000 })

    expect(await screen.findByText(/sent successfully/i)).toBeDefined()
  })
})
