import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, act, fireEvent, waitFor, within } from '@testing-library/react'
import { FlowContext, emptyRecvInfo } from '../../../providers/flow'
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
import { SwapsContext } from '../../../providers/swaps'
import { ToastProvider } from '../../../components/Toast'
import { LanguageContext, translate } from '../../../providers/language'
import { Currencies, Language, Unit } from '../../../lib/types'
import ReceiveQRCode from '../../../screens/Wallet/Receive/QrCode'
import fixtures from '../../fixtures.json'

// Mock qr module used by QrCode component
vi.mock('qr', () => ({
  default: () => Array.from({ length: 21 }, () => new Uint8Array(21).fill(1)),
}))

// Mock clipboard helper so we can assert it was called with the QR value
const copyToClipboardMock = vi.fn((v) => Promise.resolve(v))
vi.mock('../../../lib/clipboard', () => ({
  copyToClipboard: (v: string) => copyToClipboardMock(v),
}))

// jsdom has no Web Share, which would leave Share disabled whatever the screen's state.
vi.mock('../../../lib/share', () => ({ canBrowserShareData: () => true, shareData: async () => {} }))

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
const updateConfig = vi.fn()
const backupConfig = vi.fn(async () => {})

const mockNotificationsContextValue = {
  notifyPaymentReceived: () => {},
  notifyPaymentSent: () => {},
  requestPermission: () => Promise.resolve(),
}

type RenderOverrides = {
  flow?: Partial<typeof mockFlowContextValue>
  wallet?: Partial<typeof mockWalletContextValue>
  config?: Partial<typeof mockConfigContextValue>
  fiat?: Partial<typeof mockFiatContextValue>
  limits?: Partial<typeof mockLimitsContextValue>
  language?: Language
}

let receivingAddresses = { offchainAddr: '', boardingAddr: '' }
const receivingWallet = {
  ...mockSvcWallet,
  getAddress: () => Promise.resolve(receivingAddresses.offchainAddr),
  getBoardingAddress: () => Promise.resolve(receivingAddresses.boardingAddr),
}

