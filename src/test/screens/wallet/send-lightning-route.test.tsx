import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeHandle } from '@arkade-os/sdk'
import SendDetails from '../../../screens/Wallet/Send/Details'
import SendForm from '../../../screens/Wallet/Send/Form'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FeesContext } from '../../../providers/fees'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, emptySendInfo, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { SwapsContext } from '../../../providers/swaps'
import { NavigationContext } from '../../../providers/navigation'
import { OptionsContext } from '../../../providers/options'
import { WalletContext } from '../../../providers/wallet'
import fixtures from '../../fixtures.json'
import { decodeInvoice } from '../../../lib/bolt11'
import { encodeBip21Asset } from '../../../lib/bip21'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockOptionsContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'

const consoleError = vi.fn()
vi.mock('../../../lib/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/logs')>()),
  consoleError: (...args: unknown[]) => consoleError(...args),
}))

let optionsFor: (req: { raw: string; amount?: number }) => unknown[] = () => []
let routerAsked = 0
/** The router the driving tab hands the screen, stubbed at the context seam. */
const swaps = {
  sendRouter: async () => {
    routerAsked += 1
    return { options: async (req: any) => optionsFor(req) }
  },
}

const discovered = vi.fn().mockResolvedValue([])
vi.mock('../../../lib/swapMarkets', () => ({
  discoverMarkets: () => discovered(),
}))

const INVOICE = fixtures.lib.bolt11.invoice
const ARK_ADDRESS = fixtures.lib.address.ark[0].address
const INVOICE_SATS = fixtures.lib.bolt11.amountSats

/** A negotiated Lightning route, as the send form hands it to the sign screen. */
const lnQuote = (over: { paymentHash?: string; total?: number } = {}, sent = vi.fn()) => ({
  railId: 'lightning',
  amount: INVOICE_SATS,
  fee: (over.total ?? INVOICE_SATS) - INVOICE_SATS,
  total: over.total ?? INVOICE_SATS,
  meta: { paymentHash: over.paymentHash ?? decodeInvoice(INVOICE).paymentHash },
  send: async () => {
    sent()
    // `sent` and nothing after it: the screen must return on that alone.
    return makeHandle('lightning', async (emit) => {
      emit({ status: 'sent', result: { railId: 'lightning', txid: 'funding-txid', swapId: 'rfq-1' } })
      return await new Promise<any>(() => {})
    })
  },
})

const setSendInfo = vi.fn()

const renderSign = (sendInfo: SendInfo) =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <FeesContext.Provider value={{ calcOnchainOutputFee: () => 500 } as never}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo, setSendInfo }}>
                <WalletContext.Provider
                  value={{ ...mockWalletContextValue, balance: 1_000_000, svcWallet: mockSvcWallet as never }}
                >
                  <SwapsContext.Provider value={swaps as never}>
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <SendDetails />
                    </LimitsContext.Provider>
                  </SwapsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </FeesContext.Provider>
          </AspContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>,
  )

const sign = async () => fireEvent.click(await screen.findByText('Tap to Sign'))

const sendFailure = () => consoleError.mock.calls.find((c) => c[1] === 'error sending payment')?.[0]

describe('signing a Lightning send', () => {
  beforeEach(() => {
    consoleError.mockClear()
    setSendInfo.mockClear()
    optionsFor = () => []
  })

  it('funds the route negotiated for the invoice on screen', async () => {
    const sent = vi.fn()
    const quote = lnQuote({}, sent)
    renderSign({ invoice: INVOICE, satoshis: INVOICE_SATS, pendingLnSend: quote as never })
    await sign()

    await waitFor(() => expect(sent).toHaveBeenCalledTimes(1))
    // The rail's own txid reaches the flow, which is what the receipt renders.
    await waitFor(() => expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ txid: 'funding-txid' })))
  })

  it('carries the quote’s total, not the amount typed', async () => {
    renderSign({ invoice: INVOICE, satoshis: INVOICE_SATS, pendingLnSend: lnQuote({ total: 2_200 }) as never })
    await sign()

    await waitFor(() => expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ total: 2_200 })))
  })

  it('never funds a route negotiated for a DIFFERENT invoice', async () => {
    const sent = vi.fn()
    const stale = lnQuote({ paymentHash: 'ab'.repeat(32) }, sent)
    renderSign({ invoice: INVOICE, satoshis: INVOICE_SATS, pendingLnSend: stale as never })
    await sign()

    await waitFor(() => expect(sendFailure()).toBeDefined())
    expect(String(sendFailure())).toMatch(/different invoice/i)
    expect(sent).not.toHaveBeenCalled()
  })

  it('reports a rail that refused to fund rather than reporting a sent payment', async () => {
    const quote = {
      ...lnQuote(),
      send: async () =>
        makeHandle('lightning', async () => {
          throw new Error('Quote expired — go back and try again')
        }),
    }
    renderSign({ invoice: INVOICE, satoshis: INVOICE_SATS, pendingLnSend: quote as never })
    await sign()

    await waitFor(() => expect(sendFailure()).toBeDefined())
    expect(String(sendFailure())).toMatch(/Quote expired/)
  })
})

