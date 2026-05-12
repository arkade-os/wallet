import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BoltzChainSwap } from '@arkade-os/boltz-swap'
import AppBoltzSwap from '../../../screens/Apps/Boltz/Swap'
import { ConfigContext } from '../../../providers/config'
import { FlowContext } from '../../../providers/flow'
import { SwapsContext } from '../../../providers/swaps'
import { ToastProvider } from '../../../components/Toast'
import { mockConfigContextValue, mockFlowContextValue, mockSwapsContextValue } from '../mocks'

const baseChainSwap = {
  id: 'swap-id',
  type: 'chain',
  createdAt: Math.floor(Date.now() / 1000),
  preimage: '',
  ephemeralKey: '',
  feeSatsPerByte: 1,
  status: 'transaction.claimed',
  request: { from: 'ARK', to: 'BTC' },
}

function renderWithSwap(swapInfo: BoltzChainSwap) {
  return render(
    <ConfigContext.Provider value={mockConfigContextValue}>
      <FlowContext.Provider value={{ ...mockFlowContextValue, swapInfo }}>
        <SwapsContext.Provider value={mockSwapsContextValue}>
          <ToastProvider>
            <AppBoltzSwap />
          </ToastProvider>
        </SwapsContext.Provider>
      </FlowContext.Provider>
    </ConfigContext.Provider>,
  )
}

describe('AppBoltzSwap', () => {
  it('renders restored chain swap without crashing when claimDetails is missing', () => {
    // Restored chain swaps from @arkade-os/boltz-swap only populate lockupDetails,
    // and refundDetails.amount is optional — both ends can be undefined.
    const swap = {
      ...baseChainSwap,
      response: {
        id: 'swap-id',
        lockupDetails: {
          amount: undefined as unknown as number,
          lockupAddress: 'bcrt1qlockup',
          serverPublicKey: '',
          timeoutBlockHeight: 0,
        },
      },
    } as unknown as BoltzChainSwap

    renderWithSwap(swap)

    expect(screen.getByText('Chain Swap')).toBeInTheDocument()
    expect(screen.getByTestId('Amount').textContent).toBe('—')
    expect(screen.getByTestId('Fees').textContent).toBe('—')
    expect(screen.getByTestId('Total').textContent).toBe('—')
  })

  it('renders chain swap with full lockup/claim details', () => {
    const swap = {
      ...baseChainSwap,
      response: {
        id: 'swap-id',
        lockupDetails: {
          amount: 2275,
          lockupAddress: 'bcrt1qlockup',
          serverPublicKey: '',
          timeoutBlockHeight: 0,
        },
        claimDetails: {
          amount: 2111,
          lockupAddress: 'bcrt1qclaim',
          serverPublicKey: '',
          timeoutBlockHeight: 0,
        },
      },
    } as unknown as BoltzChainSwap

    renderWithSwap(swap)

    expect(screen.getByTestId('Amount').textContent).toBe('2,111 SATS')
    expect(screen.getByTestId('Fees').textContent).toBe('164 SATS')
    expect(screen.getByTestId('Total').textContent).toBe('2,275 SATS')
  })
})
