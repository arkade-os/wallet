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
import { ToastProvider } from '../../../components/Toast'
import ReceiveQRCode from '../../../screens/Wallet/Receive/QrCode'
import { saveRegisteredLnurlAddress } from '../../../lib/lnurlRegister'
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
 * Lightning on this screen is the registered lnurl address, not an invoice the
 * wallet negotiated. Two things follow and are covered here: the LNURL rides in
 * the BIP21 `lightning=` field so one QR still serves every rail, and a wallet
 * with no registered address says so plainly rather than looking broken — the
 * ark and on-chain addresses are unaffected either way.
 */
vi.mock('qr', () => ({ default: () => Array.from({ length: 21 }, () => new Uint8Array(21).fill(1)) }))

beforeAll(() => {
  if (!navigator.serviceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { addEventListener: vi.fn(), removeEventListener: vi.fn(), ready: Promise.resolve({}) },
      writable: true,
    })
  }
})

const LNURL = 'LNURL1DP68GURN8GHJ7EXAMPLE'

const tree = (
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
                      satoshis: 0,
                      offchainAddr: 'ark1testaddr',
                      boardingAddr: 'bc1testaddr',
                    },
                  } as never
                }
              >
                <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: mockSvcWallet } as never}>
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <ReceiveQRCode />
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

beforeEach(() => localStorage.clear())

describe('Receive screen, lnurl lightning', () => {
  it('says Lightning is unavailable with no registered address', async () => {
    render(tree)
    await waitFor(() => expect(screen.getByText(/No lightning address registered/i)).toBeTruthy())
  })

  it('offers no such message once an address is registered', async () => {
    saveRegisteredLnurlAddress({
      username: 'alice',
      domain: 'example.com',
      lightningAddress: 'alice@example.com',
      lnurl: LNURL,
    })

    render(tree)

    // The screen holds a loading state until its payment methods are built, so
    // waiting it out makes the absent warning a real absence rather than an
    // assertion against a screen that had not rendered yet.
    await waitFor(() => expect(screen.queryByText(/Loading/i)).toBeNull())
    expect(screen.queryByText(/No lightning address registered/i)).toBeNull()
  })
})
