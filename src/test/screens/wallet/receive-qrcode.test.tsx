import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
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
import { BackupContext } from '../../../providers/backup'
import { ToastProvider } from '../../../components/Toast'
import { LanguageContext, translate } from '../../../providers/language'
import { Language } from '../../../lib/types'
import ReceiveQRCode from '../../../screens/Wallet/Receive/QrCode'

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

// IonModal does not render in jsdom; keep the sheet's open/closed contract.
vi.mock('../../../components/SheetModal', () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) =>
    isOpen ? <div data-testid='sheet-modal'>{children}</div> : null,
}))
vi.mock('../../../icons/CheckMark', () => ({ default: () => <span>MARKER-COPIED</span> }))
vi.mock('../../../icons/Copy', () => ({ default: () => <span>MARKER-IDLE</span> }))

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

const backupAndUpdateConfig = vi.fn()

const mockNotificationsContextValue = {
  notifyPaymentReceived: () => {},
  notifyPaymentSent: () => {},
  requestPermission: () => Promise.resolve(),
}

type RenderOverrides = {
  flow?: Partial<typeof mockFlowContextValue>
  wallet?: Partial<typeof mockWalletContextValue>
  config?: Partial<typeof mockConfigContextValue>
  language?: Language
}

function buildTree(overrides?: RenderOverrides) {
  const flow = { ...mockFlowContextValue, ...overrides?.flow }
  const wallet = { ...mockWalletContextValue, ...overrides?.wallet }
  const config = { ...mockConfigContextValue, ...overrides?.config }

  const language = overrides?.language ?? Language.English

  return (
    <LanguageContext.Provider
      value={{ language, t: (k: string, p?: Record<string, string | number>) => translate(language, k, p) }}
    >
      <ToastProvider>
        <NavigationContext.Provider value={mockNavigationContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <ConfigContext.Provider value={config as any}>
              <FiatContext.Provider value={mockFiatContextValue as any}>
                <NotificationsContext.Provider value={mockNotificationsContextValue as any}>
                  <FlowContext.Provider value={flow as any}>
                    <WalletContext.Provider value={wallet as any}>
                      <LimitsContext.Provider value={mockLimitsContextValue}>
                        <BackupContext.Provider value={{ backupAndUpdateConfig } as any}>
                          <ReceiveQRCode />
                        </BackupContext.Provider>
                      </LimitsContext.Provider>
                    </WalletContext.Provider>
                  </FlowContext.Provider>
                </NotificationsContext.Provider>
              </FiatContext.Provider>
            </ConfigContext.Provider>
          </AspContext.Provider>
        </NavigationContext.Provider>
      </ToastProvider>
    </LanguageContext.Provider>
  )
}

function renderReceiveQrCode(overrides?: RenderOverrides) {
  return render(buildTree(overrides))
}

const withQrForm = (receiveQrForm: Record<string, string>): RenderOverrides['config'] => ({
  config: { ...mockConfigContextValue.config, receiveQrForm },
})

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
    backupAndUpdateConfig.mockClear()
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

  // Regression: the BIP21 effect has to re-derive the URI when the amount and
  // the invoice land after mount. Both arrive through setRecvInfo, which
  // touches neither assetAmount nor the addresses, so with only those in the
  // dep array the effect never re-ran and the QR kept the URI built on the
  // first pass — no amount, no lightning= parameter. The tests above pass
  // either way because they pre-seed the amount (and the invoice) before the
  // first render, so the single effect run is already complete.
  const afterMount = (extra: Partial<typeof mockFlowContextValue.recvInfo>): RenderOverrides => ({
    flow: {
      recvInfo: {
        ...mockFlowContextValue.recvInfo,
        satoshis: 50_000,
        offchainAddr: 'ark1testaddr',
        boardingAddr: 'bc1testaddr',
        ...extra,
      },
    },
    wallet: { svcWallet: mockSvcWallet as any },
  })

  it('re-derives the QR with the amount when the amount is set after mount', async () => {
    const { rerender } = renderReceiveQrCode(tapFixture())

    const initial = await screen.findByRole('button', { name: 'Copy QR code' })
    await act(async () => {
      fireEvent.click(initial)
    })
    expect(copyToClipboardMock.mock.calls.at(-1)?.[0]).not.toContain('amount=')

    rerender(buildTree(afterMount({})))

    const qrButton = await screen.findByRole('button', { name: 'Copy QR code' })
    await act(async () => {
      fireEvent.click(qrButton)
    })
    expect(copyToClipboardMock.mock.calls.at(-1)?.[0]).toContain('amount=')
  })

  it('re-derives the QR with the invoice when Lightning negotiates after mount', async () => {
    const { rerender } = renderReceiveQrCode(tapFixture())

    const initial = await screen.findByRole('button', { name: 'Copy QR code' })
    await act(async () => {
      fireEvent.click(initial)
    })
    expect(copyToClipboardMock.mock.calls.at(-1)?.[0]).not.toContain('lightning=')

    rerender(buildTree(afterMount({ invoice: 'lnbc10u1ptest' })))

    const qrButton = await screen.findByRole('button', { name: 'Copy QR code' })
    await act(async () => {
      fireEvent.click(qrButton)
    })
    expect(copyToClipboardMock.mock.calls.at(-1)?.[0]).toContain('lightning=')
  })

  describe('payment method selector', () => {
    const amountFixture = (invoice: string, receiveQrForm: Record<string, string> = {}): RenderOverrides => ({
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
      config: withQrForm(receiveQrForm),
    })
    const clickQr = async () => {
      const qr = await screen.findByRole('button', { name: 'Copy QR code' })
      await act(async () => {
        fireEvent.click(qr)
      })
      return copyToClipboardMock.mock.calls.at(-1)?.[0]
    }

    it('defaults to the unified URI when a Lightning invoice exists', async () => {
      renderReceiveQrCode(amountFixture('lnbc10u1ptest'))

      await screen.findByTestId('invoice-address-copy')
      const copied = await clickQr()
      expect(copied).toContain('bitcoin:')
      expect(copied).toContain('lnbc10u1ptest')
    })

    it('remembers the invoice row when it is put in the QR', async () => {
      renderReceiveQrCode(amountFixture('lnbc10u1ptest'))

      fireEvent.click(await screen.findByRole('radio', { name: /Lightning invoice/ }))

      expect(backupAndUpdateConfig).toHaveBeenLastCalledWith(
        expect.objectContaining({ receiveQrForm: { full: 'invoice' } }),
      )
      expect(copyToClipboardMock).not.toHaveBeenCalled()
    })

    it('copies the raw invoice when the invoice row is in the QR', async () => {
      renderReceiveQrCode(amountFixture('lnbc10u1ptest', { full: 'invoice' }))

      expect(await clickQr()).toBe('lnbc10u1ptest')
    })

    it('offers no Lightning invoice row before the corridor minimum is met', async () => {
      renderReceiveQrCode(amountFixture(''))

      await screen.findByTestId('bip21-address-copy')
      expect(screen.queryByTestId('invoice-address-copy')).not.toBeInTheDocument()
    })

    // Regression: the selector used to be a child of .receive-invoice-stage,
    // whose `> *` rule assigns grid-area: 1 / 1, so the QR painted over it and
    // ate its taps. jsdom does no layout, so only containment is assertable.
    it('renders the selector and part rows outside the QR stage, not stacked under it', async () => {
      const { container } = renderReceiveQrCode(amountFixture('lnbc10u1ptest'))

      const selector = await screen.findByRole('button', { name: /Showing/ })
      const stage = container.querySelector('.receive-invoice-stage')
      expect(stage).not.toBeNull()
      expect(stage?.contains(selector)).toBe(false)
      for (const row of screen.getAllByRole('radio')) expect(stage?.contains(row)).toBe(false)
    })

    it('translates the method labels like the rest of the screen', async () => {
      renderReceiveQrCode({ ...amountFixture('lnbc10u1ptest'), language: Language.Spanish })

      fireEvent.click(await screen.findByRole('button', { name: /Mostrando.*Unificado · Todos los detalles/ }))
      for (const label of ['Unificado · Todos los detalles', 'Arkade', 'Bitcoin']) {
        expect(screen.getByRole('radio', { name: label })).toBeInTheDocument()
      }
    })

    // Changing the amount clears the invoice so the solver renegotiates, and the
    // replacement arrives under a new preimage; the remembered row must outlast that.
    it('keeps the invoice in the QR when a different invoice arrives', async () => {
      const { rerender } = renderReceiveQrCode(amountFixture('lnbcOLD', { full: 'invoice' }))
      expect(await clickQr()).toBe('lnbcOLD')

      rerender(buildTree(amountFixture('lnbcNEW', { full: 'invoice' })))

      expect(await clickQr()).toBe('lnbcNEW')
    })

    it('never marks a part in the QR it has no value for', async () => {
      const { rerender } = renderReceiveQrCode(amountFixture('lnbc10u1ptest', { full: 'invoice' }))
      expect(await clickQr()).toBe('lnbc10u1ptest')

      rerender(buildTree(amountFixture('', { full: 'invoice' })))

      await waitFor(() => expect(screen.queryByTestId('invoice-address-copy')).not.toBeInTheDocument())
      expect(screen.getByRole('radio', { name: /Payment link/ })).toHaveAttribute('aria-checked', 'true')
      expect(await clickQr()).toMatch(/^bitcoin:/)
    })

    it('asset receive shows the link and the Arkade address with no selector', async () => {
      const assetId = 'ab'.repeat(32)
      renderReceiveQrCode({
        ...tapFixture(),
        flow: { recvInfo: { ...tapFixture().flow!.recvInfo!, assetId } },
        wallet: {
          svcWallet: mockSvcWallet as any,
          assetMetadataCache: new Map([[assetId, { metadata: { decimals: 2, ticker: 'TKN' } }]]) as any,
        },
      })
      expect(await screen.findByTestId('bip21-address-copy')).toBeInTheDocument()
      expect(screen.getByTestId('ark-address-copy')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Showing/ })).not.toBeInTheDocument()
    })
  })
})

