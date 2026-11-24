import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../lib/appIntent', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/appIntent')>('../../../lib/appIntent')
  return { ...actual, redirectToCallback: vi.fn() }
})

const { verifyMock } = vi.hoisted(() => ({ verifyMock: vi.fn() }))
vi.mock('@branta-ops/branta', async () => {
  const actual = await vi.importActual<typeof import('@branta-ops/branta')>('@branta-ops/branta')
  // every render runs the lookup, so an unconfigured call must still resolve
  const unknown = { status: actual.VerifyStatus.Unknown, verifyUrl: 'https://guardrail.branta.pro/v2/verify/none' }
  return {
    ...actual,
    BrantaService: class {
      verify = (input: string) => Promise.resolve(verifyMock(input) ?? unknown)
    },
  }
})
vi.mock('../../../lib/directTaxiSend', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/directTaxiSend')>('../../../lib/directTaxiSend')
  return {
    ...actual,
    getPendingAssetPayment: vi.fn(async () => undefined),
    getPendingDirectTaxi: vi.fn(),
    sendDirectTaxi: vi.fn(),
  }
})
vi.mock('../../../lib/assetRfqSend', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/assetRfqSend')>('../../../lib/assetRfqSend')
  return { ...actual, payAssetRequest: vi.fn() }
})
import { payAssetRequest, PaymentDeclined } from '../../../lib/assetRfqSend'
import { encodeBip21Asset } from '../../../lib/bip21'
import {
  FailedDirectTaxi,
  PendingDirectTaxi,
  ReturnedDirectTaxi,
  getPendingAssetPayment,
  getPendingDirectTaxi,
  sendDirectTaxi,
} from '../../../lib/directTaxiSend'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { ArkAddress, SingleKey } from '@arkade-os/sdk'

