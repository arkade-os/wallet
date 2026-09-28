import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
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
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { NotificationsContext } from '../../../providers/notifications'
import { ToastProvider } from '../../../components/Toast'
import ReceiveQRCode, { resolveQrValue } from '../../../screens/Wallet/Receive/QrCode'

// Mock qr module used by QrCode component
vi.mock('qr', () => ({
  default: () => Array.from({ length: 21 }, () => new Uint8Array(21).fill(1)),
}))

// Mock clipboard helper so we can assert it was called with the QR value
const copyToClipboardMock = vi.fn((v) => Promise.resolve(v))
vi.mock('../../../lib/clipboard', () => ({
  copyToClipboard: (v: string) => copyToClipboardMock(v),
}))

// Silence haptics in jsdom (no-op already, but keeps tests deterministic)
vi.mock('../../../lib/haptics', () => ({
  hapticSubtle: vi.fn(),
  hapticTap: vi.fn(),
  hapticLight: vi.fn(),
  setHapticsEnabled: vi.fn(),
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

type RenderOverrides = {
  flow?: Partial<typeof mockFlowContextValue>
  wallet?: Partial<typeof mockWalletContextValue>
  config?: Partial<typeof mockConfigContextValue>
}

function buildTree(overrides?: RenderOverrides) {
  const flow = { ...mockFlowContextValue, ...overrides?.flow }
  const wallet = { ...mockWalletContextValue, ...overrides?.wallet }
  const config = { ...mockConfigContextValue, ...overrides?.config }

  return (
    <ToastProvider>
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <ConfigContext.Provider value={config as any}>
            <FiatContext.Provider value={mockFiatContextValue as any}>
              <NotificationsContext.Provider value={mockNotificationsContextValue as any}>
                <FlowContext.Provider value={flow as any}>
                  <WalletContext.Provider value={wallet as any}>
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
}

function renderReceiveQrCode(overrides?: RenderOverrides) {
  return render(buildTree(overrides))
}

// Shared fixture for the tap-to-copy tests: no amount,
// both addresses populated so the screen renders the QR immediately.
const tapFixture = (addrs = { off: 'ark1testaddr', bd: 'bc1testaddr' }): RenderOverrides => ({
  flow: {
    recvInfo: {
      ...mockFlowContextValue.recvInfo,
      satoshis: 0,
      offchainAddr: addrs.off,
      boardingAddr: addrs.bd,
    },
  },
  wallet: { svcWallet: mockSvcWallet as any },
})

describe('Receive QR Code screen', () => {
  beforeEach(() => {
    copyToClipboardMock.mockClear()
  })

  // Regression for the switched-QR path. We can't drive the Copy sheet in
  // jsdom (IonModal portals children outside the React root so synthetic
  // clicks on rows never fire). Instead we swap recvInfo addresses via
  // rerender — this hits the same setQrCodeValue code path through the
  // BIP21 effect's dep change — and assert the second tap copies the new
  // value rather than a stale closure of the first.
  it('tapping the QR after qrCodeValue changes copies the new value', async () => {
    const { rerender } = render(buildTree(tapFixture({ off: 'ark1AAAAAA', bd: 'bc1AAAAAA' })))

    const qrButton = await screen.findByRole('button', { name: 'Copy QR code' })
    await act(async () => {
      fireEvent.click(qrButton)
    })
    const first = copyToClipboardMock.mock.calls.at(-1)?.[0]
    expect(first).toContain('ark1AAAAAA')
    expect(first).toContain('bc1AAAAAA')

    await act(async () => {
      rerender(buildTree(tapFixture({ off: 'ark1BBBBBB', bd: 'bc1BBBBBB' })))
    })

    await act(async () => {
      fireEvent.click(qrButton)
    })
    const second = copyToClipboardMock.mock.calls.at(-1)?.[0]
    expect(second).toContain('ark1BBBBBB')
    expect(second).toContain('bc1BBBBBB')
    expect(second).not.toBe(first)
  })

  it('carries the requested amount in the QR once one is set', async () => {
    renderReceiveQrCode({
      flow: {
        recvInfo: {
          ...mockFlowContextValue.recvInfo,
          satoshis: 50_000,
          offchainAddr: 'ark1testaddr',
          boardingAddr: 'bc1testaddr',
        },
      },
      wallet: { svcWallet: mockSvcWallet as any },
    })

    const qrButton = await screen.findByRole('button', { name: 'Copy QR code' })
    await act(async () => {
      fireEvent.click(qrButton)
    })

    const copied = copyToClipboardMock.mock.calls.at(-1)?.[0]
    expect(copied).toContain('amount=')
  })

  // The unified BIP21 URI is the right default — it serves every payer that
  // understands it — but a pure off-chain wallet cannot read the invoice buried
  // in its `lightning=` parameter. So the method has to be selectable without
  // going through the Copy sheet.
  describe('payment method selector', () => {
    const amountFixture = (invoice: string): RenderOverrides => ({
      flow: {
        recvInfo: {
          ...mockFlowContextValue.recvInfo,
          satoshis: 50_000,
          offchainAddr: 'ark1testaddr',
          boardingAddr: 'bc1testaddr',
          invoice,
        },
      },
      wallet: { svcWallet: mockSvcWallet as any },
    })

    it('defaults to the unified URI when a Lightning invoice exists', async () => {
      renderReceiveQrCode(amountFixture('lnbc10u1ptest'))

      await screen.findByText('Lightning')
      const qrButton = await screen.findByRole('button', { name: 'Copy QR code' })
      await act(async () => {
        fireEvent.click(qrButton)
      })

      const copied = copyToClipboardMock.mock.calls.at(-1)?.[0]
      expect(copied).toContain('bitcoin:')
      expect(copied).toContain('lnbc10u1ptest')
    })

    it('copies the raw invoice after selecting Lightning, not the unified URI', async () => {
      renderReceiveQrCode(amountFixture('lnbc10u1ptest'))

      const option = await screen.findByText('Lightning')
      await act(async () => {
        fireEvent.click(option)
      })

      const qrButton = await screen.findByRole('button', { name: 'Copy QR code' })
      await act(async () => {
        fireEvent.click(qrButton)
      })

      const copied = copyToClipboardMock.mock.calls.at(-1)?.[0]
      expect(copied).toBe('lnbc10u1ptest')
    })

    it('does not copy anything just because a method was selected', async () => {
      renderReceiveQrCode(amountFixture('lnbc10u1ptest'))

      const option = await screen.findByText('Lightning')
      await act(async () => {
        fireEvent.click(option)
      })

      // Choosing what to show is not a copy action: the clipboard only changes
      // when Copy is pressed.
      expect(copyToClipboardMock).not.toHaveBeenCalled()
    })

    it('offers no Lightning option before the corridor minimum is met', async () => {
      renderReceiveQrCode(amountFixture(''))

      await screen.findByText('Unified')
      expect(screen.queryByText('Lightning')).not.toBeInTheDocument()
    })

    // Regression: the selector used to be a child of .receive-invoice-stage,
    // whose `> *` rule assigns grid-area: 1 / 1. That stacked it exactly under
    // the QR, so the QR painted over it and ate the taps — selecting looked like
    // it copied, because the tap landed on the QR button. jsdom does no layout,
    // so only the containment itself is assertable here.
    it('renders the selector outside the QR stage, not stacked under it', async () => {
      const { container } = renderReceiveQrCode(amountFixture('lnbc10u1ptest'))

      await screen.findByText('Lightning')
      const stage = container.querySelector('.receive-invoice-stage')
      expect(stage).toBeInTheDocument()
      expect(stage).not.toBeNull()
      for (const label of ['Unified', 'Lightning', 'Arkade', 'Bitcoin']) {
        const option = screen.getByText(label)
        expect(stage?.contains(option)).toBe(false)
      }
    })
  })
})

describe('resolveQrValue', () => {
  const opts = { bip21: 'bitcoin:unified', btc: 'bc1addr', ark: 'ark1addr', invoice: 'lnbc10u1p' }

  it('defaults to the unified BIP21 URI when nothing is selected', () => {
    expect(resolveQrValue('', opts)).toBe('bitcoin:unified')
  })

  it('keeps an explicit selection that is still on offer', () => {
    expect(resolveQrValue('ark1addr', opts)).toBe('ark1addr')
    expect(resolveQrValue('bc1addr', opts)).toBe('bc1addr')
  })

  it('keeps a selected Lightning invoice, which pure off-chain wallets need', () => {
    // The invoice is only in the candidate set because it is a real option the
    // user can pick: below the corridor minimum there is no invoice, and above
    // it this is the only string a Lightning-only wallet can read.
    expect(resolveQrValue('lnbc10u1p', opts)).toBe('lnbc10u1p')
  })

  it('falls back to the unified URI when the selection is no longer offered', () => {
    // e.g. the previously-selected address was regenerated / cleared
    expect(resolveQrValue('ark1stale', opts)).toBe('bitcoin:unified')
    expect(resolveQrValue('ark1addr', { ...opts, ark: '' })).toBe('bitcoin:unified')
    // a re-minted invoice leaves the old one unselectable
    expect(resolveQrValue('lnbcOLD', opts)).toBe('bitcoin:unified')
    expect(resolveQrValue('lnbc10u1p', { ...opts, invoice: '' })).toBe('bitcoin:unified')
  })
})