function buildTree(overrides?: RenderOverrides) {
  const flow = { ...mockFlowContextValue, ...overrides?.flow }
  const wallet = { ...mockWalletContextValue, ...overrides?.wallet }
  if (wallet.svcWallet === mockSvcWallet) {
    receivingAddresses = { offchainAddr: flow.recvInfo.offchainAddr, boardingAddr: flow.recvInfo.boardingAddr }
    wallet.svcWallet = receivingWallet as typeof wallet.svcWallet
  }
  const config = { ...mockConfigContextValue, ...overrides?.config }

  const language = overrides?.language ?? Language.English

  return (
    <LanguageContext.Provider
      value={{ language, t: (k: string, p?: Record<string, string | number>) => translate(language, k, p) }}
    >
      <ToastProvider>
        <NavigationContext.Provider value={mockNavigationContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <ConfigContext.Provider value={{ ...config, updateConfig } as any}>
              <FiatContext.Provider value={{ ...mockFiatContextValue, ...overrides?.fiat } as any}>
                <NotificationsContext.Provider value={mockNotificationsContextValue as any}>
                  <FlowContext.Provider value={flow as any}>
                    <WalletContext.Provider value={wallet as any}>
                      <LimitsContext.Provider value={{ ...mockLimitsContextValue, ...overrides?.limits }}>
                        <BackupContext.Provider value={{ backupAndUpdateConfig, backupConfig } as any}>
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
    updateConfig.mockClear()
    backupConfig.mockClear()
  })

  const expectNoCopyFormatsOrShare = () => {
    expect(screen.queryByRole('button', { name: 'Copy QR code' })).not.toBeInTheDocument()
    expect(screen.queryByTestId(/-address-copy$/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Other formats/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
  }

  it('renders no copy button, and disables Share, when no payment method is allowed', async () => {
    renderReceiveQrCode({ ...tapFixture(), limits: { vtxoTxsAllowed: () => false, utxoTxsAllowed: () => false } })

    expect(await screen.findByText('No valid payment methods available for this amount')).toBeInTheDocument()
    expectNoCopyFormatsOrShare()
  })

  it('renders no copy button, and disables Share, while the address error shows, though addresses from an earlier load remain', async () => {
    const fixture = tapFixture()
    const { rerender } = renderReceiveQrCode(fixture)
    await screen.findByRole('button', { name: 'Copy QR code' })

    rerender(buildTree({ ...fixture, flow: { recvInfo: { ...fixture.flow!.recvInfo!, addressError: 'offline' } } }))

    expect(await screen.findByText('Failed to get address: offline')).toBeInTheDocument()
    expectNoCopyFormatsOrShare()
  })

  // Regression for the switched-QR path: new recvInfo addresses re-derive the QR through the BIP21
  // effect, and the second tap must copy the new value, not a stale closure of the first.
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

    await act(async () => {})
    const updatedQrButton = await screen.findByRole('button', { name: 'Copy QR code' })
    await act(async () => {
      fireEvent.click(updatedQrButton)
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

  it('renders no copy button, and disables Share, while the invoice generates', async () => {
    let fail: (reason: Error) => void = () => {}
    const receiveLightning = () => new Promise((_, reject) => (fail = reject))
    const { container } = render(
      <SwapsContext.Provider value={{ receiveLightning, outcomeOf: () => undefined, errorOf: () => undefined } as any}>
        {buildTree(afterMount({}))}
      </SwapsContext.Provider>,
    )

    await waitFor(() => expect(container.querySelector('[data-generating="true"]')).not.toBeNull())
    expect(screen.queryByTestId(/-address-copy$/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()

    await act(async () => fail(new Error('no solver')))
    expect(await screen.findByTestId('bip21-address-copy')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled()
  })

  describe('other formats', () => {
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
    const tap = async (element: HTMLElement) => {
      copyToClipboardMock.mockClear()
      await act(async () => {
        fireEvent.click(element)
      })
      return copyToClipboardMock.mock.calls.at(-1)?.[0]
    }
    const clickQr = async () => tap(await screen.findByRole('button', { name: 'Copy QR code' }))
    const copyFrom = async (testId: string) => tap(await screen.findByTestId(testId))
    const openFormats = async () => fireEvent.click(await screen.findByRole('button', { name: /^Other formats/ }))
    const pickFormat = async (name: RegExp) => {
      await openFormats()
      fireEvent.click(screen.getByRole('radio', { name }))
    }
    const activeFormat = () => screen.getByRole('radio', { checked: true })

    it('defaults to the unified URI when a Lightning invoice exists', async () => {
      renderReceiveQrCode(amountFixture('lnbc10u1ptest'))

      await screen.findByTestId('bip21-address-copy')
      const copied = await clickQr()
      expect(copied).toContain('bitcoin:')
      expect(copied).toContain('lnbc10u1ptest')
    })

    it("names the Lightning invoice's minutes left in its row", async () => {
      // The fixture invoice was issued at 1734606755 with a 12 h expiry; ten minutes in, 710 remain.
      const now = vi.spyOn(Date, 'now').mockReturnValue((1734606755 + 600) * 1000)
      try {
        renderReceiveQrCode(amountFixture(fixtures.lib.bolt11.invoice))
        await openFormats()
        expect(screen.getByRole('radio', { name: /^Lightning invoice/ })).toHaveAccessibleName(/expires in 710 min/)
      } finally {
        now.mockRestore()
      }
    })

    it('makes Any wallet the active radio on every mount, remembering no pick', async () => {
      const { unmount } = renderReceiveQrCode(tapFixture())

      await openFormats()
      expect(screen.getByRole('radiogroup', { name: 'Other formats' })).toContainElement(activeFormat())
      expect(activeFormat()).toHaveAccessibleName(/^Any wallet/)
      expect(within(activeFormat()).getByText('Default')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('radio', { name: /^Arkade address/ }))
      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
      await openFormats()
      expect(activeFormat()).toHaveAccessibleName(/^Arkade address/)

      unmount()
      renderReceiveQrCode(tapFixture())
      await openFormats()
      expect(activeFormat()).toHaveAccessibleName(/^Any wallet/)
      expect(updateConfig).not.toHaveBeenCalled()
      expect(backupConfig).not.toHaveBeenCalled()
      expect(backupAndUpdateConfig).not.toHaveBeenCalled()
    })

    it.each([
      ['bare with no amount', tapFixture(), 'ark1testaddr', 'bc1testaddr'],
      [
        'as a bitcoin: link once an amount is set',
        amountFixture(''),
        'bitcoin:?ark=ark1testaddr&amount=0.0005',
        'bitcoin:bc1testaddr?amount=0.0005',
      ],
    ])('puts the picked Arkade, then Bitcoin, address in the QR and its copy %s', async (_, fixture, ark, btc) => {
      renderReceiveQrCode(fixture)

      await pickFormat(/^Arkade address/)
      expect(await clickQr()).toBe(ark)
      expect(await copyFrom('ark-address-copy')).toBe(ark)

      await pickFormat(/^Bitcoin address/)
      expect(await clickQr()).toBe(btc)
      expect(await copyFrom('btc-address-copy')).toBe(btc)
    })

    it('puts the raw invoice in the QR and its copy once Lightning invoice is picked', async () => {
      renderReceiveQrCode(amountFixture('lnbc10u1ptest'))

      await pickFormat(/^Lightning invoice/)
      expect(await clickQr()).toBe('lnbc10u1ptest')
      expect(await copyFrom('invoice-address-copy')).toBe('lnbc10u1ptest')
    })

    it('offers no Lightning invoice row before the corridor minimum is met', async () => {
      renderReceiveQrCode(amountFixture(''))

      await openFormats()
      expect(screen.getAllByRole('radio')).toHaveLength(3)
      expect(screen.queryByRole('radio', { name: /^Lightning/ })).not.toBeInTheDocument()
    })

    it('moves focus among the format radios with the arrow keys, without picking', async () => {
      renderReceiveQrCode(tapFixture())
      await openFormats()
      const radios = within(screen.getByRole('radiogroup', { name: 'Other formats' })).getAllByRole('radio')
      const press = (key: string) => fireEvent.keyDown(document.activeElement!, { key })

      expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1])
      act(() => radios[0].focus())
      press('ArrowDown')
      expect(radios[1]).toHaveFocus()
      press('ArrowUp')
      press('ArrowUp')
      expect(radios[2]).toHaveFocus()
      press('Home')
      expect(radios[0]).toHaveFocus()
      press('End')
      expect(radios[2]).toHaveFocus()
      expect(activeFormat()).toBe(radios[0])
    })

    it.each([
      [
        'Spanish',
        Language.Spanish,
        'Otros formatos',
        ['Cualquier billetera', 'Factura Lightning', 'Dirección Arkade', 'Dirección Bitcoin'],
      ],
      [
        'Portuguese',
        Language.Portuguese,
        'Outros formatos',
        ['Qualquer carteira', 'Fatura Lightning', 'Endereço Arkade', 'Endereço Bitcoin'],
      ],
    ])('translates the formats like the rest of the screen to %s', async (_, language, card, rows) => {
      renderReceiveQrCode({ ...amountFixture('lnbc10u1ptest'), language })

      fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${card}`) }))
      const group = screen.getByRole('radiogroup', { name: card })
      for (const row of rows) {
        expect(within(group).getByRole('radio', { name: new RegExp(`^${row}`) })).toBeInTheDocument()
      }
    })

    it('keeps Lightning invoice picked when a different invoice arrives', async () => {
      const { rerender } = renderReceiveQrCode(amountFixture('lnbcOLD'))
      await pickFormat(/^Lightning invoice/)
      expect(await clickQr()).toBe('lnbcOLD')

      rerender(buildTree(amountFixture('lnbcNEW')))

      expect(await clickQr()).toBe('lnbcNEW')
      await openFormats()
      expect(activeFormat()).toHaveAccessibleName(/^Lightning invoice/)
    })

    it('falls back to Any wallet when the picked Lightning invoice goes', async () => {
      const { rerender } = renderReceiveQrCode(amountFixture('lnbc10u1ptest'))
      await pickFormat(/^Lightning invoice/)
      expect(await clickQr()).toBe('lnbc10u1ptest')

      rerender(buildTree(amountFixture('')))

      await waitFor(() => expect(screen.queryByTestId('invoice-address-copy')).not.toBeInTheDocument())
      expect(await clickQr()).toMatch(/^bitcoin:/)
      await openFormats()
      expect(activeFormat()).toHaveAccessibleName(/^Any wallet/)
      expect(screen.queryByRole('radio', { name: /^Lightning/ })).not.toBeInTheDocument()
    })

    it.each([
      [Unit.BTC, '0.00050000 BTC'],
      [Unit.SATS, '50,000 sats'],
    ])('shows the requested amount in %s', async (unit, headline) => {
      renderReceiveQrCode({
        ...amountFixture('lnbc10u1ptest'),
        config: { useFiat: false, config: { ...mockConfigContextValue.config, unit } },
      })

      expect(await screen.findByTestId('receive-amount')).toHaveTextContent(headline)
    })

    it('keeps assetid= in the asset QR and its copy, offering no other formats', async () => {
      const assetId = 'ab'.repeat(32)
      renderReceiveQrCode({
        flow: { recvInfo: { ...tapFixture().flow!.recvInfo!, assetId } },
        wallet: {
          svcWallet: mockSvcWallet as any,
          assetMetadataCache: new Map([[assetId, { metadata: { decimals: 2, ticker: 'TKN' } }]]) as any,
        },
      })

      expect(await clickQr()).toContain(`assetid=${assetId}`)
      expect(await copyFrom('bip21-address-copy')).toContain(`assetid=${assetId}`)
      expect(screen.getAllByTestId(/-address-copy$/)).toHaveLength(1)
      expect(screen.queryByRole('button', { name: /^Other formats/ })).not.toBeInTheDocument()
    })
  })
})

describe('Receive QR Code screen — amount sheet denomination', () => {
  // `rate` sats per dollar; 0 means no rate, so no conversion.
  const sheetOptions = (
    unit: Unit,
    setRecvInfo: (info: { satoshis: number }) => void,
    rate = 1000,
  ): RenderOverrides => ({
    ...tapFixture(),
    flow: { ...tapFixture().flow, setRecvInfo } as any,
    config: {
      ...mockConfigContextValue,
      useFiat: true,
      config: { ...mockConfigContextValue.config, currency: Currencies.USD, unit },
    },
    fiat: {
      toFiat: (sats?: number) => (rate ? (sats ?? 0) / rate : 0),
      fromFiat: (fiat?: number) => Math.floor((fiat ?? 0) * rate),
    },
  })
  const sheetFixture = (...args: Parameters<typeof sheetOptions>) => buildTree(sheetOptions(...args))
  const sheetInput = () => document.querySelector('input[name="receive-amount-sheet"]') as HTMLInputElement
  const openSheet = async () => fireEvent.click(await screen.findByRole('button', { name: 'Add amount' }))
  const setAmount = (value: string) => {
    fireEvent.change(sheetInput(), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'Set amount' }))
  }

  it.each([
    [Unit.BTC, '0.0002', 20_000],
    [Unit.SATS, '1234', 1234],
  ])('reads the amount in %s once the sheet is switched from fiat', async (unit, typed, sats) => {
    const setRecvInfo = vi.fn()
    render(sheetFixture(unit, setRecvInfo))
    await openSheet()

    fireEvent.click(screen.getByTestId('input-amount-switch'))
    setAmount(typed)

    expect(setRecvInfo).toHaveBeenLastCalledWith(expect.objectContaining({ satoshis: sats }))
  })

  it('re-expresses the typed amount when switched, and reads fiat again after switching back', async () => {
    const setRecvInfo = vi.fn()
    render(sheetFixture(Unit.BTC, setRecvInfo))
    await openSheet()

    fireEvent.click(screen.getByTestId('input-amount-switch'))
    fireEvent.change(sheetInput(), { target: { value: '0.0002' } })
    fireEvent.click(screen.getByTestId('input-amount-switch'))
    expect(sheetInput()).toHaveValue(20)
    setAmount('5')

    expect(setRecvInfo).toHaveBeenLastCalledWith(expect.objectContaining({ satoshis: 5000 }))
  })

  it('keeps the typed amount exact across a round trip of switches', async () => {
    const setRecvInfo = vi.fn()
    render(sheetFixture(Unit.BTC, setRecvInfo, 110.99))
    await openSheet()

    fireEvent.change(sheetInput(), { target: { value: '5' } })
    fireEvent.click(screen.getByTestId('input-amount-switch'))
    fireEvent.click(screen.getByTestId('input-amount-switch'))
    expect(sheetInput()).toHaveValue(4.99)
    fireEvent.click(screen.getByRole('button', { name: 'Set amount' }))

    expect(setRecvInfo).toHaveBeenLastCalledWith(expect.objectContaining({ satoshis: 554 }))
  })

  it('falls back to the bitcoin unit when the rate goes, and stays there when it returns', async () => {
    const setRecvInfo = vi.fn()
    const { rerender } = render(sheetFixture(Unit.BTC, setRecvInfo))
    await openSheet()
    expect(screen.getByRole('button', { name: `Enter amount in ${Unit.BTC}` })).toBeInTheDocument()

    rerender(sheetFixture(Unit.BTC, setRecvInfo, 0))
    rerender(sheetFixture(Unit.BTC, setRecvInfo))
    expect(await screen.findByRole('button', { name: `Enter amount in ${Currencies.USD}` })).toBeInTheDocument()
    setAmount('0.0002')

    expect(setRecvInfo).toHaveBeenLastCalledWith(expect.objectContaining({ satoshis: 20_000 }))
  })

  it('leaves an asset amount as typed when the rate goes', async () => {
    const assetId = 'ab'.repeat(32)
    const assetTree = (rate: number) =>
      buildTree({
        ...sheetOptions(Unit.BTC, vi.fn(), rate),
        flow: { ...tapFixture().flow, recvInfo: { ...tapFixture().flow!.recvInfo!, assetId } } as any,
        wallet: {
          svcWallet: mockSvcWallet as any,
          assetMetadataCache: new Map([[assetId, { metadata: { decimals: 2, ticker: 'TKN' } }]]) as any,
        },
      })
    const { rerender } = render(assetTree(1000))
    await openSheet()
    fireEvent.change(sheetInput(), { target: { value: '12.5' } })

    rerender(assetTree(0))

    expect(sheetInput()).toHaveValue(12.5)
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

  it('marks the copy button after a successful copy', async () => {
    renderReceiveQrCode(tapFixture())

    await clickQr()

    expect(copyToClipboardMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('bip21-address-copy')).toHaveTextContent('MARKER-COPIED')
  })

  it('clears the copied mark after a moment', async () => {
    renderReceiveQrCode(tapFixture())

    await clickQr()

    await waitFor(() => expect(screen.getByTestId('bip21-address-copy')).toHaveTextContent('MARKER-IDLE'), {
      timeout: 3000,
    })
  })

  it('leaves the copy button unmarked after a refused copy', async () => {
    copyToClipboardMock.mockResolvedValue(false)
    renderReceiveQrCode(tapFixture())

    await clickQr()

    expect(screen.queryByText('MARKER-COPIED')).not.toBeInTheDocument()
  })

  it('reports a refused copy from the copy button', async () => {
    copyToClipboardMock.mockResolvedValue(false)
    renderReceiveQrCode(tapFixture())

    await act(async () => {})
    const button = await screen.findByTestId('bip21-address-copy')
    await act(async () => {
      fireEvent.click(button)
    })

    expect(await screen.findByText('Failed to copy')).toBeInTheDocument()
    expect(screen.getByTestId('bip21-address-copy')).not.toHaveTextContent('MARKER-COPIED')
  })

  it('copies what the QR shows from the copy button under it', async () => {
    renderReceiveQrCode(tapFixture())

    await clickQr()
    const shown = copyToClipboardMock.mock.calls.at(-1)?.[0]
    await act(async () => {
      fireEvent.click(screen.getByTestId('bip21-address-copy'))
    })

    expect(copyToClipboardMock).toHaveBeenCalledTimes(2)
    expect(copyToClipboardMock).toHaveBeenLastCalledWith(shown)
  })
})

describe('Receive QR Code screen — asset pill', () => {
  const assetId = 'ab'.repeat(32)
  const assetMetadataCache = new Map([[assetId, { metadata: { decimals: 0, ticker: 'TKN', name: 'Token' } }]]) as any
  const prev = {
    ...mockFlowContextValue.recvInfo,
    satoshis: 50_000,
    invoice: 'lnbc1x',
    offchainAddr: 'ark1testaddr',
    boardingAddr: 'bc1testaddr',
  }
  const pickAsset = async (name: RegExp) => {
    fireEvent.click(await screen.findByTestId('receive-asset-pill'))
    fireEvent.click(screen.getByRole('radio', { name }))
  }

  it('stays a label while the wallet holds no assets', async () => {
    renderReceiveQrCode(tapFixture())
    const pill = await screen.findByTestId('receive-asset-pill')
    expect(pill.tagName).toBe('SPAN')
    expect(pill).toHaveTextContent('Bitcoin')
  })

  it('leaves out a held asset it cannot name yet', async () => {
    renderReceiveQrCode({
      ...tapFixture(),
      wallet: { svcWallet: mockSvcWallet as any, assetBalances: [{ assetId, amount: 5 }] as any },
    })
    expect((await screen.findByTestId('receive-asset-pill')).tagName).toBe('SPAN')
  })

  it('switches to a held asset, dropping the amount and invoice asked for in bitcoin', async () => {
    const setRecvInfo = vi.fn()
    const fixture = tapFixture()
    renderReceiveQrCode({
      flow: { ...fixture.flow, setRecvInfo },
      wallet: { svcWallet: mockSvcWallet as any, assetBalances: [{ assetId, amount: 5 }] as any, assetMetadataCache },
    })
    await pickAsset(/^Token/)

    expect(setRecvInfo.mock.calls.at(-1)![0](prev)).toEqual({
      ...emptyRecvInfo,
      offchainAddr: 'ark1testaddr',
      boardingAddr: 'bc1testaddr',
      assetId,
    })
  })

  it('lists the asset it was opened for even with no balance, and switches back to Bitcoin', async () => {
    const setRecvInfo = vi.fn()
    renderReceiveQrCode({
      flow: { recvInfo: { ...tapFixture().flow!.recvInfo!, assetId }, setRecvInfo },
      wallet: { svcWallet: mockSvcWallet as any, assetMetadataCache },
    })
    fireEvent.click(await screen.findByTestId('receive-asset-pill'))
    expect(screen.getByRole('radio', { name: /^Token/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: /^Bitcoin/ }))

    expect(setRecvInfo.mock.calls.at(-1)![0]({ ...prev, assetId })).toEqual({
      ...emptyRecvInfo,
      offchainAddr: 'ark1testaddr',
      boardingAddr: 'bc1testaddr',
    })
  })
})
