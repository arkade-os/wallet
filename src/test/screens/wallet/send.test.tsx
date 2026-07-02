import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import createFetchMock from 'vitest-fetch-mock'
import { emptySendInfo, FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockSwapsContextValue,
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
import { SwapsContext } from '../../../providers/swaps'
import { OptionsContext } from '../../../providers/options'
import { Currencies, CurrencyDisplay } from '../../../lib/types'

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
              <SwapsContext.Provider value={mockSwapsContextValue as any}>
                <OptionsContext.Provider value={mockOptionsContextValue as any}>
                  <FlowContext.Provider value={flowContext as any}>
                    <WalletContext.Provider value={walletContext as any}>
                      <LimitsContext.Provider value={mockLimitsContextValue}>
                        <SendForm />
                      </LimitsContext.Provider>
                    </WalletContext.Provider>
                  </FlowContext.Provider>
                </OptionsContext.Provider>
              </SwapsContext.Provider>
            </FiatContext.Provider>
          </ConfigContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )

  it('renders the loading send screen correctly', async () => {
    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <ConfigContext.Provider value={mockConfigContextValue as any}>
            <FiatContext.Provider value={mockFiatContextValue as any}>
              <SwapsContext.Provider value={mockSwapsContextValue as any}>
                <OptionsContext.Provider value={mockOptionsContextValue as any}>
                  <FlowContext.Provider value={mockFlowContextValue as any}>
                    <WalletContext.Provider value={mockWalletContextValue}>
                      <LimitsContext.Provider value={mockLimitsContextValue}>
                        <SendForm />
                      </LimitsContext.Provider>
                    </WalletContext.Provider>
                  </FlowContext.Provider>
                </OptionsContext.Provider>
              </SwapsContext.Provider>
            </FiatContext.Provider>
          </ConfigContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
    // should be loading because svcWallet is undefined
    expect(screen.getByTestId('loading-logo')).toBeInTheDocument()
  })
  it('renders the send screen correctly', async () => {
    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <ConfigContext.Provider value={mockConfigContextValue as any}>
            <FiatContext.Provider value={mockFiatContextValue as any}>
              <SwapsContext.Provider value={mockSwapsContextValue as any}>
                <OptionsContext.Provider value={mockOptionsContextValue as any}>
                  <FlowContext.Provider value={mockFlowContextValue as any}>
                    <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: mockSvcWallet as any }}>
                      <LimitsContext.Provider value={mockLimitsContextValue}>
                        <SendForm />
                      </LimitsContext.Provider>
                    </WalletContext.Provider>
                  </FlowContext.Provider>
                </OptionsContext.Provider>
              </SwapsContext.Provider>
            </FiatContext.Provider>
          </ConfigContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
    // find text elements
    expect(screen.getByText('Max')).toBeInTheDocument()
    expect(screen.getByText('Send')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('€0.00 available')).toBeInTheDocument()
    expect(screen.getByText('Recipient address')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  it('shows BTC units on the send amount field when currency and bitcoin unit are BTC', async () => {
    const walletValue = {
      ...mockWalletContextValue,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        getBalance: () => Promise.resolve({ available: 12128 }),
      } as any,
    }
    const configValue = {
      ...mockConfigContextValue,
      useFiat: false,
      config: { ...mockConfigContextValue.config, fiat: Currencies.BTC, currencyDisplay: CurrencyDisplay.BTC },
    }

    renderSendForm({ configContext: configValue, walletContext: walletValue })

    expect(await screen.findByText('0.00012128 BTC available')).toBeInTheDocument()
    expect(screen.queryByText('12,128 sats available')).not.toBeInTheDocument()
    expect(screen.getByText('BTC')).toBeInTheDocument()
  })

  it('shows BTC as the secondary send amount when fiat currency uses BTC as the bitcoin unit', async () => {
    const walletValue = {
      ...mockWalletContextValue,
      svcWallet: {
        ...mockSvcWallet,
        getAddress: () => 'tark1mockoffchain',
        getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
        getBalance: () => Promise.resolve({ available: 12128 }),
      } as any,
    }
    const configValue = {
      ...mockConfigContextValue,
      useFiat: true,
      config: { ...mockConfigContextValue.config, fiat: Currencies.USD, currencyDisplay: CurrencyDisplay.BTC },
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

    expect(await screen.findByText('0.0001 BTC')).toBeInTheDocument()
    expect(screen.queryByText('10,000 sats')).not.toBeInTheDocument()
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
      config: { ...mockConfigContextValue.config, fiat: Currencies.BTC, currencyDisplay: CurrencyDisplay.BTC },
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
    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <ConfigContext.Provider value={mockConfigContextValue as any}>
            <FiatContext.Provider value={mockFiatContextValue as any}>
              <SwapsContext.Provider value={mockSwapsContextValue as any}>
                <OptionsContext.Provider value={mockOptionsContextValue as any}>
                  <FlowContext.Provider value={flowValue as any}>
                    <WalletContext.Provider value={walletValue}>
                      <LimitsContext.Provider value={mockLimitsContextValue}>
                        <SendForm />
                      </LimitsContext.Provider>
                    </WalletContext.Provider>
                  </FlowContext.Provider>
                </OptionsContext.Provider>
              </SwapsContext.Provider>
            </FiatContext.Provider>
          </ConfigContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
    // amount input is bound to amountTextValue; before the fix it stayed empty
    const amountInput = await waitFor(() => screen.getByDisplayValue('21'))
    expect(amountInput).toHaveAttribute('name', 'send-amount')
    expect(amountInput).toHaveAttribute('readonly')
    fetchMocker.disableMocks()
  })

  it('keeps previously entered satoshis when parsing a BIP-21 URI without amount', async () => {
    vi.useFakeTimers()
    try {
      const setSendInfo = vi.fn()
      const initialSatoshis = 1234
      const onchainAddress = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'
      const bip21WithoutAmount = `bitcoin:${onchainAddress}`
      const flowValue = {
        ...mockFlowContextValue,
        sendInfo: { ...emptySendInfo, satoshis: initialSatoshis },
        setSendInfo,
      }
      const walletValue = {
        ...mockWalletContextValue,
        svcWallet: {
          ...mockSvcWallet,
          getAddress: () => 'tark1mockoffchain',
          getBoardingAddress: () => Promise.resolve('bcrt1mockboarding'),
          getBalance: () => Promise.resolve({ available: 1_000_000 }),
        } as any,
      }

      render(
        <NavigationContext.Provider value={mockNavigationContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <ConfigContext.Provider value={mockConfigContextValue as any}>
              <FiatContext.Provider value={mockFiatContextValue as any}>
                <SwapsContext.Provider value={mockSwapsContextValue as any}>
                  <OptionsContext.Provider value={mockOptionsContextValue as any}>
                    <FlowContext.Provider value={flowValue as any}>
                      <WalletContext.Provider value={walletValue}>
                        <LimitsContext.Provider value={mockLimitsContextValue}>
                          <SendForm />
                        </LimitsContext.Provider>
                      </WalletContext.Provider>
                    </FlowContext.Provider>
                  </OptionsContext.Provider>
                </SwapsContext.Provider>
              </FiatContext.Provider>
            </ConfigContext.Provider>
          </AspContext.Provider>
        </NavigationContext.Provider>,
      )

      const recipientInput = document.querySelector('input[name="send-address"]') as HTMLInputElement
      fireEvent.change(recipientInput, { target: { value: bip21WithoutAmount } })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
      })

      expect(
        setSendInfo.mock.calls.some(
          ([payload]) =>
            payload?.address === onchainAddress &&
            payload?.recipient === bip21WithoutAmount &&
            payload?.satoshis === initialSatoshis,
        ),
      ).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
