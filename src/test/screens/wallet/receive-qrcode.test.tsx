import { beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
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
import { Currencies, Language, Unit } from '../../../lib/types'
import ReceiveQRCode from '../../../screens/Wallet/Receive/QrCode'
import ReceiveSelector from '../../../screens/Wallet/Receive/ReceiveSelector'
import ReceiveParts from '../../../screens/Wallet/Receive/ReceiveParts'
import type { PartId, ReceivePart } from '../../../lib/receive/receiveTargets'
import { useState } from 'react'

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
                      <LimitsContext.Provider value={mockLimitsContextValue}>
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
    updateConfig.mockClear()
    backupConfig.mockClear()
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

      expect(updateConfig).toHaveBeenLastCalledWith(expect.objectContaining({ receiveQrForm: { full: 'invoice' } }))
      expect(copyToClipboardMock).not.toHaveBeenCalled()
    })

    it('keeps each copy button beside its radio row, where assistive tech still reaches it', async () => {
      renderReceiveQrCode(amountFixture('lnbc10u1ptest'))

      const copy = await screen.findByTestId('invoice-address-copy')
      expect(screen.getByRole('radio', { name: /Lightning invoice/ })).not.toContainElement(copy)
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

    it('floats the method list over the rows, leaving the QR its size, and closes it on Escape', async () => {
      const { container } = renderReceiveQrCode(amountFixture('lnbc10u1ptest'))
      const selector = await screen.findByRole('button', { name: /Showing/ })
      const stage = () => container.querySelector('.receive-invoice-stage')!
      const closed = stage().className

      fireEvent.click(selector)
      expect(selector).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('radio', { name: 'Arkade' })).toBeInTheDocument()
      expect(stage().className).toBe(closed)

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(selector).toHaveAttribute('aria-expanded', 'false')
      expect(selector).toHaveFocus()
      await waitFor(() => expect(screen.queryByRole('radio', { name: 'Arkade' })).not.toBeInTheDocument())
      expect(stage().className).toBe(closed)
    })

    it('closes the method list on a tap outside it, back on the button', async () => {
      renderReceiveQrCode(amountFixture('lnbc10u1ptest'))
      const selector = await screen.findByRole('button', { name: /Showing/ })

      fireEvent.click(selector)
      expect(screen.getByRole('radio', { name: 'Unified · Full details' })).toHaveFocus()
      fireEvent.click(screen.getByTestId('receive-selector-backdrop'))

      expect(selector).toHaveAttribute('aria-expanded', 'false')
      expect(selector).toHaveFocus()
    })

    it('closes the method list when keyboard focus leaves it, leaving focus where it went', async () => {
      renderReceiveQrCode(amountFixture('lnbc10u1ptest'))
      const selector = await screen.findByRole('button', { name: /Showing/ })
      fireEvent.click(selector)

      const outside = screen.getByRole('button', { name: 'Copy QR code' })
      act(() => outside.focus())

      expect(selector).toHaveAttribute('aria-expanded', 'false')
      expect(outside).toHaveFocus()
    })

    it.each([
      [false, true],
      [true, false],
    ])('returns focus to the button after a pick unless it opened a sheet (%s)', (opensSheet, focused) => {
      function Harness() {
        const [open, setOpen] = useState(true)
        const close = () => setOpen(false)
        const pick = () => {
          close()
          return opensSheet
        }
        const rows = [{ id: 'ark', title: 'Arkade' }]
        return (
          <ReceiveSelector
            label='Arkade'
            rows={rows}
            active='ark'
            open={open}
            onToggle={close}
            onClose={close}
            onPick={pick}
          />
        )
      }
      render(<Harness />)

      fireEvent.click(screen.getByRole('radio', { name: 'Arkade' }))

      expect(screen.getByRole('button', { name: /Showing/ }) === document.activeElement).toBe(focused)
    })

    it('moves focus through the methods with the arrow keys, without picking', () => {
      const onPick = vi.fn()
      const rows = ['Unified', 'Arkade', 'Bitcoin'].map((title) => ({ id: title, title }))
      render(
        <ReceiveSelector
          label='Arkade'
          rows={rows}
          active='Arkade'
          open
          onToggle={vi.fn()}
          onClose={vi.fn()}
          onPick={onPick}
        />,
      )
      const radio = (name: string) => screen.getByRole('radio', { name })
      const press = (key: string) => fireEvent.keyDown(document.activeElement!, { key })

      expect(radio('Arkade')).toHaveFocus()
      expect(rows.map((r) => radio(r.title).tabIndex)).toEqual([-1, 0, -1])
      press('ArrowDown')
      expect(radio('Bitcoin')).toHaveFocus()
      press('ArrowDown')
      expect(radio('Unified')).toHaveFocus()
      press('ArrowUp')
      expect(radio('Bitcoin')).toHaveFocus()
      press('Home')
      expect(radio('Unified')).toHaveFocus()
      press('End')
      expect(radio('Bitcoin')).toHaveFocus()
      expect(onPick).not.toHaveBeenCalled()
    })

    it('keeps the open method list under its button when anything scrolls', () => {
      let bottom = 100
      const rect = vi
        .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockImplementation(() => ({ bottom, left: 0, width: 200 }) as DOMRect)
      onTestFinished(() => {
        rect.mockRestore()
      })
      render(
        <ReceiveSelector
          label='Arkade'
          rows={[{ id: 'ark', title: 'Arkade' }]}
          active='ark'
          open
          onToggle={vi.fn()}
          onClose={vi.fn()}
          onPick={vi.fn()}
        />,
      )
      const list = screen.getByRole('radiogroup')
      expect(list.style.top).toBe('104px')

      bottom = 40
      act(() => {
        document.body.dispatchEvent(new Event('scroll'))
      })
      expect(list.style.top).toBe('44px')
    })

    it('moves the QR through the parts with the arrow keys, and only from a row', () => {
      const onShow = vi.fn()
      const parts: ReceivePart[] = [
        { id: 'amount', value: '1000', selectable: false },
        { id: 'link', value: 'bitcoin:x', selectable: true },
        { id: 'ark', value: 'ark1x', selectable: true },
        { id: 'btc', value: 'bc1x', selectable: true },
      ]
      const renderParts = (inQr?: PartId) => (
        <ReceiveParts
          method='full'
          label='Parts'
          parts={parts}
          titleOf={(x) => x.id}
          inQr={inQr}
          copied=''
          onShow={onShow}
          onCopy={vi.fn()}
        />
      )
      const { rerender } = render(renderParts())
      expect(screen.getAllByRole('radio').map((r) => r.tabIndex)).toEqual([0, -1, -1])

      rerender(renderParts('ark'))
      const radios = screen.getAllByRole('radio')
      expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1])
      const press = (key: string) => fireEvent.keyDown(document.activeElement!, { key })
      act(() => radios[1].focus())
      press('ArrowDown')
      expect(radios[2]).toHaveFocus()
      expect(onShow).toHaveBeenLastCalledWith('btc')
      press('ArrowDown')
      expect(radios[0]).toHaveFocus()
      expect(onShow).toHaveBeenLastCalledWith('link')
      press('End')
      expect(onShow).toHaveBeenLastCalledWith('btc')
      press('Home')
      expect(onShow).toHaveBeenLastCalledWith('link')

      onShow.mockClear()
      fireEvent.keyDown(screen.getByTestId('ark-address-copy'), { key: 'ArrowDown' })
      expect(onShow).not.toHaveBeenCalled()
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

    it.each([
      [Unit.BTC, 'Amount (BTC)', '0.0005'],
      [Unit.SATS, 'Amount (sats)', '50000'],
    ])('titles the amount row with its unit in %s and copies the bare value', async (unit, title, value) => {
      renderReceiveQrCode({
        ...amountFixture('lnbc10u1ptest'),
        config: { config: { ...mockConfigContextValue.config, unit } },
      })

      expect(await screen.findByText(title)).toBeInTheDocument()
      await act(async () => fireEvent.click(screen.getByTestId('amount-address-copy')))
      expect(copyToClipboardMock).toHaveBeenLastCalledWith(value)
    })

    it('groups the part rows as a radiogroup named for the method', async () => {
      renderReceiveQrCode(amountFixture('lnbc10u1ptest'))

      const group = await screen.findByRole('radiogroup', { name: 'Unified · Full details' })
      expect(group).toContainElement(screen.getByRole('radio', { name: /Lightning invoice/ }))
    })

    it('keeps assetid= in the asset QR whatever form plain Arkade receives remember', async () => {
      const assetId = 'ab'.repeat(32)
      renderReceiveQrCode({
        config: withQrForm({ ark: 'ark' }),
        flow: { recvInfo: { ...tapFixture().flow!.recvInfo!, assetId } },
        wallet: {
          svcWallet: mockSvcWallet as any,
          assetMetadataCache: new Map([[assetId, { metadata: { decimals: 2, ticker: 'TKN' } }]]) as any,
        },
      })
      await screen.findByTestId('ark-address-copy')

      expect(await clickQr()).toContain(`assetid=${assetId}`)
      expect(screen.queryByRole('radio')).not.toBeInTheDocument()
      fireEvent.click(screen.getByText('Arkade address'))
      expect(backupAndUpdateConfig).not.toHaveBeenCalled()
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

    await act(async () => {})
    const row = await screen.findByTestId('ark-address-copy')
    await act(async () => {
      fireEvent.click(row)
    })

    expect(await screen.findByText('Failed to copy')).toBeInTheDocument()
    expect(screen.getByTestId('ark-address-copy')).not.toHaveTextContent('MARKER-COPIED')
  })

  it('copies what the QR shows from the Copy button', async () => {
    renderReceiveQrCode(tapFixture())

    await clickQr()
    const shown = copyToClipboardMock.mock.calls.at(-1)?.[0]
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    })

    expect(copyToClipboardMock).toHaveBeenCalledTimes(2)
    expect(copyToClipboardMock).toHaveBeenLastCalledWith(shown)
  })
})
