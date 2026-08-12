import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import createFetchMock from 'vitest-fetch-mock'
import { emptySendInfo, FlowContext } from '../../../providers/flow'
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
import { NavigationContext } from '../../../providers/navigation'
import SendForm from '../../../screens/Wallet/Send/Form'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { OptionsContext } from '../../../providers/options'
import { Currencies, Unit } from '../../../lib/types'

describe('Send screen', () => {
  const renderSendForm = ({
    configContext = mockConfigContextValue,
    fiatContext = mockFiatContextValue,
    flowContext = mockFlowContextValue,
    walletContext = { ...mockWalletContextValue, svcWallet: mockSvcWallet as any },
  } = {}) =>
    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <ConfigContext.Provider value={configContext as any}>
            <FiatContext.Provider value={fiatContext as any}>
              <OptionsContext.Provider value={mockOptionsContextValue as any}>
                <FlowContext.Provider value={flowContext as any}>
                  <WalletContext.Provider value={walletContext as any}>
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <SendForm />
                    </LimitsContext.Provider>
                  </WalletContext.Provider>
                </FlowContext.Provider>
              </OptionsContext.Provider>
            </FiatContext.Provider>
          </ConfigContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
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
})