vi.mock('../../../components/SheetModal', () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) =>
    isOpen ? <div data-testid='sheet-modal'>{children}</div> : null,
}))
import userEvent from '@testing-library/user-event'
import createFetchMock from 'vitest-fetch-mock'
import { emptySendInfo, FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
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
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { redirectToCallback } from '../../../lib/appIntent'
import type { Outcome } from '@arkade-os/swap'
import SendForm from '../../../screens/Wallet/Send/Form'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { OptionsContext } from '../../../providers/options'
import { SwapsContext } from '../../../providers/swaps'
import { createSendRouter, LNURL_ARKADE_RAIL, LNURL_LIGHTNING_RAIL } from '../../../lib/sendRouter'
import { Currencies, Unit } from '../../../lib/types'
import fixtures from '../../fixtures.json'
import { saveContact, sendDestination } from '../../../lib/contacts'
import { fromSatoshis, prettyNumber } from '@/lib/format'

type TreeOptions = {
  aspContext?: typeof mockAspContextValue
  configContext?: unknown
  fiatContext?: unknown
  flowContext?: unknown
  walletContext?: unknown
  swapsContext?: unknown
  navigationContext?: typeof mockNavigationContextValue
  outcomeOf?: (id: string) => Outcome | undefined
}

const sendFormTree = ({
  aspContext = mockAspContextValue,
  configContext = mockConfigContextValue,
  fiatContext = mockFiatContextValue,
  flowContext = mockFlowContextValue,
  walletContext = { ...mockWalletContextValue, svcWallet: mockSvcWallet as any },
  swapsContext,
  navigationContext = mockNavigationContextValue,
  outcomeOf,
}: TreeOptions = {}) => (
  <NavigationContext.Provider value={navigationContext}>
    <AspContext.Provider value={aspContext}>
      <ConfigContext.Provider value={configContext as any}>
        <FiatContext.Provider value={fiatContext as any}>
          <OptionsContext.Provider value={mockOptionsContextValue as any}>
            <FlowContext.Provider value={flowContext as any}>
              <WalletContext.Provider value={walletContext as any}>
                {swapsContext || outcomeOf ? (
                  <SwapsContext.Provider
                    value={{ ...(swapsContext as object), ...(outcomeOf ? { outcomeOf } : {}) } as any}
                  >
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <SendForm />
                    </LimitsContext.Provider>
                  </SwapsContext.Provider>
                ) : (
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <SendForm />
                  </LimitsContext.Provider>
                )}
              </WalletContext.Provider>
            </FlowContext.Provider>
          </OptionsContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>
    </AspContext.Provider>
  </NavigationContext.Provider>
)

describe('Send screen', () => {
  const sendForm = sendFormTree
  beforeEach(() => {
    vi.mocked(getPendingAssetPayment).mockReset().mockResolvedValue(undefined)
    vi.mocked(getPendingDirectTaxi).mockReset().mockResolvedValue(undefined)
    vi.mocked(sendDirectTaxi).mockReset()
    vi.mocked(payAssetRequest).mockReset()
    vi.mocked(redirectToCallback).mockClear()
  })
  const renderSendForm = (options: TreeOptions = {}) => render(sendFormTree(options))

  it('fills the recipient from a saved contact picker', async () => {
    const address = 'alice@pay.example'
    saveContact(address, 'Alice')
    renderSendForm()
    fireEvent.click(screen.getByRole('button', { name: 'Contacts' }))
    fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
    await waitFor(() =>
      expect(document.querySelector<HTMLInputElement>('input[name="send-address"]')?.value).toBe(address),
    )
  })
  it('fills the amount field when an LNURL resolves to a fixed amount', async () => {
    // regression: a fixed-amount LNURL (minSendable === maxSendable) must
    // populate the read-only amount input instead of leaving it blank
    const fetchMocker = createFetchMock(vi)
    fetchMocker.enableMocks()
    fetchMocker.mockResponseOnce(
      JSON.stringify({
        tag: 'payRequest',
        callback: 'https://pay.staging.galoy.io/.well-known/lnurlp/testing',
        minSendable: 21000, // millisatoshis -> 21 sats
        maxSendable: 21000,
        metadata: 'mock-metadata',
      }),
    )
    const lnUrl = 'lnurl1dp68gurn8ghj7urp0yh8xarpva5kueewvaskcmme9e5k7tewwajkcmpdddhx7amw9akxuatjd3cz7ar9wd6xjmn8h9qlv7'
    const flowValue = { ...mockFlowContextValue, sendInfo: { ...emptySendInfo, lnUrl, recipient: lnUrl } }
    const walletValue = {
      ...mockWalletContextValue,
      balance: 1_000_000,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        getBalance: () => Promise.resolve({ available: 1_000_000 }),
      } as any,
    }
    renderSendForm({ flowContext: flowValue, walletContext: walletValue })
    // amount input is bound to amountTextValue; before the fix it stayed
    // empty. Entry defaults to the display currency when conversion is
    // available, so the mock's 1:1 rate renders the fixed 21 sats as 21.
    const amountInput = await waitFor(() => screen.getByDisplayValue('21'))
    expect(amountInput).toHaveAttribute('name', 'send-amount')
    expect(amountInput).toHaveAttribute('readonly')
    fetchMocker.disableMocks()
  })

  it('refuses an LNURL invoice whose amount differs from the one requested', async () => {
    const requested = fixtures.lib.bolt11.amountSats + 100
    const fetchMocker = createFetchMock(vi)
    fetchMocker.enableMocks()
    fetchMocker.mockResponse((req) =>
      JSON.stringify(
        req.url.includes('amount=')
          ? { pr: fixtures.lib.bolt11.invoice }
          : {
              tag: 'payRequest',
              callback: 'https://pay.staging.galoy.io/.well-known/lnurlp/testing',
              minSendable: requested * 1000,
              maxSendable: requested * 1000,
              metadata: 'mock-metadata',
            },
      ),
    )
    const lnUrl = 'lnurl1dp68gurn8ghj7urp0yh8xarpva5kueewvaskcmme9e5k7tewwajkcmpdddhx7amw9akxuatjd3cz7ar9wd6xjmn8h9qlv7'
    const setSendInfo = vi.fn()
    const flowValue = {
      ...mockFlowContextValue,
      sendInfo: { ...emptySendInfo, lnUrl, recipient: lnUrl, satoshis: requested },
      setSendInfo,
    }
    const walletValue = {
      ...mockWalletContextValue,
      balance: 1_000_000,
      availableBalance: 1_000_000,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        getBalance: () => Promise.resolve({ available: 1_000_000 }),
      } as any,
    }
    // A lightning leg that is never reached: the client refuses the invoice first.
    const sendRouter = vi.fn(async () => createSendRouter({ wallet: walletValue.svcWallet, client: {} as never }))
    renderSendForm({ flowContext: flowValue, walletContext: walletValue, swapsContext: { sendRouter } })
    await waitFor(() => screen.getByDisplayValue(String(requested)))
    const continueButton = screen.getByText('Continue').closest('button')!
    await waitFor(() => expect(continueButton).toBeEnabled())
    fireEvent.click(continueButton)

    expect(await screen.findByTestId('error-message')).toHaveTextContent(/not the requested/)
    expect(sendRouter).toHaveBeenCalled()
    const updates = setSendInfo.mock.calls.map(([update]) =>
      typeof update === 'function' ? update(flowValue.sendInfo) : update,
    )
    expect(updates.some((next) => next.invoice || next.pendingLnSend)).toBe(false)
    fetchMocker.disableMocks()
  })

  it('hands the sign screen the router’s quote for an LNURL target, Arkade leg first', async () => {
    const satoshis = 5_000
    const arkAddress = fixtures.lib.address.ark[0].address
    const fetchMocker = createFetchMock(vi)
    fetchMocker.enableMocks()
    fetchMocker.mockResponse((req) =>
      JSON.stringify(
        req.url.includes('paymentOption=')
          ? { paymentOption: 'ark', paymentDestination: arkAddress }
          : {
              tag: 'payRequest',
              callback: 'https://pay.example/cb',
              minSendable: satoshis * 1000,
              maxSendable: satoshis * 1000,
              metadata: '[]',
              paymentOptions: [
                { id: 'ln', type: 'lightning' },
                { id: 'ark', type: 'arkade' },
              ],
            },
      ),
    )
    const lnUrl = 'alice@pay.example'
    const setSendInfo = vi.fn()
    const flowValue = {
      ...mockFlowContextValue,
      sendInfo: { ...emptySendInfo, lnUrl, recipient: lnUrl, satoshis },
      setSendInfo,
    }
    const svcWallet = {
      ...mockSvcWallet,
      getAddress: () => 'tark1mockoffchain',
      getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
    } as any
    const walletValue = { ...mockWalletContextValue, balance: 1_000_000, availableBalance: 1_000_000, svcWallet }
    const sendRouter = async () => createSendRouter({ wallet: svcWallet })
    renderSendForm({ flowContext: flowValue, walletContext: walletValue, swapsContext: { sendRouter } })
    await waitFor(() => screen.getByDisplayValue(String(satoshis)))
    const continueButton = screen.getByText('Continue').closest('button')!
    await waitFor(() => expect(continueButton).toBeEnabled())
    fireEvent.click(continueButton)

    await waitFor(() => expect(setSendInfo).toHaveBeenCalledWith(expect.any(Function)))
    const next = setSendInfo.mock.calls.map(([u]) => (typeof u === 'function' ? u(flowValue.sendInfo) : u)).at(-1)
    expect(next.pendingLnSend).toMatchObject({ railId: LNURL_ARKADE_RAIL, amount: satoshis, total: satoshis })
    expect(next.pendingLnSend.meta.lnurl).toMatchObject({ target: lnUrl })
    expect(next).toMatchObject({ arkAddress: undefined, invoice: undefined })
    fetchMocker.disableMocks()
  })

  it('never re-parses the toggled amount with the previous denomination', async () => {
    // regression: the ⇅ switch used to push re-expressed text through
    // onChange before the parent's mode state updated, so a $10 entry
    // re-parsed as raw sats (or vice versa) and signed a wrong amount
    const setSendInfo = vi.fn()
    const flowValue = { ...mockFlowContextValue, sendInfo: { ...emptySendInfo }, setSendInfo }
    const configValue = {
      ...mockConfigContextValue,
      useFiat: true,
      config: { ...mockConfigContextValue.config, currency: Currencies.USD, unit: Unit.SATS },
    }
    const fiatValue = {
      ...mockFiatContextValue,
      toFiat: (satoshis?: number) => Number(((satoshis ?? 0) / 1000).toFixed(2)),
      fromFiat: (fiat?: number) => Math.floor((fiat ?? 0) * 1000),
      fiatDecimals: () => 2,
    }
    const walletValue = {
      ...mockWalletContextValue,
      availableBalance: 1_000_000,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
      } as any,
    }
    renderSendForm({
      configContext: configValue,
      fiatContext: fiatValue,
      flowContext: flowValue,
      walletContext: walletValue,
    })

    // entry defaults to the display currency: typing 10 means $10 -> 10,000 sats
    const amountInput = document.querySelector('input[name="send-amount"]') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '10' } })
    expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ satoshis: 10_000 }))

    fireEvent.click(screen.getByTestId('input-amount-switch'))
    const storedSatoshis = setSendInfo.mock.calls.map(([payload]) => payload?.satoshis)
    expect(storedSatoshis).not.toContain(10_000_000) // the fiat text parsed as sats
    expect(storedSatoshis).toEqual([10_000]) // the toggle itself stores nothing
  })

  it('re-expresses the field from the stored satoshis when toggling denomination', async () => {
    const setSendInfo = vi.fn()
    const flowValue = { ...mockFlowContextValue, sendInfo: { ...emptySendInfo, satoshis: 10_000 }, setSendInfo }
    const configValue = {
      ...mockConfigContextValue,
      useFiat: true,
      config: { ...mockConfigContextValue.config, currency: Currencies.USD, unit: Unit.SATS },
    }
    const fiatValue = {
      ...mockFiatContextValue,
      toFiat: (satoshis?: number) => Number(((satoshis ?? 0) / 1000).toFixed(2)),
      fromFiat: (fiat?: number) => Math.floor((fiat ?? 0) * 1000),
      fiatDecimals: () => 2,
    }
    const walletValue = {
      ...mockWalletContextValue,
      availableBalance: 1_000_000,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
      } as any,
    }
    renderSendForm({
      configContext: configValue,
      fiatContext: fiatValue,
      flowContext: flowValue,
      walletContext: walletValue,
    })

    // fiat entry starts empty; switching to unit derives the text from the
    // authoritative sats without touching what will be sent
    fireEvent.click(screen.getByTestId('input-amount-switch'))
    await waitFor(() => screen.getByDisplayValue('10000'))
    expect(setSendInfo).not.toHaveBeenCalled()
  })

  it('shows BTC units on the send amount field when currency and bitcoin unit are BTC', async () => {
    const walletValue = {
      ...mockWalletContextValue,
      availableBalance: 12128,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
      } as any,
    }
    const configValue = {
      ...mockConfigContextValue,
      useFiat: false,
      config: { ...mockConfigContextValue.config, currency: Currencies.BTC, unit: Unit.BTC },
    }

    renderSendForm({ configContext: configValue, walletContext: walletValue })

    await waitFor(() => screen.getByText('0.00012128 BTC available'), { timeout: 2000 })
    expect(screen.queryByText('0.00012128 BTC available')).toBeInTheDocument()
    expect(screen.queryByText('12,128 sats available')).not.toBeInTheDocument()
  })

  it('shows sats units on the send amount field when currency is BTC and bitcoin unit is sats', async () => {
    const walletValue = {
      ...mockWalletContextValue,
      availableBalance: 12128,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
      } as any,
    }
    const configValue = {
      ...mockConfigContextValue,
      useFiat: true,
      config: { ...mockConfigContextValue.config, currency: Currencies.BTC, unit: Unit.SATS },
    }

    renderSendForm({ configContext: configValue, walletContext: walletValue })

    await waitFor(() => screen.getByText('12,128 sats available'), { timeout: 2000 })
    expect(screen.queryByTestId('input-amount-switch')).not.toBeInTheDocument()
    expect(screen.queryByText('0.00012128 BTC available')).not.toBeInTheDocument()
    expect(screen.queryByText('12,128 sats available')).toBeInTheDocument()
  })

  it('shows BTC as the secondary send amount when fiat currency uses BTC as the bitcoin unit', async () => {
    const walletValue = {
      ...mockWalletContextValue,
      availableBalance: 12128,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
      } as any,
    }
    const configValue = {
      ...mockConfigContextValue,
      useFiat: true,
      config: { ...mockConfigContextValue.config, currency: Currencies.USD, unit: Unit.BTC },
    }
    const fiatValue = {
      ...mockFiatContextValue,
      toFiat: (satoshis?: number) => Number(((satoshis ?? 0) / 1000).toFixed(2)),
      fromFiat: (fiat?: number) => Math.floor((fiat ?? 0) * 1000),
      fiatDecimals: () => 2,
    }

    renderSendForm({ configContext: configValue, fiatContext: fiatValue, walletContext: walletValue })

    const amountInput = document.querySelector('input[name="send-amount"]') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '10' } })

    expect(await screen.findByText('0.00010000 BTC')).toBeInTheDocument()
    expect(screen.queryByText('10,000 sats')).not.toBeInTheDocument()
  })

  it('keeps send in bitcoin units when currency conversion is unavailable', () => {
    const configValue = {
      ...mockConfigContextValue,
      useFiat: true,
      config: { ...mockConfigContextValue.config, currency: Currencies.USD, unit: Unit.SATS },
    }
    const unavailableCurrency = {
      ...mockFiatContextValue,
      toFiat: () => 0,
      fromFiat: () => 0,
      fromFiatAmount: () => 0,
      toFiatAmount: () => 0,
    }

    renderSendForm({
      configContext: configValue,
      fiatContext: unavailableCurrency,
      walletContext: {
        ...mockWalletContextValue,
        assetBalances: [],
        svcWallet: {
          ...mockSvcWallet,
          getAddress: () => 'tark1mockoffchain',
          getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        } as any,
      },
    })

    expect(screen.queryByTestId('input-amount-switch')).not.toBeInTheDocument()
    expect(screen.getByText('sats')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/[$€]/)
  })

  it('converts typed BTC send amounts to satoshis before updating send state', async () => {
    const setSendInfo = vi.fn()
    const walletValue = {
      ...mockWalletContextValue,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        getBalance: () => Promise.resolve({ available: 1_000_000 }),
      } as any,
    }
    const configValue = {
      ...mockConfigContextValue,
      useFiat: false,
      config: { ...mockConfigContextValue.config, currency: Currencies.BTC, unit: Unit.BTC },
    }

    renderSendForm({
      configContext: configValue,
      flowContext: { ...mockFlowContextValue, setSendInfo },
      walletContext: walletValue,
    })

    const amountInput = document.querySelector('input[name="send-amount"]') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '0.0001' } })

    await waitFor(() => expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ satoshis: 10000 })))
  })

  it('avoid mixed amounts in invoice and satoshis field', async () => {
    // a 2100 sats lightning invoice
    const INVOICE = fixtures.lib.bolt11.invoice
    const INVOICE_SATS = fixtures.lib.bolt11.amountSats
    const BTC_ADDRESS = fixtures.lib.address.btc[5]

    const sats2btc = (sats: number) => prettyNumber(fromSatoshis(sats), 8, false)

    let currentSendInfo: SendInfo = emptySendInfo
    const walletValue = {
      ...mockWalletContextValue,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        getBalance: () => Promise.resolve({ available: 1_000_000 }),
      } as any,
    }
    const configValue = {
      ...mockConfigContextValue,
      useFiat: false,
      config: { ...mockConfigContextValue.config, currency: Currencies.BTC, unit: Unit.BTC },
    }

    const StatefulForm = () => {
      const [sendInfo, setSendInfo] = useState<SendInfo>(emptySendInfo)
      currentSendInfo = sendInfo
      return sendFormTree({
        configContext: configValue,
        flowContext: { ...mockFlowContextValue, sendInfo, setSendInfo },
        walletContext: walletValue,
      })
    }

    render(<StatefulForm />)

    const addressInput = document.querySelector('input[name="send-address"]') as HTMLInputElement
    const amountInput = document.querySelector('input[name="send-amount"]') as HTMLInputElement

    // lightning= carries a malformed invoice alongside a valid address=
    fireEvent.change(addressInput, { target: { value: `bitcoin:${BTC_ADDRESS}?lightning=malformedinvoice` } })
    await waitFor(() => {
      expect(currentSendInfo.recipient).toBe(`bitcoin:${BTC_ADDRESS}?lightning=malformedinvoice`)
      expect(currentSendInfo.invoice).toBeUndefined()
      expect(currentSendInfo.satoshis).toBe(0)
      expect(amountInput.value).toBe('')
    })

    // URI with both lightning and amount: amount is ignored, invoice takes precedence
    fireEvent.change(addressInput, { target: { value: `bitcoin:${BTC_ADDRESS}?lightning=${INVOICE}&amount=0.0001` } })
    await waitFor(() => {
      expect(amountInput.value).toBe(sats2btc(INVOICE_SATS))
      expect(currentSendInfo.satoshis).toBe(INVOICE_SATS)
      expect(currentSendInfo.invoice).toBe(INVOICE)
    })

    // Amount-only URI (no invoice): should clear invoice and update satoshis
    fireEvent.change(addressInput, { target: { value: `bitcoin:${BTC_ADDRESS}?amount=0.0001` } })
    await waitFor(() => {
      expect(amountInput.value).toBe('0.0001')
      expect(currentSendInfo.invoice).toBeUndefined()
      expect(currentSendInfo.satoshis).toBe(10000)
    })

    // Invoice-only URI starts with a different displayed and stored amount.
    fireEvent.change(addressInput, { target: { value: `bitcoin:${BTC_ADDRESS}?lightning=${INVOICE}` } })
    await waitFor(() => {
      expect(amountInput.value).toBe(sats2btc(INVOICE_SATS))
      expect(currentSendInfo.satoshis).toBe(INVOICE_SATS)
      expect(currentSendInfo.invoice).toBe(INVOICE)
    })

    // The same invoice with a conflicting BIP21 amount must be revalidated.
    fireEvent.change(addressInput, { target: { value: `bitcoin:${BTC_ADDRESS}?lightning=${INVOICE}&amount=0.0001` } })
    await waitFor(() => {
      expect(currentSendInfo.recipient).toBe(`bitcoin:${BTC_ADDRESS}?lightning=${INVOICE}&amount=0.0001`)
      expect(amountInput.value).toBe(sats2btc(INVOICE_SATS))
      expect(currentSendInfo.satoshis).toBe(INVOICE_SATS)
      expect(currentSendInfo.invoice).toBe(INVOICE)
    })
  })

  it('converts a USD account amount into its designated asset units', async () => {
    const setSendInfo = vi.fn()
    const account = {
      assetId: 'usdt',
      ticker: 'USD' as const,
      balance: BigInt(10_000),
      decimals: 2,
      amount: BigInt(0),
      source: { assetId: 'usdt', balance: BigInt(1_000_000), decimals: 4 },
    }

    renderSendForm({
      flowContext: {
        ...mockFlowContextValue,
        sendInfo: { ...emptySendInfo, account },
        setSendInfo,
      },
      walletContext: {
        ...mockWalletContextValue,
        svcWallet: {
          ...mockSvcWallet,
          getAddress: () => 'tark1mockoffchain',
          getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
          getBalance: () => Promise.resolve({ available: 1_000_000 }),
        } as any,
      },
    })

    const amountInput = document.querySelector('input[name="send-amount"]') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '80' } })

    await waitFor(() =>
      expect(setSendInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          account: expect.objectContaining({ amount: BigInt(8_000) }),
          assets: [{ assetId: 'usdt', amount: BigInt(800_000) }],
        }),
      ),
    )
  })

  it('stops a partial asset send that cannot fund its change carrier', async () => {
    const account = {
      assetId: 'usdt',
      ticker: 'USD' as const,
      balance: BigInt(10_000),
      decimals: 2,
      amount: BigInt(8_000),
      source: { assetId: 'usdt', balance: BigInt(1_000_000), decimals: 4 },
    }

    renderSendForm({
      flowContext: {
        ...mockFlowContextValue,
        sendInfo: { ...emptySendInfo, account, assets: [{ assetId: 'usdt', amount: BigInt(800_000) }] },
      },
      walletContext: {
        ...mockWalletContextValue,
        // one dust carrier: the sats the asset itself rides on
        availableBalance: 330,
        svcWallet: {
          ...mockSvcWallet,
          getAddress: () => 'tark1mockoffchain',
          getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
          getBalance: () => Promise.resolve({ available: 330 }),
        } as any,
      },
    })

    expect(await screen.findByTestId('error-message')).toHaveTextContent(/partial send/)
    expect(screen.getByText('Continue').closest('button')).toBeDisabled()
  })

  it('shows the payment request the app link already stored', async () => {
    const request = 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4?amount=0.0001'
    const walletValue = {
      ...mockWalletContextValue,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
      } as any,
    }
    renderSendForm({
      flowContext: {
        ...mockFlowContextValue,
        appIntent: { status: 'send', request, callback: 'https://arkade.trade/vault' },
        sendInfo: { ...emptySendInfo, recipient: request },
      },
      walletContext: walletValue,
    })

    expect(await screen.findByDisplayValue(request)).toBeInTheDocument()
  })

  it('verifies a pasted bip21 carrying branta params and shows the card', async () => {
    const uri =
      'bitcoin:bcrt1pq6gt72nxevsxk5fwl3h2sx56jeah6qfzh98mksxyakkg5l0q65gsa27khh?branta_id=abc&branta_secret=def'
    verifyMock.mockResolvedValueOnce({
      status: 'match',
      payments: [{ destinations: [], platform: 'Acme Pay', description: 'Order 42' }],
      verifyUrl: 'https://guardrail.branta.pro/v2/verify/abc',
    })
    renderSendForm({
      flowContext: { ...mockFlowContextValue, sendInfo: { ...emptySendInfo, recipient: uri } },
      walletContext: {
        ...mockWalletContextValue,
        svcWallet: {
          ...mockSvcWallet,
          getAddress: () => 'tark1mockoffchain',
          getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        } as any,
      },
    })

    expect(await screen.findByText('Acme Pay', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(verifyMock).toHaveBeenCalledWith(uri)
    expect(screen.getByText('Order 42')).toBeInTheDocument()
    expect(screen.getByText('Verified by Branta').closest('a')).toHaveAttribute(
      'href',
      'https://guardrail.branta.pro/v2/verify/abc',
    )
  })

  it.each(['funded', 'claimed'] as const)('leaves manual C without confusing the %s external B handoff', (outcome) => {
    vi.mocked(redirectToCallback).mockClear()
    const resetFlow = vi.fn()
    const navigate = vi.fn()
    const callback = 'https://app.example/return'
    renderSendForm({
      flowContext: {
        ...mockFlowContextValue,
        appIntent: {
          status: 'send',
          request: 'bitcoin:bcrt1qoriginal',
          callback,
          committedOnchain: { swapId: 'rfq:owned', fundingTxid: 'funding-txid' },
        },
        sendInfo: emptySendInfo,
        resetFlow,
      },
      navigationContext: { ...mockNavigationContextValue, navigate },
      outcomeOf: () => outcome,
      walletContext: {
        ...mockWalletContextValue,
        svcWallet: {
          ...mockSvcWallet,
          getAddress: () => 'tark1mockoffchain',
          getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        } as any,
      },
    })
    fireEvent.click(screen.getByLabelText('Go back'))
    if (outcome === 'funded') {
      expect(redirectToCallback).not.toHaveBeenCalled()
      expect(resetFlow).not.toHaveBeenCalled()
      expect(navigate).toHaveBeenCalledWith(Pages.Wallet)
    } else {
      expect(redirectToCallback).toHaveBeenCalledWith(callback, { status: 'sent', txid: 'funding-txid' })
      expect(resetFlow).toHaveBeenCalledOnce()
    }
  })

  it('returns to the app with error=denied when the send is dismissed', () => {
    vi.mocked(redirectToCallback).mockClear()
    const resetFlow = vi.fn()
    const callback = 'https://arkade.trade/vault'
    renderSendForm({
      flowContext: {
        ...mockFlowContextValue,
        appIntent: {
          status: 'send',
          request: 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
          callback,
        },
        resetFlow,
      },
      walletContext: {
        ...mockWalletContextValue,
        svcWallet: {
          ...mockSvcWallet,
          getAddress: () => 'tark1mockoffchain',
          getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        } as any,
      },
    })

    fireEvent.click(screen.getByLabelText('Go back'))
    expect(resetFlow).toHaveBeenCalled()
    expect(redirectToCallback).toHaveBeenCalledWith(callback, { error: 'denied' })
  })

  it('returns to the wallet when an app send without a callback is dismissed', () => {
    vi.mocked(redirectToCallback).mockClear()
    const resetFlow = vi.fn()
    const navigate = vi.fn()
    renderSendForm({
      flowContext: {
        ...mockFlowContextValue,
        appIntent: {
          status: 'send',
          request: 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
        },
        resetFlow,
      },
      navigationContext: { ...mockNavigationContextValue, navigate },
      walletContext: {
        ...mockWalletContextValue,
        svcWallet: {
          ...mockSvcWallet,
          getAddress: () => 'tark1mockoffchain',
          getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        } as any,
      },
    })

    fireEvent.click(screen.getByLabelText('Go back'))
    expect(resetFlow).toHaveBeenCalled()
    expect(redirectToCallback).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith(Pages.Wallet)
  })

  const pendingPayment = () => {
    const resume = vi.fn().mockResolvedValue('old-taxi-txid')
    const forget = vi.fn()
    const payment = new FailedDirectTaxi(
      {
        network: 'regtest',
        senderKey: '11'.repeat(32),
        taxiUrl: 'https://taxi.example',
        operatorKey: '22'.repeat(32),
        transferId: 'old-taxi-transfer',
        expectedTxid: '33'.repeat(32),
        expectedVout: 0,
        mode: 'recycle',
        receiverAddress: 'old-taxi-recipient',
        assetAmount: '100',
      },
      resume,
      'pending',
      undefined,
      forget,
    )
    return { payment, resume, forget }
  }

  it.each(['returned', 'unresolved'] as const)(
    'restores the bitcoin amount field when a pending Taxi payment is %s',
    async (outcome) => {
      const { payment, resume, forget } = pendingPayment()
      if (outcome === 'returned') resume.mockRejectedValue(new ReturnedDirectTaxi(payment.record))
      else resume.mockRejectedValue(payment)
      vi.mocked(getPendingDirectTaxi).mockResolvedValue(payment)
      const { setSendInfo } = appSendSetup(false)
      const button = await screen.findByText('Check Taxi payment')
      fireEvent.click(button)
      if (outcome === 'unresolved') {
        await waitFor(() => expect(resume).toHaveBeenCalledOnce())
        expect(forget).not.toHaveBeenCalled()
        expect(screen.queryByText('Forget Taxi payment')).not.toBeInTheDocument()
        expect(screen.getByText('Check Taxi payment')).toBeInTheDocument()
        expect(sendDirectTaxi).not.toHaveBeenCalled()
        return
      }
      await waitFor(() => expect(document.querySelector('input[name="send-amount"]')).toHaveValue(100))
      expect(await screen.findByText('0.00000100 BTC')).toBeInTheDocument()
      expect(setSendInfo).toHaveBeenCalledWith({ arkAddress: 'old-taxi-recipient', satoshis: 100 })
      expect(forget).not.toHaveBeenCalled()
      expect(sendDirectTaxi).not.toHaveBeenCalled()
    },
  )

  it.each(['returned', 'unresolved'] as const)(
    'restores the recorded asset amount with its own decimals when a pending Taxi payment is %s',
    async (outcome) => {
      const { payment, resume, forget } = pendingPayment()
      const record = { ...payment.record, assetId: 'recorded-asset', assetAmount: '12345' }
      const pending = new FailedDirectTaxi(record, resume, 'pending', undefined, forget)
      if (outcome === 'returned') resume.mockRejectedValue(new ReturnedDirectTaxi(record))
      else resume.mockRejectedValue(pending)
      vi.mocked(getPendingDirectTaxi).mockResolvedValue(pending)
      const setSendInfo = vi.fn()
      renderSendForm({
        flowContext: {
          ...mockFlowContextValue,
          sendInfo: {
            ...emptySendInfo,
            recipient: 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
            assets: [{ assetId: 'other-asset', amount: 1n }],
          },
          setSendInfo,
        },
        walletContext: {
          ...mockWalletContextValue,
          availableBalance: 1_000_000,
          assetBalances: [
            { assetId: 'recorded-asset', amount: 20000n },
            { assetId: 'other-asset', amount: 100n },
          ] as any,
          availableAssetBalances: [
            { assetId: 'recorded-asset', amount: 20000n },
            { assetId: 'other-asset', amount: 100n },
          ] as any,
          assetMetadataCache: new Map([
            ['recorded-asset', { metadata: { name: 'Recorded', ticker: 'REC', decimals: 2 } } as any],
            ['other-asset', { metadata: { name: 'Other', ticker: 'OTHER', decimals: 0 } } as any],
          ]),
          svcWallet: {
            ...mockSvcWallet,
            getAddress: () => 'tark1mockoffchain',
            getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
          } as any,
        },
      })
      await waitFor(() => expect(screen.getByTestId('asset-selector')).toHaveTextContent('OTHER'))
      const button = await screen.findByText('Check Taxi payment')
      fireEvent.click(button)
      if (outcome === 'unresolved') {
        await waitFor(() => expect(resume).toHaveBeenCalledOnce())
        expect(forget).not.toHaveBeenCalled()
        expect(screen.queryByText('Forget Taxi payment')).not.toBeInTheDocument()
        expect(screen.getByText('Check Taxi payment')).toBeInTheDocument()
        expect(sendDirectTaxi).not.toHaveBeenCalled()
        return
      }
      await waitFor(() => expect(document.querySelector('input[name="send-amount"]')).toHaveValue(123.45))
      expect(screen.getByTestId('asset-selector')).toHaveTextContent('REC')
      expect(setSendInfo).toHaveBeenCalledWith({
        arkAddress: 'old-taxi-recipient',
        assets: [{ assetId: 'recorded-asset', amount: 12345n }],
        satoshis: 0,
      })
      expect(forget).not.toHaveBeenCalled()
      expect(sendDirectTaxi).not.toHaveBeenCalled()
    },
  )

  it('refreshes a returned Taxi asset balance so the recorded payment can continue', async () => {
    const { payment, resume } = pendingPayment()
    const key = await SingleKey.fromHex('11'.repeat(32)).xOnlyPublicKey()
    const address = new ArkAddress(key, key, 'tark').encode()
    const record = { ...payment.record, receiverAddress: address, assetId: 'recorded-asset', assetAmount: '12345' }
    resume.mockRejectedValue(new ReturnedDirectTaxi(record))
    vi.mocked(getPendingDirectTaxi).mockResolvedValue(
      new FailedDirectTaxi(record, resume, 'pending', undefined, vi.fn()),
    )
    let releaseReload!: () => void
    const reload = new Promise<void>((resolve) => {
      releaseReload = resolve
    })
    const reloadWallet = vi.fn()
    const recordSendInfo = vi.fn()
    const navigate = vi.fn()
    const assetBalances = [{ assetId: 'recorded-asset', amount: 20000n }]
    const assetMetadataCache = new Map([
      ['recorded-asset', { cachedAt: 0, metadata: { name: 'Recorded', ticker: 'REC', decimals: 2 } }],
    ])
    const svcWallet = {
      ...mockSvcWallet,
      getAddress: () => address,
      getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
    }
    function ReloadingForm() {
      const [sendInfo, setSendInfo] = useState<SendInfo>({
        ...emptySendInfo,
        arkAddress: address,
        assets: [{ assetId: 'recorded-asset', amount: 12345n }],
      })
      const [availableAssetBalances, setAvailableAssetBalances] = useState([{ assetId: 'recorded-asset', amount: 0n }])
      recordSendInfo.mockImplementation(setSendInfo)
      reloadWallet.mockImplementation(async () => {
        await reload
        setAvailableAssetBalances(assetBalances)
      })
      return sendForm({
        flowContext: { ...mockFlowContextValue, sendInfo, setSendInfo: recordSendInfo },
        navigationContext: { ...mockNavigationContextValue, navigate },
        walletContext: {
          ...mockWalletContextValue,
          availableBalance: 1_000_000,
          assetBalances: assetBalances as any,
          availableAssetBalances: availableAssetBalances as any,
          assetMetadataCache,
          svcWallet: svcWallet as any,
          reloadWallet,
        },
      })
    }
    render(<ReloadingForm />)
    fireEvent.click(await screen.findByText('Check Taxi payment'))
    await waitFor(() => expect(document.querySelector('input[name="send-amount"]')).toHaveValue(123.45))
    expect(screen.getByText('Insufficient asset balance').closest('button')).toBeDisabled()
    expect(reloadWallet).toHaveBeenCalledOnce()
    await act(async () => {
      releaseReload()
      await reload
    })
    const continueButton = await screen.findByText('Continue')
    await waitFor(() => expect(continueButton.closest('button')).toBeEnabled())
    expect(screen.getByTestId('asset-selector')).toHaveTextContent('REC')
    expect(screen.getByTestId('asset-selector')).toHaveTextContent('200 REC')
    expect(document.querySelector('input[name="send-amount"]')).toHaveValue(123.45)
    expect(recordSendInfo).toHaveBeenLastCalledWith({
      arkAddress: address,
      assets: [{ assetId: 'recorded-asset', amount: 12345n }],
      satoshis: 0,
    })
    vi.mocked(getPendingDirectTaxi).mockResolvedValue(undefined)
    fireEvent.click(continueButton)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails))
    expect(sendDirectTaxi).not.toHaveBeenCalled()
  })

  it('refreshes metadata for the chosen asset without restoring a different preset or changing its amount', async () => {
    const setSendInfo = vi.fn()
    const walletContext = {
      ...mockWalletContextValue,
      availableBalance: 1_000_000,
      assetBalances: [
        { assetId: 'preset-asset', amount: 1000n },
        { assetId: 'chosen-asset', amount: 2000n },
      ] as any,
      availableAssetBalances: [
        { assetId: 'preset-asset', amount: 1000n },
        { assetId: 'chosen-asset', amount: 2000n },
      ] as any,
      assetMetadataCache: new Map([
        ['preset-asset', { cachedAt: 0, metadata: { name: 'Preset', ticker: 'AAA', decimals: 2 } }],
        ['chosen-asset', { cachedAt: 0, metadata: { name: 'Chosen', ticker: 'BBB', decimals: 2 } }],
      ]),
      isVerifiedAsset: () => true,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
      } as any,
    }
    const flowContext = {
      ...mockFlowContextValue,
      sendInfo: { ...emptySendInfo, assets: [{ assetId: 'preset-asset', amount: 1n }] },
      setSendInfo,
    }
    const view = renderSendForm({ flowContext, walletContext })
    await waitFor(() => expect(screen.getByTestId('asset-selector')).toHaveTextContent('AAA'))
    fireEvent.click(screen.getByTestId('asset-selector'))
    fireEvent.click(await screen.findByTestId('asset-bbb-option'))
    const amount = document.querySelector('input[name="send-amount"]')!
    fireEvent.change(amount, { target: { value: '1.5' } })
    expect(setSendInfo).toHaveBeenLastCalledWith(
      expect.objectContaining({ assets: [{ assetId: 'chosen-asset', amount: 150n }] }),
    )
    const calls = setSendInfo.mock.calls.length
    view.rerender(
      sendForm({
        flowContext,
        walletContext: {
          ...walletContext,
          availableAssetBalances: [...walletContext.availableAssetBalances] as any,
          assetMetadataCache: new Map([
            ['preset-asset', walletContext.assetMetadataCache.get('preset-asset')!],
            ['chosen-asset', { cachedAt: 1, metadata: { name: 'Chosen refreshed', ticker: 'BBB2', decimals: 3 } }],
          ]),
        },
      }),
    )
    await waitFor(() =>
      expect(screen.getByTestId('asset-selector').querySelector('.send-asset-trigger__name')).toHaveTextContent(
        /^BBB2$/,
      ),
    )
    expect(screen.getByTestId('asset-selector')).toHaveTextContent('2 BBB2')
    expect(amount).toHaveValue(1.5)
    expect(setSendInfo).toHaveBeenCalledTimes(calls)
  })

  it.each(['missing from a nonempty list', 'missing from an empty list'] as const)(
    'disables the chosen asset while %s and restores its balance without changing the draft',
    async (missing) => {
      const recordSendInfo = vi.fn()
      const key = await SingleKey.fromHex('11'.repeat(32)).xOnlyPublicKey()
      const address = new ArkAddress(key, key, 'tark').encode()
      const owned = [
        { assetId: 'preset-asset', amount: 1000n },
        { assetId: 'chosen-asset', amount: 2000n },
      ]
      const svcWallet = {
        ...mockSvcWallet,
        getAddress: () => address,
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
      }
      function RefreshingForm({ balances }: { balances: typeof owned }) {
        const [sendInfo, setSendInfo] = useState<SendInfo>({
          ...emptySendInfo,
          arkAddress: address,
          assets: [{ assetId: 'preset-asset', amount: 1n }],
        })
        recordSendInfo.mockImplementation(setSendInfo)
        return sendForm({
          flowContext: { ...mockFlowContextValue, sendInfo, setSendInfo: recordSendInfo },
          walletContext: {
            ...mockWalletContextValue,
            availableBalance: 1_000_000,
            assetBalances: balances as any,
            availableAssetBalances: balances as any,
            assetMetadataCache: new Map([
              ['preset-asset', { cachedAt: 0, metadata: { name: 'Preset', ticker: 'AAA', decimals: 2 } }],
              ['chosen-asset', { cachedAt: 0, metadata: { name: 'Chosen', ticker: 'BBB', decimals: 2 } }],
            ]),
            isVerifiedAsset: () => true,
            svcWallet: svcWallet as any,
          },
        })
      }
      const view = render(<RefreshingForm balances={owned} />)
      await waitFor(() => expect(screen.getByTestId('asset-selector')).toHaveTextContent('AAA'))
      fireEvent.click(screen.getByTestId('asset-selector'))
      fireEvent.click(await screen.findByTestId('asset-bbb-option'))
      const amount = document.querySelector('input[name="send-amount"]')!
      fireEvent.change(amount, { target: { value: '1.5' } })
      await waitFor(() => expect(screen.getByText('Continue').closest('button')).toBeEnabled())
      expect(recordSendInfo).toHaveBeenLastCalledWith(
        expect.objectContaining({ assets: [{ assetId: 'chosen-asset', amount: 150n }] }),
      )
      const calls = recordSendInfo.mock.calls.length
      view.rerender(<RefreshingForm balances={missing === 'missing from an empty list' ? [] : owned.slice(0, 1)} />)
      await waitFor(() =>
        expect(screen.getByTestId('asset-selector').querySelector('.send-asset-trigger__balance')).toHaveTextContent(
          /^0 BBB available$/,
        ),
      )
      expect(screen.getByText('Insufficient asset balance').closest('button')).toBeDisabled()
      expect(screen.getByTestId('asset-selector').querySelector('.send-asset-trigger__name')).toHaveTextContent(/^BBB$/)
      expect(amount).toHaveValue(1.5)
      expect(recordSendInfo).toHaveBeenCalledTimes(calls)
      view.rerender(<RefreshingForm balances={[owned[0], { assetId: 'chosen-asset', amount: 3000n }]} />)
      await waitFor(() =>
        expect(screen.getByTestId('asset-selector').querySelector('.send-asset-trigger__balance')).toHaveTextContent(
          /^30 BBB available$/,
        ),
      )
      await waitFor(() => expect(screen.getByText('Continue').closest('button')).toBeEnabled())
      expect(screen.getByTestId('asset-selector').querySelector('.send-asset-trigger__name')).toHaveTextContent(/^BBB$/)
      expect(amount).toHaveValue(1.5)
      expect(recordSendInfo).toHaveBeenCalledTimes(calls)
      expect(recordSendInfo).toHaveBeenLastCalledWith(
        expect.objectContaining({ assets: [{ assetId: 'chosen-asset', amount: 150n }] }),
      )
    },
  )

  const appSendSetup = (app = true) => {
    const navigate = vi.fn()
    const resetFlow = vi.fn()
    const setSendInfo = vi.fn()
    const sendBitcoin = vi.fn()
    const callback = 'https://arkade.trade/new-payment'
    const request = 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4?amount=0.0001'
    renderSendForm({
      flowContext: {
        ...mockFlowContextValue,
        appIntent: app ? { status: 'send', request, callback } : undefined,
        sendInfo: {
          ...emptySendInfo,
          address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
          recipient: request,
          satoshis: 10_000,
        },
        setSendInfo,
        resetFlow,
      },
      navigationContext: { ...mockNavigationContextValue, navigate },
      walletContext: {
        ...mockWalletContextValue,
        availableBalance: 1_000_000,
        svcWallet: {
          ...mockSvcWallet,
          sendBitcoin,
          getAddress: () => 'tark1mockoffchain',
          getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        } as any,
      },
    })
    return { navigate, resetFlow, setSendInfo, sendBitcoin, callback }
  }

  it.each(['startup', 'continue'] as const)(
    'denies a new app request when %s discovers an older pending Taxi payment',
    async (discovery) => {
      const { payment, resume, forget } = pendingPayment()
      if (discovery === 'startup') vi.mocked(getPendingDirectTaxi).mockResolvedValue(payment)
      else vi.mocked(getPendingDirectTaxi).mockResolvedValueOnce(undefined).mockResolvedValue(payment)
      const { callback, resetFlow, navigate, setSendInfo, sendBitcoin } = appSendSetup()
      if (discovery === 'continue') {
        const button = screen.getByText('Continue').closest('button')!
        await waitFor(() => expect(button).toBeEnabled())
        fireEvent.click(button)
      }
      await waitFor(() => expect(redirectToCallback).toHaveBeenCalledWith(callback, { error: 'denied' }))
      expect(resetFlow).toHaveBeenCalledOnce()
      expect(resume).not.toHaveBeenCalled()
      expect(forget).not.toHaveBeenCalled()
      expect(sendDirectTaxi).not.toHaveBeenCalled()
      expect(sendBitcoin).not.toHaveBeenCalled()
      expect(navigate).not.toHaveBeenCalledWith(Pages.SendSuccess)
      expect(setSendInfo).not.toHaveBeenCalledWith(expect.objectContaining({ txid: 'old-taxi-txid' }))
      expect(redirectToCallback).toHaveBeenCalledOnce()
    },
  )

  it('still resumes the older Taxi payment outside an app request', async () => {
    const { payment, resume, forget } = pendingPayment()
    vi.mocked(getPendingDirectTaxi).mockResolvedValue(payment)
    const { navigate, setSendInfo } = appSendSetup(false)
    const button = await screen.findByText('Check Taxi payment')
    fireEvent.click(button)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendSuccess))
    expect(resume).toHaveBeenCalledOnce()
    expect(forget).not.toHaveBeenCalled()
    expect(sendDirectTaxi).not.toHaveBeenCalled()
    expect(setSendInfo).toHaveBeenCalledWith({ arkAddress: 'old-taxi-recipient', satoshis: 100, txid: 'old-taxi-txid' })
    expect(redirectToCallback).not.toHaveBeenCalled()
  })

  it.each(['startup', 'continue'] as const)(
    'denies a fresh app callback when %s finds an unresolved native asset payment',
    async (discovery) => {
      const pending = {
        quoteId: 'old-quote',
        arkAddress: 'old-recipient',
        assetId: 'old-asset',
        amount: '500',
        payAmountSats: '1000',
      }
      if (discovery === 'startup') vi.mocked(getPendingAssetPayment).mockResolvedValue(pending)
      else vi.mocked(getPendingAssetPayment).mockResolvedValueOnce(undefined).mockResolvedValue(pending)
      const { callback, setSendInfo, navigate } = appSendSetup()
      if (discovery === 'continue') {
        const button = screen.getByText('Continue').closest('button')!
        await waitFor(() => expect(button).toBeEnabled())
        fireEvent.click(button)
      }
      await waitFor(() => expect(redirectToCallback).toHaveBeenCalledWith(callback, { error: 'denied' }))
      expect(setSendInfo).not.toHaveBeenCalledWith(expect.objectContaining({ swapId: 'old-quote' }))
      expect(navigate).not.toHaveBeenCalledWith(Pages.SendSuccess)
      expect(sendDirectTaxi).not.toHaveBeenCalled()
    },
  )

  it.each([undefined, 2])('restores original Taxi asset units (%s decimals)', async (decimals) => {
    const pending = {
      quoteId: 'original-quote',
      arkAddress:
        'tark1qplnj2gett9j483fchy6chaxn4y52c4g7n5djh9xua3ywdxw0ldatc3e9xcj9xpx0r5tmr0dgvu2f4s352muklg0tcxx0scnnkraajy9jgz4xl',
      assetId: '44'.repeat(32),
      amount: '1000',
      payAmountSats: '1000',
    }
    vi.mocked(getPendingAssetPayment).mockResolvedValue(pending)
    const checkAssetPayment = vi.fn().mockResolvedValue({ id: pending.quoteId, fundingTxid: 'original-txid' })
    const navigate = vi.fn()
    const setSendInfo = vi.fn()
    render(
      <SwapsContext.Provider value={{ checkAssetPayment } as never}>
        {sendForm({
          flowContext: { ...mockFlowContextValue, setSendInfo } as any,
          walletContext: {
            ...mockWalletContextValue,
            assetBalances: [],
            availableAssetBalances: [],
            assetMetadataCache: new Map(
              decimals === undefined
                ? []
                : [[pending.assetId, { cachedAt: 0, metadata: { name: 'Asset', ticker: 'ASSET', decimals } }]],
            ),
            svcWallet: {
              ...mockSvcWallet,
              getAddress: () => 'tark1ownaddress',
              getBoardingAddress: async () => 'bcrt1ownaddress',
            } as any,
          },
          navigationContext: { ...mockNavigationContextValue, navigate },
        })}
      </SwapsContext.Provider>,
    )
    const button = await screen.findByText('Check asset payment')
    await waitFor(() => expect(button.closest('button')).toBeEnabled())
    expect(document.querySelector('input[name="send-amount"]')).toHaveValue(decimals === undefined ? 1000 : 10)
    expect(setSendInfo).toHaveBeenCalledWith(
      expect.objectContaining({ assets: [{ assetId: pending.assetId, amount: 1000n }] }),
    )
    fireEvent.click(button)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendSuccess))
    expect(checkAssetPayment).toHaveBeenCalledOnce()
    expect(setSendInfo).toHaveBeenCalledWith({
      arkAddress: pending.arkAddress,
      assets: [{ assetId: pending.assetId, amount: 1000n }],
      satoshis: 0,
      txid: 'original-txid',
      swapId: pending.quoteId,
    })
    expect(sendDirectTaxi).not.toHaveBeenCalled()
  })

  it.each(['absent', 'unreadable'] as const)(
    'refreshes the pending form only after a successful journal reread (%s)',
    async (journal) => {
      const pending = {
        quoteId: 'original-quote',
        arkAddress:
          'tark1qplnj2gett9j483fchy6chaxn4y52c4g7n5djh9xua3ywdxw0ldatc3e9xcj9xpx0r5tmr0dgvu2f4s352muklg0tcxx0scnnkraajy9jgz4xl',
        assetId: '44'.repeat(32),
        amount: '500',
        payAmountSats: '1000',
      }
      vi.mocked(getPendingAssetPayment).mockResolvedValue(pending)
      const checkAssetPayment = vi.fn().mockImplementation(async () => {
        if (journal === 'absent') vi.mocked(getPendingAssetPayment).mockResolvedValue(undefined)
        else vi.mocked(getPendingAssetPayment).mockRejectedValue(new Error('journal unreadable'))
        throw new Error('The payment was not sent. Please try again.')
      })
      const navigate = vi.fn()
      render(
        <SwapsContext.Provider value={{ checkAssetPayment } as never}>
          {sendForm({
            navigationContext: { ...mockNavigationContextValue, navigate },
            walletContext: {
              ...mockWalletContextValue,
              svcWallet: {
                ...mockSvcWallet,
                getAddress: () => 'tark1ownaddress',
                getBoardingAddress: async () => 'bcrt1ownaddress',
              } as any,
            },
          })}
        </SwapsContext.Provider>,
      )
      const button = await screen.findByText('Check asset payment')
      await waitFor(() => expect(button.closest('button')).toBeEnabled())
      fireEvent.click(button)
      await screen.findByText(
        journal === 'absent' ? 'The payment was not sent. Please try again.' : 'journal unreadable',
      )
      expect(checkAssetPayment).toHaveBeenCalledOnce()
      expect(navigate).not.toHaveBeenCalledWith(Pages.SendSuccess)
      if (journal === 'absent') expect(screen.queryByText('Check asset payment')).not.toBeInTheDocument()
      else expect(screen.getByText('Check asset payment').closest('button')).toBeDisabled()
      expect(sendDirectTaxi).not.toHaveBeenCalled()
    },
  )

  it('keeps Continue disabled when the native journal cannot be read', async () => {
    vi.mocked(getPendingAssetPayment).mockRejectedValue(new Error('corrupt pending state'))
    appSendSetup(false)
    await screen.findByText('corrupt pending state')
    expect(screen.getByText('Continue').closest('button')).toBeDisabled()
    expect(sendDirectTaxi).not.toHaveBeenCalled()
  })

  it('refuses the restored native payment after switching wallet identity', async () => {
    const pending = {
      quoteId: 'original-quote',
      arkAddress: 'original-recipient',
      assetId: '44'.repeat(32),
      amount: '500',
      payAmountSats: '1000',
    }
    vi.mocked(getPendingAssetPayment).mockResolvedValueOnce(pending).mockResolvedValue(undefined)
    const checkAssetPayment = vi.fn()
    const quoteAssetPayment = vi.fn()
    const wallet = {
      ...mockSvcWallet,
      getAddress: () => 'tark1ownaddress',
      getBoardingAddress: async () => 'bcrt1ownaddress',
    }
    const form = (svcWallet: typeof wallet) => (
      <SwapsContext.Provider value={{ checkAssetPayment, quoteAssetPayment } as never}>
        {sendForm({ walletContext: { ...mockWalletContextValue, svcWallet: svcWallet as any } })}
      </SwapsContext.Provider>
    )
    const view = render(form(wallet))
    await screen.findByText('Check asset payment')
    view.rerender(form({ ...wallet }))
    await screen.findByText('Wallet changed. Start a new send from your wallet.')
    expect(screen.getByText('Continue').closest('button')).toBeDisabled()
    expect(getPendingAssetPayment).toHaveBeenCalledOnce()
    expect(checkAssetPayment).not.toHaveBeenCalled()
    expect(quoteAssetPayment).not.toHaveBeenCalled()
    expect(sendDirectTaxi).not.toHaveBeenCalled()
  })

  it('continues a new app request normally when no Taxi payment is pending', async () => {
    const { navigate, resetFlow } = appSendSetup()
    const button = screen.getByText('Continue').closest('button')!
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails))
    expect(resetFlow).not.toHaveBeenCalled()
    expect(redirectToCallback).not.toHaveBeenCalled()
    expect(sendDirectTaxi).not.toHaveBeenCalled()
  })

  it('checks an app request own held Taxi submission without denying or sending again', async () => {
    vi.stubEnv('VITE_TAXI_URL', 'http://localhost:7070')
    vi.stubGlobal('PointerEvent', MouseEvent)
    const receiver =
      'tark1qplnj2gett9j483fchy6chaxn4y52c4g7n5djh9xua3ywdxw0ldatc3e9xcj9xpx0r5tmr0dgvu2f4s352muklg0tcxx0scnnkraajy9jgz4xl'
    const assetId = '44'.repeat(32)
    const resume = vi.fn().mockResolvedValue('new-taxi-txid')
    const pending = new PendingDirectTaxi(
      {
        ...pendingPayment().payment.record,
        receiverAddress: receiver,
        assetId,
        assetAmount: '100',
      },
      resume,
      new Error('reply lost'),
    )
    vi.mocked(sendDirectTaxi).mockRejectedValue(pending)
    const navigate = vi.fn()
    const resetFlow = vi.fn()
    const setSendInfo = vi.fn()
    renderSendForm({
      flowContext: {
        ...mockFlowContextValue,
        appIntent: { status: 'send', request: receiver, callback: 'https://arkade.trade/new-payment' },
        sendInfo: { ...emptySendInfo, arkAddress: receiver, assets: [{ assetId, amount: 100n }], satoshis: 0 },
        setSendInfo,
        resetFlow,
      },
      navigationContext: { ...mockNavigationContextValue, navigate },
      walletContext: {
        ...mockWalletContextValue,
        availableBalance: 1_000_000,
        assetBalances: [{ assetId, amount: 100n }] as any,
        availableAssetBalances: [{ assetId, amount: 100n }] as any,
        assetMetadataCache: new Map([[assetId, { metadata: { name: 'Asset', ticker: 'ASSET', decimals: 0 } } as any]]),
        svcWallet: {
          ...mockSvcWallet,
          getAddress: () => receiver,
          getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        } as any,
      },
    })
    fireEvent.click(await screen.findByTestId('taxi-send-mode'))
    fireEvent.click(screen.getByRole('radio', { name: 'Receiver uses own sats' }))
    const button = screen.getByText('Continue').closest('button')!
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    const check = await screen.findByText('Check Taxi payment')
    vi.mocked(getPendingDirectTaxi).mockResolvedValue(pending)
    fireEvent.click(check)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendSuccess))
    expect(sendDirectTaxi).toHaveBeenCalledOnce()
    expect(resume).toHaveBeenCalledOnce()
    expect(resetFlow).not.toHaveBeenCalled()
    expect(redirectToCallback).not.toHaveBeenCalled()
    expect(setSendInfo).toHaveBeenCalledWith(expect.objectContaining({ txid: 'new-taxi-txid' }))
  })
  it.each([
    ['direct', 'Bitcoin'],
    ['direct', 'BBB'],
    ['native', 'BBB'],
  ] as const)('keeps %s quote approval paired with its asset after switching to %s', async (rail, selection) => {
    vi.stubEnv('VITE_TAXI_URL', 'http://localhost:7070')
    vi.stubGlobal('PointerEvent', MouseEvent)
    const key = await SingleKey.fromHex('11'.repeat(32)).xOnlyPublicKey()
    const receiver = new ArkAddress(key, key, 'tark').encode()
    const assetId = '11'.repeat(34)
    const otherId = '22'.repeat(34)
    let releaseQuote!: () => void
    const quoteReady = new Promise<void>((resolve) => {
      releaseQuote = resolve
    })
    vi.mocked(sendDirectTaxi).mockImplementation(async (args) => {
      await quoteReady
      await args.confirmPayment({
        mode: 'recycle',
        assetId,
        assetAmount: 1000n,
        fareCurrency: 'asset',
        fareUnits: 200n,
        carrierSats: 330n,
      })
      throw new PaymentDeclined()
    })
    vi.mocked(payAssetRequest).mockImplementation(async (request, deps) => {
      await quoteReady
      await deps.ui.confirmPayment({ assetId: request.assetId, assetAmount: request.amount, payAmountSats: 2000n })
      throw new PaymentDeclined()
    })
    const balances = [
      { assetId, amount: rail === 'native' ? 0n : 10000n },
      { assetId: otherId, amount: 20000n },
    ]
    const svcWallet = {
      ...mockSvcWallet,
      getAddress: () => receiver,
      getBoardingAddress: async () => 'bcrt1mockboarding',
    }
    const recordSendInfo = vi.fn()
    function QuotingForm() {
      const [sendInfo, setSendInfo] = useState<SendInfo>({
        ...emptySendInfo,
        arkAddress: receiver,
        recipient:
          rail === 'native'
            ? encodeBip21Asset(receiver, assetId, 1000n, 2, { url: 'http://localhost:7070' })
            : receiver,
        assets: [{ assetId, amount: 1000n }],
        satoshis: 0,
      })
      recordSendInfo.mockImplementation(setSendInfo)
      return sendForm({
        aspContext: {
          ...mockAspContextValue,
          aspInfo: { ...mockAspContextValue.aspInfo, signerPubkey: '11'.repeat(32) },
        },
        flowContext: { ...mockFlowContextValue, sendInfo, setSendInfo: recordSendInfo },
        walletContext: {
          ...mockWalletContextValue,
          availableBalance: 1_000_000,
          assetBalances: balances as any,
          availableAssetBalances: balances as any,
          assetMetadataCache: new Map([
            [assetId, { cachedAt: 0, metadata: { name: 'Original', ticker: 'AAA', decimals: 2 } }],
            [otherId, { cachedAt: 0, metadata: { name: 'Other', ticker: 'BBB', decimals: 4 } }],
          ]),
          isVerifiedAsset: () => true,
          svcWallet: svcWallet as any,
        },
      })
    }
    render(<QuotingForm />)
    await waitFor(() => expect(screen.getByTestId('asset-selector')).toHaveTextContent('AAA'))
    if (rail === 'direct') {
      fireEvent.click(await screen.findByTestId('taxi-send-mode'))
      fireEvent.click(screen.getByRole('radio', { name: 'Receiver uses own sats' }))
    }
    const button = screen.getByText('Continue').closest('button')!
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(rail === 'direct' ? sendDirectTaxi : payAssetRequest).toHaveBeenCalledOnce())
    expect(vi.mocked(rail === 'direct' ? sendDirectTaxi : payAssetRequest).mock.calls[0][0]).toMatchObject({
      assetId,
      amount: 1000n,
    })
    fireEvent.click(screen.getByTestId('asset-selector'))
    fireEvent.click(
      selection === 'Bitcoin'
        ? await screen.findByRole('menuitem', { name: /Bitcoin/ })
        : await screen.findByTestId('asset-bbb-option'),
    )
    await waitFor(() => expect(screen.getByTestId('asset-selector')).toHaveTextContent(selection))
    await act(async () => {
      releaseQuote()
    })
    if (rail === 'direct')
      expect(await screen.findByTestId('taxi-confirm-costs')).toHaveTextContent(
        'Send 10 AAA. Service fee: 2 AAA. Taxi carrier: 330 sats.',
      )
    else expect(await screen.findByText(/sats to send/)).toHaveTextContent('Pay 2,000 sats to send 10 AAA')
    fireEvent.click(screen.getByText('Cancel'))
    await waitFor(() => expect(screen.queryByText('Confirm payment')).not.toBeInTheDocument())
  })
})

