import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Transaction from '../../../screens/Wallet/Transaction'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import {
  mockAspContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockSvcWallet,
  mockWalletContextValue,
} from '../mocks'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'
import SendForm from '../../../screens/Wallet/Send/Form'

describe('Send screen', () => {
  it('renders the loading send screen correctly', async () => {
    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={mockFlowContextValue}>
            <WalletContext.Provider value={mockWalletContextValue}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <SendForm />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
    // should be loading because svcWallet is undefined
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
  it('renders the send screen correctly', async () => {
    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={mockFlowContextValue}>
            <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: mockSvcWallet as any }}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <SendForm />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
    // should not be loading because svcWallet is defined
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    // find text elements
    expect(screen.getByText('Max')).toBeInTheDocument()
    expect(screen.getByText('Send')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('0 SATS available')).toBeInTheDocument()
    expect(screen.getByText('Recipient address')).toBeInTheDocument()
    // button continue should be present
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })
})
