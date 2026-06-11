import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react'
import { FlowContext } from '../../../providers/flow'
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
import { FeesContext } from '../../../providers/fees'

const mockFeesContextValue = {
  calcOnchainOutputFee: () => 0,
  calcOnchainInputFee: () => 0,
}

// Mock lnurl module so we can spy on isValidLnUrl
vi.mock('../../../lib/lnurl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/lnurl')>()
  return {
    ...actual,
    checkLnUrlConditions: vi.fn().mockResolvedValue({
      callback: 'https://example.com/callback',
      minSendable: 1000,
      maxSendable: 100000000000,
      metadata: '[]',
    }),
    isValidLnUrl: vi.fn().mockImplementation(actual.isValidLnUrl),
  }
})

// Wallet mock with valid addresses to avoid getReceivingAddresses throwing
const mockSvcWalletWithAddresses = {
  ...mockSvcWallet,
  getAddress: () => Promise.resolve('tark1mock_offchain_address'),
  getBoardingAddress: () => Promise.resolve('bcrt1mock_boarding_address'),
  getBalance: () => Promise.resolve({ available: 100000 }),
}

function renderSendForm() {
  return render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={mockAspContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <FiatContext.Provider value={mockFiatContextValue as any}>
            <SwapsContext.Provider value={mockSwapsContextValue as any}>
              <OptionsContext.Provider value={mockOptionsContextValue as any}>
                <FlowContext.Provider value={mockFlowContextValue as any}>
                  <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: mockSvcWallet as any }}>
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
    expect(screen.getByText('€0.00 available')).toBeInTheDocument()
    expect(screen.getByText('Recipient address')).toBeInTheDocument()
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })
})

describe('Send form debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('debounces parseRecipient: isValidLnUrl not called immediately while typing, called once after 400ms', async () => {
    const lnurl = await import('../../../lib/lnurl')
    const mockIsValidLnUrl = vi.mocked(lnurl.isValidLnUrl)
    mockIsValidLnUrl.mockClear()

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <ConfigContext.Provider value={mockConfigContextValue as any}>
            <FiatContext.Provider value={mockFiatContextValue as any}>
              <SwapsContext.Provider value={mockSwapsContextValue as any}>
                <OptionsContext.Provider value={mockOptionsContextValue as any}>
                  <FlowContext.Provider value={mockFlowContextValue as any}>
                    <WalletContext.Provider
                      value={{ ...mockWalletContextValue, svcWallet: mockSvcWalletWithAddresses as any }}
                    >
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

    const input = document.querySelector('input[name="send-address"]') as HTMLInputElement
    expect(input).not.toBeNull()

    // Simulate typing 'user@example.com' character by character using fireEvent
    const address = 'user@example.com'
    for (const char of address) {
      const nextValue = input.value + char
      fireEvent.change(input, { target: { value: nextValue } })
    }

    // isValidLnUrl should NOT have been called yet (debounce suppresses parseRecipient)
    expect(mockIsValidLnUrl).not.toHaveBeenCalled()

    // Advance timers by 400ms to trigger the debounce
    act(() => {
      vi.advanceTimersByTime(400)
    })

    // After debounce fires, parseRecipient runs once and reaches isValidLnUrl check
    expect(mockIsValidLnUrl).toHaveBeenCalledTimes(1)
    expect(mockIsValidLnUrl).toHaveBeenCalledWith('user@example.com')
  }, 10000)
})
