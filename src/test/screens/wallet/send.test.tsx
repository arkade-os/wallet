import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../lib/appIntent', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/appIntent')>('../../../lib/appIntent')
  return { ...actual, redirectToCallback: vi.fn() }
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
import { SwapsContext } from '../../../providers/swaps'
import type { Outcome } from '@arkade-os/swap'
import SendForm from '../../../screens/Wallet/Send/Form'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { OptionsContext } from '../../../providers/options'
import { Currencies, Unit } from '../../../lib/types'

describe('Send screen', () => {
  beforeEach(() => {
    vi.mocked(getPendingAssetPayment).mockReset().mockResolvedValue(undefined)
    vi.mocked(getPendingDirectTaxi).mockReset().mockResolvedValue(undefined)
    vi.mocked(sendDirectTaxi).mockReset()
    vi.mocked(payAssetRequest).mockReset()
    vi.mocked(redirectToCallback).mockClear()
  })
  const sendForm = ({
    aspContext = mockAspContextValue,
    configContext = mockConfigContextValue,
    fiatContext = mockFiatContextValue,
    flowContext = mockFlowContextValue,
    navigationContext = mockNavigationContextValue,
    walletContext = { ...mockWalletContextValue, svcWallet: mockSvcWallet as any },
    outcomeOf = undefined as ((id: string) => Outcome | undefined) | undefined,
  } = {}) => (
    <NavigationContext.Provider value={navigationContext}>
      <AspContext.Provider value={aspContext}>
        <ConfigContext.Provider value={configContext as any}>
          <FiatContext.Provider value={fiatContext as any}>
            <OptionsContext.Provider value={mockOptionsContextValue as any}>
              <FlowContext.Provider value={flowContext as any}>
                <WalletContext.Provider value={walletContext as any}>
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    {outcomeOf ? (
                      <SwapsContext.Provider value={{ outcomeOf } as never}>
                        <SendForm />
                      </SwapsContext.Provider>
                    ) : (
                      <SendForm />
                    )}
                  </LimitsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </OptionsContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>
  )
  const renderSendForm = (context: Parameters<typeof sendForm>[0] = {}) => render(sendForm(context))

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

  it.each(['returned', 'forgotten'] as const)(
    'restores the bitcoin amount field when a pending Taxi payment is %s',
    async (outcome) => {
      const { payment, resume, forget } = pendingPayment()
      if (outcome === 'returned') resume.mockRejectedValue(new ReturnedDirectTaxi(payment.record))
      else resume.mockRejectedValue(payment)
      vi.mocked(getPendingDirectTaxi).mockResolvedValue(payment)
      const { setSendInfo } = appSendSetup(false)
      const button = await screen.findByText(outcome === 'returned' ? 'Check Taxi payment' : 'Forget Taxi payment')
      fireEvent.click(button)
      await waitFor(() => expect(document.querySelector('input[name="send-amount"]')).toHaveValue(100))
      expect(await screen.findByText('0.00000100 BTC')).toBeInTheDocument()
      expect(setSendInfo).toHaveBeenCalledWith({ arkAddress: 'old-taxi-recipient', satoshis: 100 })
      expect(forget).toHaveBeenCalledTimes(outcome === 'forgotten' ? 1 : 0)
      expect(sendDirectTaxi).not.toHaveBeenCalled()
    },
  )

  it.each(['returned', 'forgotten'] as const)(
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
      const button = await screen.findByText(outcome === 'returned' ? 'Check Taxi payment' : 'Forget Taxi payment')
      fireEvent.click(button)
      await waitFor(() => expect(document.querySelector('input[name="send-amount"]')).toHaveValue(123.45))
      expect(screen.getByTestId('asset-selector')).toHaveTextContent('REC')
      expect(setSendInfo).toHaveBeenCalledWith({
        arkAddress: 'old-taxi-recipient',
        assets: [{ assetId: 'recorded-asset', amount: 12345n }],
        satoshis: 0,
      })
      expect(forget).toHaveBeenCalledTimes(outcome === 'forgotten' ? 1 : 0)
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