describe('signing an asset send', () => {
  const assets = [{ assetId: 'usdt', amount: BigInt(500) }]

  const assetOption = (sent: (address: string) => void) => (req: { raw: string }) => [
    {
      railId: 'asset',
      quote: async () => ({
        railId: 'asset',
        amount: 0,
        fee: 0,
        total: 0,
        send: async () => {
          sent(req.raw)
          return { settled: async () => ({ railId: 'asset', txid: 'asset-txid' }) }
        },
      }),
    },
  ]

  beforeEach(() => {
    consoleError.mockClear()
    setSendInfo.mockClear()
    optionsFor = () => []
  })

  it('routes to the ark address the screen is showing', async () => {
    const sent = vi.fn()
    optionsFor = assetOption(sent)
    renderSign({ arkAddress: ARK_ADDRESS, assets })
    await sign()

    await waitFor(() => expect(sent).toHaveBeenCalledWith(ARK_ADDRESS))
    await waitFor(() => expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ txid: 'asset-txid' })))
  })

  it('reports a failure rather than a send when no rail took it', async () => {
    optionsFor = () => []
    renderSign({ arkAddress: ARK_ADDRESS, assets })
    await sign()

    await waitFor(() => expect(sendFailure()).toBeDefined())
    expect(String(sendFailure())).toMatch(/No route/i)
  })
})

/** Addresses that resolve: the form white-screens on a receiving-address
 *  failure, which `mockSvcWallet`'s empty strings trigger. */
const formWallet = { ...mockSvcWallet, getAddress: async () => 'ark1self', getBoardingAddress: async () => 'bcrt1self' }

const renderForm = (initial: SendInfo, wallet: Partial<typeof mockWalletContextValue> = {}) => {
  function ControlledForm() {
    const [currentSendInfo, setCurrentSendInfo] = useState(initial)
    return (
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <ConfigContext.Provider value={mockConfigContextValue as never}>
            <FiatContext.Provider value={mockFiatContextValue as never}>
              <OptionsContext.Provider value={mockOptionsContextValue as never}>
                <FlowContext.Provider
                  value={{
                    ...mockFlowContextValue,
                    sendInfo: currentSendInfo,
                    setSendInfo: (next) => {
                      setSendInfo(next)
                      setCurrentSendInfo(next)
                    },
                  }}
                >
                  <WalletContext.Provider
                    value={{
                      ...mockWalletContextValue,
                      balance: 1_000_000,
                      availableBalance: 1_000_000,
                      svcWallet: formWallet as never,
                      ...wallet,
                    }}
                  >
                    <SwapsContext.Provider value={swaps as never}>
                      <LimitsContext.Provider value={mockLimitsContextValue}>
                        <FeesContext.Provider value={{ calcOnchainOutputFee: () => 500 } as never}>
                          <SendForm />
                        </FeesContext.Provider>
                      </LimitsContext.Provider>
                    </SwapsContext.Provider>
                  </WalletContext.Provider>
                </FlowContext.Provider>
              </OptionsContext.Provider>
            </FiatContext.Provider>
          </ConfigContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>
    )
  }
  return render(<ControlledForm />)
}

const cont = async () => fireEvent.click(await screen.findByText('Continue'))

describe('starting a Lightning send', () => {
  it('passes the original invoice and amount to review before looking for a route', async () => {
    setSendInfo.mockClear()
    discovered.mockClear()
    routerAsked = 0
    renderForm({ invoice: INVOICE, satoshis: INVOICE_SATS })
    await cont()

    await waitFor(() =>
      expect(setSendInfo).toHaveBeenCalledWith(
        expect.objectContaining({ invoice: INVOICE, satoshis: INVOICE_SATS, reviewId: expect.any(String) }),
      ),
    )
    expect(routerAsked).toBe(0)
    expect(discovered).not.toHaveBeenCalled()
  })

  it('lets a wallet with spendable assets review the fixed invoice when its BTC balance is too low', async () => {
    const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks')
    Object.defineProperty(navigator, 'locks', { value: { request: vi.fn() }, configurable: true })
    try {
      setSendInfo.mockClear()
      const assetId = '12'.repeat(32) + '0000'
      const holdings = [{ assetId, amount: 50n }]
      renderForm(
        { invoice: INVOICE, satoshis: INVOICE_SATS },
        {
          balance: 330,
          availableBalance: 330,
          assetBalances: holdings as never,
          availableAssetBalances: holdings as never,
        },
      )
      const proceed = await screen.findByRole('button', { name: 'Continue' })
      expect(proceed).toBeEnabled()
      fireEvent.click(proceed)
      await waitFor(() =>
        expect(setSendInfo).toHaveBeenCalledWith(
          expect.objectContaining({ invoice: INVOICE, satoshis: INVOICE_SATS, reviewId: expect.any(String) }),
        ),
      )
    } finally {
      if (originalLocks) Object.defineProperty(navigator, 'locks', originalLocks)
      else Reflect.deleteProperty(navigator, 'locks')
    }
  })
})

