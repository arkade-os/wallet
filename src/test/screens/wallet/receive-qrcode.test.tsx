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
import { ToastProvider } from '../../../components/Toast'
import { LanguageContext, translate } from '../../../providers/language'
import { Language } from '../../../lib/types'
import ReceiveQRCode from '../../../screens/Wallet/Receive/QrCode'

// Mock qr module used by QrCode component
vi.mock('qr', () => ({
  default: () => Array.from({ length: 21 }, () => new Uint8Array(21).fill(1)),
}))

// Unmocked, this negotiate-effect fetch flakes the aria-hidden-gated Copy button under load.
vi.mock('../../../lib/swapMarkets', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/swapMarkets')>()),
  discoverMarkets: vi.fn().mockResolvedValue([]),
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
    </LanguageContext.Provider>
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

    // The selector is part of a fully translated screen, so its labels have to
    // come from the dictionary rather than being baked in. Without the three
    // receive.method* keys this renders English labels inside the Spanish UI.
    it('translates the method labels like the rest of the screen', async () => {
      renderReceiveQrCode({ ...amountFixture('lnbc10u1ptest'), language: Language.Spanish })

      await screen.findByText('Unificado')
      // The other three keep their name in both languages, so only 'Unified'
      // differs; the point is that it is translated at all.
      for (const label of ['Unificado', 'Lightning', 'Arkade', 'Bitcoin']) {
        expect(screen.getByText(label)).toBeInTheDocument()
      }
    })

    // Changing the amount clears the invoice so the solver renegotiates (see
    // the amount handler), and the replacement arrives under a new preimage.
    // The choice has to outlast that: tracking the *invoice* instead of the
    // method dropped the user back to unified permanently, which is the one
    // flow where Lightning is what they picked in the first place.
    it('restores the Lightning selection when a different invoice arrives', async () => {
      const { rerender } = renderReceiveQrCode(amountFixture('lnbcOLD'))
      await act(async () => {
        fireEvent.click(await screen.findByText('Lightning'))
      })

      rerender(buildTree(amountFixture('lnbcNEW')))
      const qrButton = await screen.findByRole('button', { name: 'Copy QR code' })
      await act(async () => {
        fireEvent.click(qrButton)
      })

      // The pick comes back with the new preimage, instead of needing to be
      // made again after every amount tweak.
      expect(copyToClipboardMock.mock.calls.at(-1)?.[0]).toBe('lnbcNEW')
    })

    it('never highlights a method it has no value for', async () => {
      const { rerender } = renderReceiveQrCode(amountFixture('lnbc10u1ptest'))
      await act(async () => {
        fireEvent.click(await screen.findByText('Lightning'))
      })

      rerender(buildTree(amountFixture('')))
      // The Lightning entry is absent while there is no invoice, so the
      // highlight has to move somewhere true — a lit option with no value
      // behind it is what the user just asked to be handed.
      await waitFor(() => {
        expect(screen.queryByText('Lightning')).not.toBeInTheDocument()
      })
      expect(screen.getByText('Unified')).toBeInTheDocument()
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

  const openCopySheet = async () => {
    const copyButton = await screen.findByRole('button', { name: 'Copy' })
    await act(async () => {
      fireEvent.click(copyButton)
    })
  }

  it('marks the copied value in the sheet after a successful copy', async () => {
    renderReceiveQrCode(tapFixture())

    await clickQr()
    await openCopySheet()

    expect(copyToClipboardMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('sheet-modal')).toHaveTextContent('MARKER-COPIED')
  })

  it('leaves the sheet unmarked after a refused copy', async () => {
    copyToClipboardMock.mockResolvedValue(false)
    renderReceiveQrCode(tapFixture())

    await clickQr()
    await openCopySheet()

    expect(screen.getByTestId('sheet-modal')).not.toHaveTextContent('MARKER-COPIED')
  })

  it('closes the sheet when a row copy is refused', async () => {
    copyToClipboardMock.mockResolvedValue(false)
    renderReceiveQrCode(tapFixture())

    await openCopySheet()
    await act(async () => {
      fireEvent.click(screen.getByTestId('ark-address-copy'))
    })

    expect(await screen.findAllByText('Failed to copy')).not.toHaveLength(0)
    expect(screen.queryByTestId('sheet-modal')).not.toBeInTheDocument()
  })

  it('reports a refused clipboard write from the copy button too', async () => {
    copyToClipboardMock.mockResolvedValue(false)
    renderReceiveQrCode(tapFixture())

    const copyButton = await screen.findByRole('button', { name: 'Copy' })
    await act(async () => {
      fireEvent.click(copyButton)
    })

    expect(await screen.findByText('Failed to copy')).toBeInTheDocument()
  })
})
