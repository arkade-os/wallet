import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, act, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { FlowContext } from '../../../providers/flow'
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
import fixtures from '../../fixtures.json'

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

function renderSendForm(
  svcWallet: unknown = mockSvcWallet,
  overrides: {
    config?: Record<string, any>
    wallet?: Record<string, any>
  } = {},
) {
  function SendFormWithState() {
    const [sendInfo, setSendInfo] = useState(mockFlowContextValue.sendInfo)

    const config = {
      ...mockConfigContextValue.config,
      ...overrides.config,
      apps: {
        ...mockConfigContextValue.config.apps,
        ...overrides.config?.apps,
      },
    }

    const wallet = {
      ...mockWalletContextValue,
      ...overrides.wallet,
      svcWallet: svcWallet as any,
    }

    return (
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <ConfigContext.Provider value={{ ...mockConfigContextValue, config } as any}>
            <FiatContext.Provider value={mockFiatContextValue as any}>
              <SwapsContext.Provider value={mockSwapsContextValue as any}>
                <OptionsContext.Provider value={mockOptionsContextValue as any}>
                  <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo, setSendInfo } as any}>
                    <WalletContext.Provider value={wallet as any}>
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
      </NavigationContext.Provider>
    )
  }

  return render(<SendFormWithState />)
}

function renderLoadingSendForm() {
  return render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={mockAspContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <FiatContext.Provider value={mockFiatContextValue as any}>
            <SwapsContext.Provider value={mockSwapsContextValue as any}>
              <OptionsContext.Provider value={mockOptionsContextValue as any}>
                <FlowContext.Provider value={mockFlowContextValue as any}>
                  <WalletContext.Provider value={mockWalletContextValue}>
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
    renderLoadingSendForm()
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

  it('does not validate while typing; validates once on blur', async () => {
    const lnurl = await import('../../../lib/lnurl')
    const mockIsValidLnUrl = vi.mocked(lnurl.isValidLnUrl)
    mockIsValidLnUrl.mockClear()

    renderSendForm(mockSvcWalletWithAddresses)

    const input = document.querySelector('input[name="send-address"]') as HTMLInputElement
    expect(input).not.toBeNull()

    // Simulate typing 'user@example.com' character by character using fireEvent
    const address = 'user@example.com'
    for (const char of address) {
      const nextValue = input.value + char
      fireEvent.change(input, { target: { value: nextValue } })
    }

    // typing never triggers parseRecipient, no matter how long the user pauses
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(mockIsValidLnUrl).not.toHaveBeenCalled()

    // leaving the field triggers parseRecipient once with the full value
    fireEvent.blur(input)
    expect(mockIsValidLnUrl).toHaveBeenCalledTimes(1)
    expect(mockIsValidLnUrl).toHaveBeenCalledWith('user@example.com')
  }, 10000)

  it('shows invalid recipients inline instead of in the global error banner', async () => {
    renderSendForm(mockSvcWalletWithAddresses)

    const input = document.querySelector('input[name="send-address"]') as HTMLInputElement
    expect(input).not.toBeNull()

    fireEvent.change(input, { target: { value: 'tiero94@tet' } })
    expect(screen.queryByText('Invalid recipient address')).not.toBeInTheDocument()

    fireEvent.blur(input)

    expect(screen.getByText('Invalid recipient address')).toBeInTheDocument()
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
  }, 10000)

  it('keeps continue disabled when recipient compatibility errors are inline', async () => {
    vi.useRealTimers()

    const assetId = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd'
    const svcWallet = {
      ...mockSvcWalletWithAddresses,
      assetManager: {
        getAssetDetails: vi.fn().mockResolvedValue({
          metadata: { name: 'Test token', ticker: 'TST', decimals: 8 },
        }),
      },
    }

    renderSendForm(svcWallet, {
      config: { apps: { assets: { enabled: true } } },
      wallet: {
        assetBalances: [{ assetId, amount: BigInt(100_000_000) }],
        setCacheEntry: (_assetId: string, details: unknown) => details,
      },
    })

    const recipientInput = document.querySelector('input[name="send-address"]') as HTMLInputElement
    const amountInput = document.querySelector('input[name="send-amount"]') as HTMLInputElement

    fireEvent.change(recipientInput, { target: { value: fixtures.lib.address.btc[0] } })
    fireEvent.blur(recipientInput)
    fireEvent.change(amountInput, { target: { value: '1' } })

    const continueButton = await screen.findByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).not.toBeDisabled())

    fireEvent.click(await screen.findByTestId('asset-selector'))
    fireEvent.click(await screen.findByTestId('asset-tst-option'))

    expect(screen.getByText('Assets can only be sent to Arkade addresses')).toBeInTheDocument()
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
    expect(continueButton).toBeDisabled()
  }, 10000)

  it('native paste validates immediately, without waiting for blur', async () => {
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

    expect(mockIsValidLnUrl).toHaveBeenCalledTimes(1)
    expect(mockIsValidLnUrl).toHaveBeenCalledWith('user@example.com')
  }, 10000)
})