describe('Receive QR Code screen — copy feedback', () => {
  beforeEach(() => {
    copyToClipboardMock.mockClear()
    // mockClear keeps implementations; restore so a forced failure does not leak.
    copyToClipboardMock.mockImplementation((v) => Promise.resolve(v))
  })

  it('reports a refused clipboard write instead of claiming success', async () => {
    copyToClipboardMock.mockResolvedValue(false)
    renderReceiveQrCode(tapFixture())

    const qrButton = await screen.findByRole('button', { name: 'Copy QR code' })
    await act(async () => {
      fireEvent.click(qrButton)
    })

    expect(await screen.findByText('Failed to copy')).toBeInTheDocument()
  })

  const clickQr = async () => {
    const qrButton = await screen.findByRole('button', { name: 'Copy QR code' })
    await act(async () => {
      fireEvent.click(qrButton)
    })
  }

  it('marks the copied row after a successful copy', async () => {
    renderReceiveQrCode(tapFixture())

    await clickQr()

    expect(copyToClipboardMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('bip21-address-copy')).toHaveTextContent('MARKER-COPIED')
  })

  it('leaves the rows unmarked after a refused copy', async () => {
    copyToClipboardMock.mockResolvedValue(false)
    renderReceiveQrCode(tapFixture())

    await clickQr()

    expect(screen.queryByText('MARKER-COPIED')).not.toBeInTheDocument()
  })

  it('reports a refused row copy', async () => {
    copyToClipboardMock.mockResolvedValue(false)
    renderReceiveQrCode(tapFixture())

    await act(async () => {
      fireEvent.click(await screen.findByTestId('ark-address-copy'))
    })

    expect(await screen.findByText('Failed to copy')).toBeInTheDocument()
    expect(screen.getByTestId('ark-address-copy')).not.toHaveTextContent('MARKER-COPIED')
  })
})
