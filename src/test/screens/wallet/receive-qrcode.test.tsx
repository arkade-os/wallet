import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockSwapsContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { SwapsContext } from '../../../providers/swaps'
import { NotificationsContext } from '../../../providers/notifications'
import ReceiveQRCode from '../../../screens/Wallet/Receive/QrCode'

// Mock qr module used by QrCode component
vi.mock('qr', () => ({
  default: () => new Uint8Array([0]),
}))

// Mock URL.createObjectURL
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

function renderReceiveQrCode(overrides?: {
  swaps?: Partial<typeof mockSwapsContextValue>
  flow?: Partial<typeof mockFlowContextValue>
  wallet?: Partial<typeof mockWalletContextValue>
  config?: Partial<typeof mockConfigContextValue>
}) {
  const swaps = { ...mockSwapsContextValue, ...overrides?.swaps }
  const flow = { ...mockFlowContextValue, ...overrides?.flow }
  const wallet = { ...mockWalletContextValue, ...overrides?.wallet }
  const config = { ...mockConfigContextValue, ...overrides?.config }

  return render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={mockAspContextValue}>
        <ConfigContext.Provider value={config as any}>
          <FiatContext.Provider value={mockFiatContextValue as any}>
            <NotificationsContext.Provider value={mockNotificationsContextValue as any}>
              <SwapsContext.Provider value={swaps as any}>
                <FlowContext.Provider value={flow as any}>
                  <WalletContext.Provider value={wallet as any}>
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <ReceiveQRCode />
                    </LimitsContext.Provider>
                  </WalletContext.Provider>
                </FlowContext.Provider>
              </SwapsContext.Provider>
            </NotificationsContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )
}

describe('Receive QR Code screen', () => {
  // UX Constraint 1: When LN is not expected (disconnected), show QR immediately
  // No waiting, no warning
  it('shows QR immediately when Boltz is disconnected (LN not expected)', async () => {
    renderReceiveQrCode({
      swaps: { connected: false, arkadeSwaps: null },
      flow: {
        recvInfo: {
          ...mockFlowContextValue.recvInfo,
          satoshis: 50000,
          offchainAddr: 'ark1testaddr',
          boardingAddr: 'bc1testaddr',
        },
      },
      wallet: { svcWallet: mockSvcWallet as any },
    })

    // Should show QR immediately, not the loader
    expect(screen.queryByText('Generating QR code...')).not.toBeInTheDocument()
    // Should NOT show the LN unavailable warning (constraint 1a)
    expect(
      screen.queryByText('Lightning is temporarily unavailable. This QR code only supports Ark and on-chain payments.'),
    ).not.toBeInTheDocument()
  })

  // UX Constraint 2c: When LN init already failed, don't wait — show QR + warning immediately
  it('shows QR immediately with warning when swapsInitError is set (no 5s wait)', async () => {
    renderReceiveQrCode({
      swaps: {
        connected: true,
        arkadeSwaps: null,
        swapsInitError: 'SwapManager not supported',
      },
      flow: {
        recvInfo: {
          ...mockFlowContextValue.recvInfo,
          satoshis: 50000,
          offchainAddr: 'ark1testaddr',
          boardingAddr: 'bc1testaddr',
        },
      },
      wallet: { svcWallet: mockSvcWallet as any },
    })

    // Should show QR immediately (not loader), because error is already known
    expect(screen.queryByText('Generating QR code...')).not.toBeInTheDocument()
    // Should show the warning (constraint 2a)
    expect(
      screen.getByText('Lightning is temporarily unavailable. This QR code only supports Ark and on-chain payments.'),
    ).toBeInTheDocument()
  })

  // UX Constraint 2b: When LN expected but still initializing, show loader (waiting up to 5s)
  it('shows loader while waiting for arkadeSwaps to initialize', () => {
    renderReceiveQrCode({
      swaps: {
        connected: true,
        arkadeSwaps: null,
        swapsInitError: null,
      },
      flow: {
        recvInfo: {
          ...mockFlowContextValue.recvInfo,
          satoshis: 50000,
          offchainAddr: 'ark1testaddr',
          boardingAddr: 'bc1testaddr',
        },
      },
      wallet: { svcWallet: mockSvcWallet as any },
    })

    // Should show the loader while waiting for swaps to initialize
    expect(screen.getByText('Generating QR code...')).toBeInTheDocument()
  })

  // UX Constraint 2b: After timeout, show QR with warning
  it('shows QR with warning after 5s timeout when arkadeSwaps never initializes', async () => {
    vi.useFakeTimers()

    renderReceiveQrCode({
      swaps: {
        connected: true,
        arkadeSwaps: null,
        swapsInitError: null,
      },
      flow: {
        recvInfo: {
          ...mockFlowContextValue.recvInfo,
          satoshis: 50000,
          offchainAddr: 'ark1testaddr',
          boardingAddr: 'bc1testaddr',
        },
      },
      wallet: { svcWallet: mockSvcWallet as any },
    })

    // Initially should show loader
    expect(screen.getByText('Generating QR code...')).toBeInTheDocument()

    // Advance past the 5s timeout
    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })

    // Now should show QR, not the loader
    expect(screen.queryByText('Generating QR code...')).not.toBeInTheDocument()
    // Should show the warning
    expect(
      screen.getByText('Lightning is temporarily unavailable. This QR code only supports Ark and on-chain payments.'),
    ).toBeInTheDocument()

    vi.useRealTimers()
  })

  // No amount → show QR immediately (no swaps needed)
  it('shows QR immediately when no amount is set', () => {
    renderReceiveQrCode({
      swaps: { connected: true, arkadeSwaps: null },
      flow: {
        recvInfo: {
          ...mockFlowContextValue.recvInfo,
          satoshis: 0,
          offchainAddr: 'ark1testaddr',
          boardingAddr: 'bc1testaddr',
        },
      },
      wallet: { svcWallet: mockSvcWallet as any },
    })

    // No amount means no swaps needed, QR should show immediately
    expect(screen.queryByText('Generating QR code...')).not.toBeInTheDocument()
  })
})