describe('starting an exact asset payment', () => {
  it('offers review for an exact payment request the wallet does not hold', async () => {
    setSendInfo.mockClear()
    const assetId = '12'.repeat(32) + '0000'
    const decimals = 2
    const amount = 123n
    const metadata = { assetId, supply: 10_000n, metadata: { name: 'Test asset', ticker: 'TST', decimals } }
    const unmoderated = { ...metadata, metadata: { ...metadata.metadata, icon: 'https://example.com/icon.png' } }
    const setCacheEntry = vi.fn(() => ({ ...metadata, cachedAt: 0 }))
    const request = encodeBip21Asset(ARK_ADDRESS, assetId, amount, decimals)
    const { container } = renderForm(emptySendInfo, {
      setCacheEntry,
      svcWallet: {
        ...formWallet,
        getAddress: async () => ARK_ADDRESS,
        assetManager: { getAssetDetails: async () => unmoderated },
      } as never,
    })
    const recipient = container.querySelector('input[name="send-address"]')!
    fireEvent.change(recipient, { target: { value: request } })

    expect(await screen.findByText('Pay with', undefined, { timeout: 3000 })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled())
    expect(screen.getByTestId('asset-selector')).toHaveTextContent('Bitcoin')
    expect(screen.getByText('Recipient gets')).toBeInTheDocument()
    expect(screen.getByTestId('send-recipient-asset')).toHaveTextContent('Test asset (TST)')
    expect(setCacheEntry).toHaveBeenCalledWith(assetId, unmoderated)
    expect(container.querySelector('img[src="https://example.com/icon.png"]')).toBeNull()
    expect(container.querySelector('input[name="send-amount"]')).toHaveValue(1.23)
    expect(container.querySelector('input[name="send-amount"]')).toHaveAttribute('readonly')
    await cont()
    expect(setSendInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: request,
        assetPayment: { address: ARK_ADDRESS, assetId, amount, fromAssetId: 'btc' },
        reviewId: expect.any(String),
      }),
    )
  })

  it.each(['requested asset', 'Bitcoin'])('keeps the recipient amount fixed when paying with %s', async (source) => {
    setSendInfo.mockClear()
    const assetId = '12'.repeat(32) + '0000'
    const metadata = { assetId, supply: 10_000n, metadata: { name: 'Test asset', ticker: 'TST', decimals: 2 } }
    const amount = 123n
    const request = encodeBip21Asset(ARK_ADDRESS, assetId, amount, 2)
    const holdings = [{ assetId, amount: 300n }] as never
    const { container } = renderForm(
      { ...emptySendInfo, recipient: request, reviewId: 'existing-review' },
      {
        assetBalances: holdings,
        availableAssetBalances: holdings,
        assetMetadataCache: new Map([[assetId, metadata]]),
        svcWallet: { ...formWallet, getAddress: async () => ARK_ADDRESS } as never,
      },
    )
    const user = userEvent.setup()
    const picker = await screen.findByTestId('asset-selector')
    expect(picker).toHaveTextContent(/TST/)
    if (source === 'Bitcoin') {
      await user.click(picker)
      await user.click(await screen.findByRole('menuitem', { name: /Bitcoin/ }))
      expect(picker).toHaveTextContent('Bitcoin')
    }
    expect(container.querySelector('input[name="send-amount"]')).toHaveValue(1.23)
    await cont()
    expect(setSendInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: request,
        assets: [{ assetId, amount }],
        assetPayment: source === 'Bitcoin' ? { address: ARK_ADDRESS, assetId, amount, fromAssetId: 'btc' } : undefined,
        reviewId: 'existing-review',
      }),
    )
  })

  it('discards a stale asset-link parse when the recipient changes during metadata lookup', async () => {
    setSendInfo.mockClear()
    const oldAssetId = '12'.repeat(32) + '0000'
    const assetId = '34'.repeat(32) + '0000'
    const amount = 20n
    const old = { assetId: oldAssetId, supply: 10_000n, metadata: { name: 'Old token', ticker: 'OLD', decimals: 0 } }
    const current = { assetId, supply: 10_000n, metadata: { name: 'New token', ticker: 'NEW', decimals: 0 } }
    const request = encodeBip21Asset(ARK_ADDRESS, assetId, amount, 0)
    let resolveOld!: (metadata: typeof old) => void
    const fetchOld = vi.fn(
      () =>
        new Promise<typeof old>((resolve) => {
          resolveOld = resolve
        }),
    )
    const { container } = renderForm(
      { ...emptySendInfo, recipient: encodeBip21Asset(ARK_ADDRESS, oldAssetId, 30n, 0), reviewId: 'old-review' },
      {
        assetMetadataCache: new Map([[assetId, current]]),
        svcWallet: {
          ...formWallet,
          getAddress: async () => ARK_ADDRESS,
          assetManager: { getAssetDetails: fetchOld },
        } as never,
      },
    )
    await waitFor(() => expect(fetchOld).toHaveBeenCalledWith(oldAssetId))
    fireEvent.change(container.querySelector('input[name="send-address"]')!, { target: { value: request } })
    await act(async () => resolveOld(old))
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    expect(await screen.findByText('Pay with', undefined, { timeout: 3000 })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled())
    expect(container.querySelector('input[name="send-amount"]')).toHaveValue(20)
    await cont()
    expect(setSendInfo).toHaveBeenCalledWith(
      expect.objectContaining({ assetPayment: { address: ARK_ADDRESS, assetId, amount, fromAssetId: 'btc' } }),
    )
  })
})

