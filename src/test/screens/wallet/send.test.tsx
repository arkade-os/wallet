import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, cleanup, waitFor } from '@testing-library/react'
import createFetchMock from 'vitest-fetch-mock'
import { emptySendInfo, FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFeesContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockSwapsContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockOptionsContextValue,
  mockSvcWallet,
  mockSvcWalletWithAddresses,
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
import { FeesContext } from '../../../providers/fees'

// Mock lnurl module so we can spy on isValidLnUrl
vi.mock('../../../lib/lnurl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/lnurl')>()
  return {
    ...actual,
    isValidLnUrl: vi.fn().mockImplementation(actual.isValidLnUrl),
  }
})

function renderSendForm(svcWallet: unknown = mockSvcWallet) {
  return render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={mockAspContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <FiatContext.Provider value={mockFiatContextValue as any}>
            <SwapsContext.Provider value={mockSwapsContextValue as any}>
              <OptionsContext.Provider value={mockOptionsContextValue as any}>
                <FlowContext.Provider value={mockFlowContextValue as any}>
                  <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: svcWallet as any }}>
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <FeesContext.Provider value={mockFeesContextValue as any}>
                        <SendForm />
                      </FeesContext.Provider>
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
}

describe('Send screen', () => {
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
    renderSendForm()
    // find text elements
    expect(screen.getByText('Max')).toBeInTheDocument()
    expect(screen.getByText('Send')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('0 SATS available')).toBeInTheDocument()
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
})

describe('Send form recipient validation timing', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('debounces validation while typing and hides the invalid error until blur', async () => {
    const lnurl = await import('../../../lib/lnurl')
    const mockIsValidLnUrl = vi.mocked(lnurl.isValidLnUrl)
    mockIsValidLnUrl.mockClear()

    renderSendForm(mockSvcWalletWithAddresses)

    const input = document.querySelector('input[name="send-address"]') as HTMLInputElement
    expect(input).not.toBeNull()
    fireEvent.focus(input)

    // Simulate typing an invalid address character by character
    const address = 'user@bad'
    for (const char of address) {
      const nextValue = input.value + char
      fireEvent.change(input, { target: { value: nextValue } })
    }

    // isValidLnUrl should NOT have been called yet (debounce suppresses parseRecipient)
    expect(mockIsValidLnUrl).not.toHaveBeenCalled()

    // After the debounce, parseRecipient runs once — but the catch-all error
    // stays hidden while the field has focus
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(mockIsValidLnUrl).toHaveBeenCalledTimes(1)
    expect(mockIsValidLnUrl).toHaveBeenCalledWith('user@bad')
    expect(screen.queryByText('Invalid recipient address')).toBeNull()

    // Leaving the field re-parses immediately and surfaces the error
    fireEvent.blur(input)
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(screen.queryByText('Invalid recipient address')).not.toBeNull()
  }, 10000)

  it('native paste validates immediately, without waiting for the debounce', async () => {
    const lnurl = await import('../../../lib/lnurl')
    const mockIsValidLnUrl = vi.mocked(lnurl.isValidLnUrl)
    mockIsValidLnUrl.mockClear()

    renderSendForm(mockSvcWalletWithAddresses)

    const input = document.querySelector('input[name="send-address"]') as HTMLInputElement
    expect(input).not.toBeNull()

    // Simulate a native paste (Ctrl+V): paste event followed by the change event
    const address = 'user@example.com'
    fireEvent.paste(input)
    fireEvent.change(input, { target: { value: address } })

    // 0ms tick — no 400ms debounce wait
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(mockIsValidLnUrl).toHaveBeenCalledTimes(1)
    expect(mockIsValidLnUrl).toHaveBeenCalledWith('user@example.com')
  }, 10000)
})
