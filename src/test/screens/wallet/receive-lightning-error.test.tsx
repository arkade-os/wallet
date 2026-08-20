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
import { LnReceiveContext } from '../../../providers/lnReceive'
import { ToastProvider } from '../../../components/Toast'
import ReceiveQRCode from '../../../screens/Wallet/Receive/QrCode'
import { LockupRegistrationFailed } from '@arkade-os/swap'
import { LnReceiveHeldElsewhere } from '../../../lib/lnReceive'
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
 * out-of-bounds amount. It is FALSE when another tab holds the receive
 * manager's lock: nothing is unavailable, the swaps are being driven perfectly
 * well, just not here — and the fix is closing that tab, which the copy has to
 * say or the user has nothing to act on.
 */
vi.mock('qr', () => ({ default: () => Array.from({ length: 21 }, () => new Uint8Array(21).fill(1)) }))

// The negotiation itself is covered in `lib/lnReceive.test.ts`. Here it only has
// to reach `track`, which is the call under test.
vi.mock('../../../lib/swapMarkets', () => ({ discoverMarkets: async () => [] }))
vi.mock('../../../lib/lnSwap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/lnSwap')>()),
  lnReceiveRendezvous: () => ({ minSats: 1, maxSats: 1_000_000 }),
}))
vi.mock('../../../lib/nostrRfq', () => ({
  withRfqTransport: async (_r: unknown, run: (t: unknown) => Promise<unknown>) => run({}),
}))
vi.mock('../../../lib/lnReceive', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/lnReceive')>()),
  requestLnReceive: async () => ({ rfqId: 'rfq-1', invoice: 'lnbc1', payAmount: 10_500 }),
}))

beforeAll(() => {
  if (!navigator.serviceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { addEventListener: vi.fn(), removeEventListener: vi.fn(), ready: Promise.resolve({}) },
      writable: true,
    })
  }
})

const track = vi.fn()

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
                    <LnReceiveContext.Provider value={{ track, status: () => undefined, error: () => undefined }}>
                      <ReceiveQRCode />
                    </LnReceiveContext.Provider>
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

beforeEach(() => track.mockReset())

describe('Receive screen, Lightning failures', () => {
  it('names the other tab when the receive manager is held elsewhere', async () => {
    track.mockRejectedValue(new LnReceiveHeldElsewhere())
    renderWithTrack()

    // The one thing that resolves it, said out loud. A retry button would be
    // worse than useless here — it cannot take the lock.
    expect(await screen.findByText(/Another tab is handling Lightning receives/)).toBeInTheDocument()
    expect(screen.queryByText(/Lightning unavailable/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('clears the message when the amount goes away, rather than stranding a dead retry', async () => {
    track.mockRejectedValue(new LockupRegistrationFailed({} as never, 'tark1qlockup', new Error('store refused')))
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

  it('clears the other-tab message when the amount goes away', async () => {
    track.mockRejectedValue(new LnReceiveHeldElsewhere())
    const { rerender } = renderWithTrack()
    expect(await screen.findByText(/Another tab is handling Lightning receives/)).toBeInTheDocument()

    // Same dead zone, no button to make it obvious — just copy about a lock
    // this screen is no longer trying to take.
    rerender(tree(0))
    await waitFor(() => expect(screen.queryByText(/Another tab/)).not.toBeInTheDocument())
  })

  it('still says unavailable for every other failure', async () => {
    track.mockRejectedValue(new Error('No Lightning solver available'))
    renderWithTrack()

    // The pre-existing branch, asserted so the new one cannot swallow it.
    expect(await screen.findByText(/Lightning unavailable: No Lightning solver available/)).toBeInTheDocument()
    expect(screen.queryByText(/Another tab/)).not.toBeInTheDocument()
  })
})
