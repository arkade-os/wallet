import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { NotificationsContext } from '../../../providers/notifications'
import { SwapsContext } from '../../../providers/swaps'
import { ToastProvider } from '../../../components/Toast'
import ReceiveQRCode from '../../../screens/Wallet/Receive/QrCode'
import { LockupRegistrationFailed } from '@arkade-os/swap'
import { SwapsHeldElsewhere } from '../../../lib/swapClient'
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

/**
 * Two ways the Lightning half of this screen can fail, and they must not read
 * the same. "Lightning unavailable" is true of a missing solver or an
 * out-of-bounds amount. It is FALSE when another tab holds the swap client's
 * lock: nothing is unavailable, the swaps are being driven perfectly well, just
 * not here — and the fix is closing that tab, which the copy has to say or the
 * user has nothing to act on.
 */
vi.mock('qr', () => ({ default: () => Array.from({ length: 21 }, () => new Uint8Array(21).fill(1)) }))

// The negotiation is the provider's; here the screen only has to reach
// `receiveLightning`, which is the call under test.
vi.mock('../../../lib/swapMarkets', () => ({ discoverMarkets: async () => [] }))

beforeAll(() => {
  if (!navigator.serviceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { addEventListener: vi.fn(), removeEventListener: vi.fn(), ready: Promise.resolve({}) },
      writable: true,
    })
  }
})

const receiveLightning = vi.fn()

const tree = (satoshis: number) => (
  <ToastProvider>
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={mockAspContextValue as never}>
        <ConfigContext.Provider value={mockConfigContextValue as never}>
          <FiatContext.Provider value={mockFiatContextValue as never}>
            <NotificationsContext.Provider
              value={
                {
                  notifyPaymentReceived: () => {},
                  notifyPaymentSent: () => {},
                  requestPermission: async () => {},
                } as never
              }
            >
              <FlowContext.Provider
                value={
                  {
                    ...mockFlowContextValue,
                    recvInfo: {
                      ...mockFlowContextValue.recvInfo,
                      satoshis,
                      offchainAddr: 'ark1testaddr',
                      boardingAddr: 'bc1testaddr',
                    },
                  } as never
                }
              >
                <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: mockSvcWallet } as never}>
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <SwapsContext.Provider
                      value={{ receiveLightning, lnStatus: () => undefined, lnError: () => undefined } as never}
                    >
                      <ReceiveQRCode />
                    </SwapsContext.Provider>
                  </LimitsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </NotificationsContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>
  </ToastProvider>
)

const renderWithTrack = (satoshis = 10_000) => render(tree(satoshis))

beforeEach(() => receiveLightning.mockReset())

describe('Receive screen, Lightning failures', () => {
  it('offers a retry, not a chore, when no tab is driving', async () => {
    receiveLightning.mockRejectedValue(new SwapsHeldElsewhere())
    renderWithTrack()

    // This used to name the other tab and tell the user to close it. It no
    // longer can: another tab holding the client is not a failure at all —
    // the receive is negotiated ON that tab and comes back here. What is left
    // is nobody driving, which is temporary and worth a retry, and says nothing
    // about tabs because the user has nothing to do with tabs.
    expect(await screen.findByText(/Lightning receive is temporarily unavailable/)).toBeInTheDocument()
    expect(screen.queryByText(/Lightning unavailable/)).not.toBeInTheDocument()
    expect(screen.queryByText(/tab/i)).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('retries a receive by name when the failure crossed from another tab', async () => {
    // `LockupRegistrationFailed` raised on the driving tab reaches this one
    // rebuilt from its name and message: the class cannot cross a structured
    // clone, so an `instanceof` check here would silently stop offering the
    // retry the moment the negotiation moved to another tab.
    const crossed = new Error('store refused')
    crossed.name = 'LockupRegistrationFailed'
    receiveLightning.mockRejectedValue(crossed)
    renderWithTrack()

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('clears the message when the amount goes away, rather than stranding a dead retry', async () => {
    receiveLightning.mockRejectedValue(
      new LockupRegistrationFailed({} as never, 'tark1qlockup', new Error('store refused')),
    )
    const { rerender } = renderWithTrack()
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()

    // Zero sends the negotiation effect straight into its own guard. A message
    // left up here describes a negotiation that is no longer happening, and the
    // retry it offers is a no-op: the click reruns the effect back into that
    // same guard, so the button can never clear what it is offering to fix.
    rerender(tree(0))
    await waitFor(() => expect(screen.queryByText(/Lightning unavailable/)).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('clears the no-driver message when the amount goes away', async () => {
    receiveLightning.mockRejectedValue(new SwapsHeldElsewhere())
    const { rerender } = renderWithTrack()
    expect(await screen.findByText(/Lightning receive is temporarily unavailable/)).toBeInTheDocument()

    // Same dead zone: a message about a negotiation this screen is no longer
    // attempting, offering a retry that reruns the effect back into its guard.
    rerender(tree(0))
    await waitFor(() => expect(screen.queryByText(/temporarily unavailable/)).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('still says unavailable for every other failure', async () => {
    receiveLightning.mockRejectedValue(new Error('No Lightning solver available'))
    renderWithTrack()

    // The pre-existing branch, asserted so the new one cannot swallow it.
    expect(await screen.findByText(/Lightning unavailable: No Lightning solver available/)).toBeInTheDocument()
    expect(screen.queryByText(/temporarily unavailable/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})