describe('a changed recipient', () => {
  const LNURL = 'alice@pay.example'
  const BTC = 'bcrt1pj7fdvrpdsn0cl6722tmcvwcw4yqpe46020g43nhgzl90qq4aqjrs33du9f'
  const ARK = fixtures.lib.address.ark[0].address
  const SATS = 5_000

  let current: SendInfo = emptySendInfo
  let setFlow: (update: (prev: SendInfo) => SendInfo) => void = () => {}
  const StatefulForm = (options: TreeOptions) => {
    const [sendInfo, setSendInfo] = useState<SendInfo>({ ...emptySendInfo, satoshis: SATS })
    current = sendInfo
    setFlow = setSendInfo
    return sendFormTree({ ...options, flowContext: { ...mockFlowContextValue, sendInfo, setSendInfo } })
  }

  const svcWallet = {
    ...mockSvcWallet,
    getAddress: () => ARK,
    getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
  } as any
  const walletContext = { ...mockWalletContextValue, balance: 1_000_000, availableBalance: 1_000_000, svcWallet }

  const payRequest = {
    tag: 'payRequest',
    callback: 'https://pay.example/cb',
    minSendable: SATS * 1000,
    maxSendable: SATS * 1000,
    metadata: '[]',
    paymentOptions: [
      { id: 'ln', type: 'lightning' },
      { id: 'ark', type: 'arkade' },
    ],
  }
  const lnurlServer = (
    held?: Promise<void>,
    over: { callbackHeld?: Promise<void>; body?: object; arkAddress?: string } = {},
  ) => {
    const fetchMocker = createFetchMock(vi)
    fetchMocker.enableMocks()
    fetchMocker.mockResponse(async (req) => {
      if (req.url.includes('paymentOption=') || req.url.includes('method=ark')) {
        await over.callbackHeld
        const address = over.arkAddress ?? ARK
        return JSON.stringify({ paymentOption: 'ark', paymentDestination: address, address, expiryDate: '', hint: '' })
      }
      await held
      return JSON.stringify(over.body ?? payRequest)
    })
    return fetchMocker
  }

  const renderStateful = (walletValue = walletContext) => {
    const sendRouter = vi.fn(async () => createSendRouter({ wallet: svcWallet }))
    const navigate = vi.fn()
    const { container } = render(
      <StatefulForm
        walletContext={walletValue}
        swapsContext={{ sendRouter }}
        navigationContext={{ ...mockNavigationContextValue, navigate }}
      />,
    )
    const type = (value: string) =>
      fireEvent.change(container.querySelector('input[name="send-address"]')!, { target: { value } })
    const input = () => container.querySelector<HTMLInputElement>('input[name="send-address"]')!
    return { sendRouter, navigate, type, input }
  }
  const settle = { timeout: 3_000 }
  const clickContinue = async () => {
    const button = await waitFor(() => screen.getByText('Continue').closest('button')!, settle)
    await waitFor(() => expect(button).toBeEnabled(), settle)
    fireEvent.click(button)
  }

  it('pays the BTC address typed after an LNURL, not the LNURL', async () => {
    const fetchMocker = lnurlServer()
    const { sendRouter, navigate, type } = renderStateful()
    type(LNURL)
    await waitFor(() => screen.getByDisplayValue(String(SATS)), settle)

    type(BTC)
    await waitFor(() => expect(current.address).toBe(BTC), settle)
    await clickContinue()

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails), settle)
    expect(sendRouter).not.toHaveBeenCalled()
    expect(current).toMatchObject({ address: BTC, lnUrl: undefined, pendingLnSend: undefined })
    fetchMocker.disableMocks()
  })

  it('pays the Ark address typed after an LNURL, not the LNURL', async () => {
    const fetchMocker = lnurlServer()
    const { sendRouter, navigate, type } = renderStateful()
    type(LNURL)
    await waitFor(() => screen.getByDisplayValue(String(SATS)), settle)

    type(ARK)
    await waitFor(() => expect(current.arkAddress).toBe(ARK), settle)
    await clickContinue()

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails), settle)
    expect(sendRouter).not.toHaveBeenCalled()
    expect(current).toMatchObject({ arkAddress: ARK, lnUrl: undefined, pendingLnSend: undefined })
    fetchMocker.disableMocks()
  })

  it('quotes the invoice pasted after an LNURL, not the LNURL', async () => {
    const INVOICE = fixtures.lib.bolt11.invoice
    const fetchMocker = lnurlServer()
    const { sendRouter, type } = renderStateful()
    const router = createSendRouter({ wallet: svcWallet })
    const options = vi.spyOn(router, 'options')
    sendRouter.mockResolvedValue(router)
    type(LNURL)
    await waitFor(() => screen.getByDisplayValue(String(SATS)), settle)

    type(INVOICE)
    await waitFor(() => expect(current.invoice).toBe(INVOICE), settle)
    expect(current).toMatchObject({
      lnUrl: undefined,
      pendingLnSend: undefined,
      satoshis: fixtures.lib.bolt11.amountSats,
    })
    await clickContinue()

    await waitFor(() => expect(options).toHaveBeenCalledWith({ raw: INVOICE }), settle)
    expect(fetchMocker.requests().some((r) => r.url.includes('paymentOption='))).toBe(false)
    fetchMocker.disableMocks()
  })

  it('quotes the LNURL typed after an Ark address, not the Ark address', async () => {
    const fetchMocker = lnurlServer()
    const { navigate, type } = renderStateful()
    type(ARK)
    await waitFor(() => expect(current.arkAddress).toBe(ARK), settle)

    type(LNURL)
    await waitFor(() => expect(current.lnUrl).toBe(LNURL), settle)
    expect(current.arkAddress).toBeUndefined()
    await waitFor(() => screen.getByDisplayValue(String(SATS)), settle)
    await clickContinue()

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails), settle)
    expect(current.arkAddress).toBeUndefined()
    expect(current.pendingLnSend?.railId).toBe(LNURL_ARKADE_RAIL)
    fetchMocker.disableMocks()
  })

  it('still quotes an LNURL re-entered unchanged, whose conditions are already in hand', async () => {
    const fetchMocker = lnurlServer()
    const { navigate, type } = renderStateful()
    type(LNURL)
    await waitFor(() => screen.getByDisplayValue(String(SATS)), settle)

    type(LNURL.slice(0, -1))
    type(LNURL)
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    await clickContinue()

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails), settle)
    expect(current.pendingLnSend?.railId).toBe(LNURL_ARKADE_RAIL)
    fetchMocker.disableMocks()
  })

  it('keeps the Ark route selected until the receiving address is available', async () => {
    let releaseAddress: (address: string) => void = () => {}
    const receivingAddress = new Promise<string>((resolve) => (releaseAddress = resolve))
    const body = { ...payRequest, paymentOptions: undefined, transferAmounts: [{ method: 'Ark', available: true }] }
    const fetchMocker = lnurlServer(undefined, { body })
    const walletValue = {
      ...walletContext,
      svcWallet: { ...svcWallet, getAddress: () => receivingAddress },
    }
    try {
      const { sendRouter, type } = renderStateful(walletValue)
      type(LNURL)
      await waitFor(() => screen.getByDisplayValue(String(SATS)), settle)

      expect(continueButton()).toBeDisabled()
      expect(sendRouter).not.toHaveBeenCalled()

      releaseAddress(ARK)
      await waitFor(() => expect(continueButton()).toBeEnabled(), settle)
      await clickContinue()
      await waitFor(() => expect(fetchMocker.requests().some((r) => r.url.includes('method=ark'))).toBe(true), settle)
      expect(sendRouter).not.toHaveBeenCalled()
    } finally {
      fetchMocker.disableMocks()
    }
  })

  it('ignores an LNURL that resolves after the recipient changed', async () => {
    let release = () => {}
    const fetchMocker = lnurlServer(new Promise<void>((resolve) => (release = resolve)))
    const { type } = renderStateful()
    type(LNURL)
    await waitFor(() => expect(current.lnUrl).toBe(LNURL), settle)
    await waitFor(() => expect(fetchMocker.requests().length).toBeGreaterThan(0), settle)

    type(BTC)
    await waitFor(() => expect(current.address).toBe(BTC), settle)
    release()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(current).toMatchObject({ address: BTC, lnUrl: undefined })
    fetchMocker.disableMocks()
  })

  const heldCallback = () => {
    let release = () => {}
    return { held: new Promise<void>((resolve) => (release = resolve)), release: () => release() }
  }
  const recipientChangedTo = (address: string) =>
    setFlow((prev) => ({
      ...prev,
      address,
      arkAddress: undefined,
      invoice: undefined,
      lnUrl: undefined,
      pendingLnSend: undefined,
    }))

  it('drops an LNURL quote that lands after the recipient changed, and locks the input meanwhile', async () => {
    const callback = heldCallback()
    const fetchMocker = lnurlServer(undefined, { callbackHeld: callback.held })
    const { navigate, type, input } = renderStateful()
    type(LNURL)
    await waitFor(() => screen.getByDisplayValue(String(SATS)), settle)
    await clickContinue()
    await waitFor(() => expect(fetchMocker.requests().some((r) => r.url.includes('paymentOption='))).toBe(true), settle)
    expect(input()).toBeDisabled()

    recipientChangedTo(BTC)
    callback.release()
    await waitFor(() => expect(input()).toBeEnabled(), settle)

    expect(current).toMatchObject({ address: BTC, arkAddress: undefined, pendingLnSend: undefined })
    expect(navigate).not.toHaveBeenCalledWith(Pages.SendDetails)
    fetchMocker.disableMocks()
  })

  const continueButton = () => screen.getByText('Continue').closest('button')!

  it('holds Continue until the LNURL conditions load', async () => {
    let release = () => {}
    const fetchMocker = lnurlServer(new Promise<void>((resolve) => (release = resolve)))
    const { navigate, type } = renderStateful()
    type(LNURL)
    await waitFor(() => expect(fetchMocker.requests().length).toBeGreaterThan(0), settle)

    expect(continueButton()).toBeDisabled()
    release()
    await clickContinue()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails), settle)
    fetchMocker.disableMocks()
  })

  it('keeps Continue off and the recipient editable when the LNURL fails to resolve', async () => {
    const fetchMocker = createFetchMock(vi)
    fetchMocker.enableMocks()
    fetchMocker.mockResponse({ status: 404, body: 'not found' })
    const { type, input } = renderStateful()
    type(LNURL)
    await waitFor(() => screen.getByText('LNURL not found'), settle)

    expect(continueButton()).toBeDisabled()
    expect(input()).toBeEnabled()
    fetchMocker.disableMocks()
  })

  it('pays the BIP21 on-chain address when its LNURL fails to resolve', async () => {
    const lnurl = 'lnurl1dp68gurn8ghj7urp0yh8xarpva5kueewvaskcmme9e5k7tewwajkcmpdddhx7amw9akxuatjd3cz7ar9wd6xjmn8h9qlv7'
    const fetchMocker = createFetchMock(vi)
    fetchMocker.enableMocks()
    fetchMocker.mockResponse({ status: 404, body: 'not found' })
    const { navigate, type } = renderStateful()
    type(`bitcoin:${BTC}?lightning=${lnurl}`)
    await waitFor(() => expect(current).toMatchObject({ address: BTC, lnUrl: lnurl }), settle)
    await waitFor(() => expect(fetchMocker.requests().length).toBeGreaterThan(0), settle)
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(screen.queryByText('LNURL not found')).toBeNull()
    await clickContinue()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails), settle)
    expect(current.address).toBe(BTC)
    fetchMocker.disableMocks()
  })

  it('drops an LNURL quote that lands after the amount changed', async () => {
    const callback = heldCallback()
    const fetchMocker = lnurlServer(undefined, { callbackHeld: callback.held })
    const { navigate, type, input } = renderStateful()
    type(LNURL)
    await waitFor(() => screen.getByDisplayValue(String(SATS)), settle)
    await clickContinue()
    await waitFor(() => expect(fetchMocker.requests().some((r) => r.url.includes('paymentOption='))).toBe(true), settle)

    setFlow((prev) => ({ ...prev, satoshis: SATS + 1 }))
    callback.release()
    await waitFor(() => expect(input()).toBeEnabled(), settle)

    expect(current.pendingLnSend).toBeUndefined()
    expect(navigate).not.toHaveBeenCalledWith(Pages.SendDetails)
    fetchMocker.disableMocks()
  })

  it('drops an Ark address fetched for an LNURL the recipient no longer is', async () => {
    const callback = heldCallback()
    const body = { ...payRequest, paymentOptions: undefined, transferAmounts: [{ method: 'Ark', available: true }] }
    const fetchMocker = lnurlServer(undefined, { callbackHeld: callback.held, body })
    const { navigate, type, input } = renderStateful()
    type(LNURL)
    await waitFor(() => screen.getByDisplayValue(String(SATS)), settle)
    await clickContinue()
    await waitFor(() => expect(fetchMocker.requests().some((r) => r.url.includes('method=ark'))).toBe(true), settle)

    recipientChangedTo(BTC)
    callback.release()
    await waitFor(() => expect(input()).toBeEnabled(), settle)

    expect(current).toMatchObject({ address: BTC, arkAddress: undefined })
    expect(navigate).not.toHaveBeenCalledWith(Pages.SendDetails)
    fetchMocker.disableMocks()
  })

  it('clears a mismatched LNURL Ark address error when the recipient changes', async () => {
    const body = { ...payRequest, paymentOptions: undefined, transferAmounts: [{ method: 'Ark', available: true }] }
    const fetchMocker = lnurlServer(undefined, { body, arkAddress: fixtures.lib.address.ark[1].address })
    const { type } = renderStateful()
    type(LNURL)
    await waitFor(() => screen.getByDisplayValue(String(SATS)), settle)
    await clickContinue()
    await waitFor(() => screen.getByText('Arkade server key mismatch'), settle)
    expect(continueButton()).toBeDisabled()

    type(ARK)
    await waitFor(() => expect(current.arkAddress).toBe(ARK), settle)
    await waitFor(() => expect(continueButton()).toBeEnabled(), settle)
    fetchMocker.disableMocks()
  })

  it.each([500, 200_000])(
    'quotes a valid %i sat Arkade amount outside the default Lightning bounds',
    async (amount) => {
      const body = {
        ...payRequest,
        minSendable: 1_000_000,
        maxSendable: 100_000_000,
        paymentOptions: [
          { id: 'ln', type: 'lightning' },
          { id: 'ark', type: 'arkade', minSendable: 330_000, maxSendable: 1_000_000_000 },
        ],
      }
      const fetchMocker = lnurlServer(undefined, { body })
      try {
        const { type, navigate } = renderStateful()
        type(LNURL)
        await waitFor(() => expect(current.lnUrl).toBe(LNURL), settle)
        await new Promise((resolve) => setTimeout(resolve, 50))
        fireEvent.change(document.querySelector('input[name="send-amount"]')!, { target: { value: String(amount) } })
        await waitFor(() => expect(current.satoshis).toBe(amount), settle)
        expect(document.querySelector('footer.buttons-on-bottom button')).toBeEnabled()
        await clickContinue()
        await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails), settle)
        expect(current.pendingLnSend).toMatchObject({ railId: LNURL_ARKADE_RAIL, amount })
      } finally {
        fetchMocker.disableMocks()
      }
    },
  )

  it('does not pin flexible Arkade amount to a fixed Lightning amount', async () => {
    const body = {
      ...payRequest,
      minSendable: 5_000_000,
      maxSendable: 5_000_000,
      paymentOptions: [
        { id: 'ln', type: 'lightning' },
        { id: 'ark', type: 'arkade', minSendable: 330_000, maxSendable: 1_000_000_000 },
      ],
    }
    const fetchMocker = lnurlServer(undefined, { body })
    try {
      const { type } = renderStateful()
      fireEvent.change(document.querySelector('input[name="send-amount"]')!, { target: { value: '7000' } })
      await waitFor(() => expect(current.satoshis).toBe(7000), settle)
      type(LNURL)
      await waitFor(() => expect(current.lnUrl).toBe(LNURL), settle)
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(current.satoshis).toBe(7000)
      expect((document.querySelector('input[name="send-amount"]') as HTMLInputElement).readOnly).toBe(false)
    } finally {
      fetchMocker.disableMocks()
    }
  })

  it('keeps a gap between supported LNURL ranges disabled and accepts a corrected amount', async () => {
    const body = {
      ...payRequest,
      minSendable: 1_000_000,
      maxSendable: 2_000_000,
      paymentOptions: [
        { id: 'ln', type: 'lightning' },
        { id: 'ark', type: 'arkade', minSendable: 5_000_000, maxSendable: 10_000_000 },
      ],
    }
    const fetchMocker = lnurlServer(undefined, { body })
    try {
      const { type, navigate } = renderStateful()
      type(LNURL)
      await waitFor(() => expect(current.lnUrl).toBe(LNURL), settle)
      await new Promise((resolve) => setTimeout(resolve, 50))
      const amountInput = document.querySelector('input[name="send-amount"]') as HTMLInputElement
      expect(amountInput.readOnly).toBe(false)
      fireEvent.change(amountInput, { target: { value: '3000' } })
      expect(document.querySelector('footer.buttons-on-bottom button')).toBeDisabled()
      expect(screen.getByText('Invalid amount')).toBeInTheDocument()
      fireEvent.change(amountInput, { target: { value: '6000' } })
      await clickContinue()
      await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.SendDetails), settle)
      expect(current.pendingLnSend).toMatchObject({ railId: LNURL_ARKADE_RAIL, amount: 6000 })
    } finally {
      fetchMocker.disableMocks()
    }
  })

  it('does not widen fixed Lightning bounds with disabled, unnamed, token or unsupported options', async () => {
    const wider = { minSendable: 330_000, maxSendable: 1_000_000_000 }
    const body = {
      ...payRequest,
      paymentOptions: [
        { id: 'ln', type: 'lightning' },
        { id: 'disabled', type: 'arkade', available: false, ...wider },
        { id: '', type: 'arkade', ...wider },
        { id: 'token', type: 'arkade', asset: { symbol: 'TOKEN' }, ...wider },
        { id: 'onchain', type: 'onchain', ...wider },
        { id: 'unknown', type: 'other', ...wider },
      ],
    }
    const fetchMocker = lnurlServer(undefined, { body })
    try {
      const { type } = renderStateful()
      fireEvent.change(document.querySelector('input[name="send-amount"]')!, { target: { value: '7000' } })
      type(LNURL)
      await waitFor(() => screen.getByDisplayValue(String(SATS)), settle)
      expect((document.querySelector('input[name="send-amount"]') as HTMLInputElement).readOnly).toBe(true)
      expect(current.satoshis).toBe(SATS)
    } finally {
      fetchMocker.disableMocks()
    }
  })

  it('does not infer Lightning or pin an amount from an explicit unsupported options list', async () => {
    const body = { ...payRequest, paymentOptions: [{ id: 'onchain', type: 'onchain' }] }
    const fetchMocker = lnurlServer(undefined, { body })
    try {
      const { type } = renderStateful()
      fireEvent.change(document.querySelector('input[name="send-amount"]')!, { target: { value: '7000' } })
      type(LNURL)
      await waitFor(() => expect(current.lnUrl).toBe(LNURL), settle)
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(current.satoshis).toBe(7000)
      expect((document.querySelector('input[name="send-amount"]') as HTMLInputElement).readOnly).toBe(false)
      expect(document.querySelector('footer.buttons-on-bottom button')).toBeDisabled()
    } finally {
      fetchMocker.disableMocks()
    }
  })

  it('pins the only whole satoshi inside fractional millisatoshi bounds', async () => {
    const body = { ...payRequest, minSendable: 1_001, maxSendable: 2_999, paymentOptions: undefined }
    const fetchMocker = lnurlServer(undefined, { body })
    try {
      const { type } = renderStateful()
      type(LNURL)
      await waitFor(() => screen.getByDisplayValue('2'), settle)
      expect(current.satoshis).toBe(2)
      expect((document.querySelector('input[name="send-amount"]') as HTMLInputElement).readOnly).toBe(true)
    } finally {
      fetchMocker.disableMocks()
    }
  })

  it('asks for a contact name when the save tick is set, for that payee only', async () => {
    localStorage.clear()
    const user = userEvent.setup()
    const { type } = renderStateful()
    type(ARK)
    await waitFor(() => expect(current.arkAddress).toBe(ARK), settle)

    const tick = () => screen.getByRole('checkbox', { name: 'Save this payee as a contact' })
    await user.click(screen.getByText('Save this payee as a contact'))
    const name = screen.getByLabelText('Name (optional)')
    await user.type(name, 'Alice')
    expect(screen.getByLabelText('Name (optional)')).toBe(name)
    expect(document.activeElement).toBe(name)
    expect(tick()).not.toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Save contact' }))
    expect(screen.queryByTestId('sheet-modal')).not.toBeInTheDocument()
    expect(current.saveAsContact).toEqual({ address: ARK, name: 'Alice' })
    expect(tick()).toBeChecked()

    type(BTC)
    expect(screen.queryByText('Save this payee as a contact')).not.toBeInTheDocument()
    await waitFor(() => expect(current.address).toBe(BTC), settle)
    await waitFor(() => expect(current.saveAsContact).toBeUndefined())
    expect(tick()).not.toBeChecked()

    type(ARK)
    await waitFor(() => expect(current.arkAddress).toBe(ARK), settle)
    expect(tick()).not.toBeChecked()
  })

  it('leaves the save tick off when the name sheet is cancelled', async () => {
    localStorage.clear()
    const { type } = renderStateful()
    type(ARK)
    await waitFor(() => expect(current.arkAddress).toBe(ARK), settle)

    await userEvent.setup().click(screen.getByText('Save this payee as a contact'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByTestId('sheet-modal')).not.toBeInTheDocument()
    expect(current.saveAsContact).toBeUndefined()
    expect(screen.getByRole('checkbox', { name: 'Save this payee as a contact' })).not.toBeChecked()
  })

  it('saves the address typed after a payment URI, not the URI payee', async () => {
    localStorage.clear()
    const { type } = renderStateful()
    type(`bitcoin:${BTC}?ark=${ARK}`)
    await waitFor(() => expect(sendDestination(current)).toBe(ARK), settle)

    type(BTC)
    await waitFor(() => expect(current.arkAddress).toBeUndefined(), settle)
    expect(sendDestination(current)).toBe(BTC)
  })

  it('offers no save tick for an invoice pasted after a payment URI', async () => {
    localStorage.clear()
    const { type } = renderStateful()
    type(`bitcoin:${BTC}?ark=${ARK}`)
    await waitFor(() => expect(screen.getByText('Save this payee as a contact')).toBeInTheDocument(), settle)

    type(fixtures.lib.bolt11.invoice)
    await waitFor(() => expect(current.invoice).toBe(fixtures.lib.bolt11.invoice.toLowerCase()), settle)
    expect(sendDestination(current)).toBeUndefined()
    expect(screen.queryByText('Save this payee as a contact')).not.toBeInTheDocument()
  })
})

