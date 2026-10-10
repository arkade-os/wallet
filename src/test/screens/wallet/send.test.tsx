import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../lib/appIntent', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/appIntent')>('../../../lib/appIntent')
  return { ...actual, redirectToCallback: vi.fn() }
})
vi.mock('../../../lib/directTaxiSend', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/directTaxiSend')>('../../../lib/directTaxiSend')
  return { ...actual, getPendingDirectTaxi: vi.fn(), sendDirectTaxi: vi.fn() }
})
import {
  FailedDirectTaxi,
  PendingDirectTaxi,
  ReturnedDirectTaxi,
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
import SendForm from '../../../screens/Wallet/Send/Form'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { OptionsContext } from '../../../providers/options'
import { Currencies, Unit } from '../../../lib/types'

describe('Send screen', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })
  beforeEach(() => {
    vi.mocked(getPendingDirectTaxi).mockReset().mockResolvedValue(undefined)
    vi.mocked(sendDirectTaxi).mockReset()
    vi.mocked(redirectToCallback).mockClear()
  })
  const sendForm = ({
    configContext = mockConfigContextValue,
    fiatContext = mockFiatContextValue,
    flowContext = mockFlowContextValue,
    navigationContext = mockNavigationContextValue,
    walletContext = { ...mockWalletContextValue, svcWallet: mockSvcWallet as any },
  } = {}) => (
    <NavigationContext.Provider value={navigationContext}>
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
})
