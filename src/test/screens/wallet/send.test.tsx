import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
import SendForm from '../../../screens/Wallet/Send/Form'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { OptionsContext } from '../../../providers/options'
import { SwapsContext } from '../../../providers/swaps'
import { createSendRouter, LNURL_ARKADE_RAIL } from '../../../lib/sendRouter'
import { Currencies, Unit } from '../../../lib/types'
import fixtures from '../../fixtures.json'

type TreeOptions = {
  configContext?: unknown
  fiatContext?: unknown
  flowContext?: unknown
  walletContext?: unknown
  swapsContext?: unknown
  navigationContext?: typeof mockNavigationContextValue
}

const sendFormTree = ({
  configContext = mockConfigContextValue,
  fiatContext = mockFiatContextValue,
  flowContext = mockFlowContextValue,
  walletContext = { ...mockWalletContextValue, svcWallet: mockSvcWallet as any },
  swapsContext = {},
  navigationContext = mockNavigationContextValue,
}: TreeOptions = {}) => (
  <NavigationContext.Provider value={navigationContext}>
    <AspContext.Provider value={mockAspContextValue}>
      <ConfigContext.Provider value={configContext as any}>
        <FiatContext.Provider value={fiatContext as any}>
          <OptionsContext.Provider value={mockOptionsContextValue as any}>
            <FlowContext.Provider value={flowContext as any}>
              <WalletContext.Provider value={walletContext as any}>
                <SwapsContext.Provider value={swapsContext as any}>
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <SendForm />
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

describe('Send screen', () => {
  const renderSendForm = (options: TreeOptions = {}) => render(sendFormTree(options))
  it('renders the loading send screen correctly', async () => {
    renderSendForm({ walletContext: { ...mockWalletContextValue, svcWallet: undefined } })
    // should be loading because svcWallet is undefined
    expect(screen.getByTestId('loading-logo')).toBeInTheDocument()
  })
  it('renders the send screen correctly', async () => {
    renderSendForm()
    // find text elements
    expect(screen.getByText('Max')).toBeInTheDocument()
    expect(screen.getByText('Send')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('€0.00 available')).toBeInTheDocument()
    expect(screen.getByText('Recipient address')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
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
})

describe('a changed recipient', () => {
  const LNURL = 'alice@pay.example'
  const BTC = 'bcrt1pj7fdvrpdsn0cl6722tmcvwcw4yqpe46020g43nhgzl90qq4aqjrs33du9f'
  const ARK = fixtures.lib.address.ark[0].address
  const SATS = 5_000

  let current: SendInfo = emptySendInfo
  const StatefulForm = (options: TreeOptions) => {
    const [sendInfo, setSendInfo] = useState<SendInfo>({ ...emptySendInfo, satoshis: SATS })
    current = sendInfo
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
  const lnurlServer = (held?: Promise<void>) => {
    const fetchMocker = createFetchMock(vi)
    fetchMocker.enableMocks()
    fetchMocker.mockResponse(async (req) => {
      if (req.url.includes('paymentOption=')) return JSON.stringify({ paymentOption: 'ark', paymentDestination: ARK })
      await held
      return JSON.stringify(payRequest)
    })
    return fetchMocker
  }

  const renderStateful = () => {
    const sendRouter = vi.fn(async () => createSendRouter({ wallet: svcWallet }))
    const navigate = vi.fn()
    const { container } = render(
      <StatefulForm
        walletContext={walletContext}
        swapsContext={{ sendRouter }}
        navigationContext={{ ...mockNavigationContextValue, navigate }}
      />,
    )
    const type = (value: string) =>
      fireEvent.change(container.querySelector('input[name="send-address"]')!, { target: { value } })
    return { sendRouter, navigate, type }
  }
  const settle = { timeout: 3_000 }
  const clickContinue = async () => {
    const button = screen.getByText('Continue').closest('button')!
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
})
