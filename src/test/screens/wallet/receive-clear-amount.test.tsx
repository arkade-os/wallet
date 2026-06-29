import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import {
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockSwapsContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { SwapsContext } from '../../../providers/swaps'
import { NotificationsContext } from '../../../providers/notifications'
import { ToastProvider } from '../../../components/Toast'
import { LnurlContext } from '../../../providers/lnurl'
import ReceiveQRCode from '../../../screens/Wallet/Receive/QrCode'

// Mock qr module used by the QrCode component
vi.mock('qr', () => ({
  default: () => Array.from({ length: 21 }, () => new Uint8Array(21).fill(1)),
}))

// Force the mobile (touch) code path. On mobile, tapping the amount button opens
// the on-screen Keyboard instead of the desktop sheet — this is the path where a
// set amount previously could not be removed (the "Clear amount" button only
// existed in the desktop sheet).
vi.mock('../../../lib/browser', () => ({
  isMobileBrowser: true,
  isIOS: () => false,
  isAndroid: () => false,
  isInAppBrowser: () => false,
}))

// Silence haptics in jsdom
vi.mock('../../../lib/haptics', () => ({
  hapticSubtle: vi.fn(),
  hapticTap: vi.fn(),
  hapticLight: vi.fn(),
  setHapticsEnabled: vi.fn(),
}))

if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => 'blob:mock'
}

// Mock navigator.serviceWorker for jsdom
beforeAll(() => {
  if (!navigator.serviceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        ready: Promise.resolve({}),
      },
      writable: true,
    })
  }
})

const mockNotificationsContextValue = {
  notifyPaymentReceived: () => {},
  notifyPaymentSent: () => {},
  requestPermission: () => Promise.resolve(),
}

// Render the receive screen with a non-zero amount already requested, so the
// amount button reads "Edit amount" and the keyboard is the edit entry point.
function renderReceiveWithAmount(setRecvInfo: (info: unknown) => void) {
  const flow = {
    ...mockFlowContextValue,
    recvInfo: {
      ...mockFlowContextValue.recvInfo,
      satoshis: 50_000,
      offchainAddr: 'ark1testaddr',
      boardingAddr: 'bc1testaddr',
    },
    setRecvInfo,
  }
  const wallet = { ...mockWalletContextValue, svcWallet: mockSvcWallet as any }
  const swaps = { ...mockSwapsContextValue, connected: false, arkadeSwaps: null }
  const lnurl = { lnurl: '', active: false, error: undefined }

  return render(
    <ToastProvider>
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <FiatContext.Provider value={mockFiatContextValue as any}>
            <NotificationsContext.Provider value={mockNotificationsContextValue as any}>
              <SwapsContext.Provider value={swaps as any}>
                <FlowContext.Provider value={flow as any}>
                  <WalletContext.Provider value={wallet as any}>
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <LnurlContext.Provider value={lnurl}>
                        <ReceiveQRCode />
                      </LnurlContext.Provider>
                    </LimitsContext.Provider>
                  </WalletContext.Provider>
                </FlowContext.Provider>
              </SwapsContext.Provider>
            </NotificationsContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>
    </ToastProvider>,
  )
}

describe('Receive amount — clearing on the mobile keyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets the user clear a set amount from the keyboard', async () => {
    const setRecvInfo = vi.fn()
    renderReceiveWithAmount(setRecvInfo)

    // With an amount set, the amount button reads "Edit amount". Tapping it opens
    // the on-screen keyboard on mobile.
    const editButton = await screen.findByRole('button', { name: 'Edit amount' })
    await act(async () => {
      fireEvent.click(editButton)
    })

    // The keyboard must offer a way to remove the amount.
    const clearButton = await screen.findByRole('button', { name: 'Clear amount' })
    await act(async () => {
      fireEvent.click(clearButton)
    })

    // Clearing resets the requested amount back to zero.
    expect(setRecvInfo).toHaveBeenCalledWith(expect.objectContaining({ satoshis: 0 }))
  })
})