describe('Max to an LNURL whose rail charges a fee', () => {
  const LNURL = 'alice@pay.example'
  const BALANCE = 995
  const FEE = 5

  let current: SendInfo = emptySendInfo
  const StatefulForm = (options: TreeOptions) => {
    const [sendInfo, setSendInfo] = useState<SendInfo>(emptySendInfo)
    current = sendInfo
    return sendFormTree({ ...options, flowContext: { ...mockFlowContextValue, sendInfo, setSendInfo } })
  }

  const svcWallet = {
    ...mockSvcWallet,
    getAddress: () => fixtures.lib.address.ark[0].address,
    getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
  } as any

  const run = async (enterAmount: (input: () => HTMLInputElement) => void) => {
    const fetchMocker = createFetchMock(vi)
    fetchMocker.enableMocks()
    fetchMocker.mockResponse(() =>
      JSON.stringify({
        tag: 'payRequest',
        callback: 'https://pay.example/cb',
        minSendable: 1_000,
        maxSendable: 1_000_000_000,
        metadata: '[]',
        paymentOptions: [{ id: 'ln', type: 'lightning' }],
      }),
    )
    const quoted: number[] = []
    const sendRouter = async () =>
      ({
        options: async ({ raw, amount }: { raw: string; amount: number }) => [
          {
            railId: LNURL_LIGHTNING_RAIL,
            quote: async () => {
              quoted.push(amount)
              return {
                railId: LNURL_LIGHTNING_RAIL,
                amount,
                fee: FEE,
                total: amount + FEE,
                meta: { lnurl: { target: raw } },
              }
            },
          },
        ],
      }) as never
    const { container } = render(
      <StatefulForm
        walletContext={{
          ...mockWalletContextValue,
          balance: BALANCE,
          availableBalance: BALANCE,
          svcWallet,
        }}
        swapsContext={{ sendRouter }}
      />,
    )
    fireEvent.change(container.querySelector('input[name="send-address"]')!, { target: { value: LNURL } })
    await waitFor(() => expect(current.lnUrl).toBe(LNURL), { timeout: 3_000 })
    enterAmount(() => container.querySelector<HTMLInputElement>('input[name="send-amount"]')!)
    const button = await waitFor(() => screen.getByText('Continue').closest('button')!, { timeout: 3_000 })
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(button)
    await waitFor(() => expect(current.pendingLnSend).toBeDefined(), { timeout: 3_000 })
    fetchMocker.disableMocks()
    return quoted
  }

  it('takes the fee out of the amount, so Max spends exactly the balance', async () => {
    const quoted = await run(() => fireEvent.click(screen.getByText(/available/)))

    expect(quoted).toEqual([BALANCE, BALANCE - FEE])
    expect(current.pendingLnSend).toMatchObject({ amount: BALANCE - FEE, total: BALANCE })
    expect(current.satoshis).toBe(BALANCE - FEE)
  })

  it('leaves a typed amount as typed, even when it is the whole balance', async () => {
    const quoted = await run((input) => fireEvent.change(input(), { target: { value: String(BALANCE) } }))

    expect(quoted).toEqual([BALANCE])
    expect(current.pendingLnSend).toMatchObject({ amount: BALANCE, total: BALANCE + FEE })
  })
})