describe('starting an asset payment with an editable amount', () => {
  const assetId = '98'.repeat(32) + '0000'
  const amount = 175n
  const metadata = { assetId, supply: 10_000n, metadata: { name: 'Gucci', ticker: 'GUCCI', decimals: 2 } }
  const request = encodeBip21Asset(ARK_ADDRESS, assetId, 0n, 2)
  const wallet = {
    assetMetadataCache: new Map([[assetId, metadata]]),
    svcWallet: { ...formWallet, getAddress: async () => ARK_ADDRESS } as never,
  }

  it.each([request, request.replace('&amount=0', '')])(
    'funds a link without a positive amount from Bitcoin',
    async (link) => {
      setSendInfo.mockClear()
      const { container } = renderForm(emptySendInfo, wallet)
      fireEvent.change(container.querySelector('input[name="send-address"]')!, { target: { value: link } })

      const picker = await screen.findByTestId('asset-selector', undefined, { timeout: 3000 })
      const input = screen.getByRole('spinbutton', { name: 'Recipient gets Gucci (GUCCI)' })
      expect(screen.getByText('Pay with')).toBeInTheDocument()
      expect(picker).toHaveTextContent('Bitcoin')
      expect(screen.getByText('Recipient gets')).toBeInTheDocument()
      expect(input).not.toHaveAttribute('readonly')
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()

      fireEvent.change(input, { target: { value: '1.75' } })
      await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled())
      await cont()
      expect(setSendInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: link,
          satoshis: 0,
          assets: [{ assetId, amount }],
          assetPayment: { address: ARK_ADDRESS, assetId, amount, fromAssetId: 'btc' },
        }),
      )
    },
  )

  it('keeps Bitcoin selected after switching from a held asset and editing the amount', async () => {
    setSendInfo.mockClear()
    const holdings = [{ assetId, amount: 300n }] as never
    const { container } = renderForm(
      { ...emptySendInfo, recipient: request },
      { ...wallet, assetBalances: holdings, availableAssetBalances: holdings },
    )
    const input = container.querySelector('input[name="send-amount"]')!
    const picker = await screen.findByTestId('asset-selector')
    expect(picker).toHaveTextContent('GUCCI')
    fireEvent.change(input, { target: { value: '1.25' } })
    const user = userEvent.setup()
    await user.click(picker)
    await user.click(await screen.findByRole('menuitem', { name: /Bitcoin/ }))
    expect(picker).toHaveTextContent('Bitcoin')
    expect(input).toHaveValue(1.25)

    fireEvent.change(input, { target: { value: '1.75' } })
    expect(picker).toHaveTextContent('Bitcoin')
    await cont()
    expect(setSendInfo).toHaveBeenCalledWith(
      expect.objectContaining({ assetPayment: { address: ARK_ADDRESS, assetId, amount, fromAssetId: 'btc' } }),
    )
  })

  it('restores the entered amount and Bitcoin funding when returning from review', async () => {
    const { container } = renderForm(
      {
        ...emptySendInfo,
        recipient: request,
        arkAddress: ARK_ADDRESS,
        assets: [{ assetId, amount }],
        assetPayment: { address: ARK_ADDRESS, assetId, amount, fromAssetId: 'btc' },
        reviewId: 'existing-review',
      },
      wallet,
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled())
    expect(screen.getByTestId('asset-selector')).toHaveTextContent('Bitcoin')
    expect(container.querySelector('input[name="send-amount"]')).toHaveValue(1.75)
  })
})
