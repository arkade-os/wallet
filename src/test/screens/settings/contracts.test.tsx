import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Contracts from '../../../screens/Settings/Contracts'
import { WalletContext } from '../../../providers/wallet'
import { mockWalletContextValue } from '../mocks'
import type { Contract } from '@arkade-os/sdk'

const mockContracts: Contract[] = [
  {
    type: 'vhtlc',
    state: 'inactive',
    address: 'ark1qinactive000000000000000000000000',
    script: 'abcdef1234567890inactive',
    params: {},
    createdAt: 1717000000000,
  },
  {
    type: 'default',
    state: 'active',
    address: 'ark1qactive0000000000000000000000000',
    script: 'abcdef1234567890active00',
    params: {},
    createdAt: 1717000000000,
  },
]

// Builds an `advanced` capability group whose getContractManager returns the
// given contracts, mirroring how the wallet provider exposes them.
const advancedWithContracts = (contracts: Contract[]) => ({
  ...mockWalletContextValue.advanced,
  getContractManager: async () => ({ getContracts: async () => contracts }) as any,
})

function renderContracts(value: Partial<typeof mockWalletContextValue>) {
  return render(
    <WalletContext.Provider value={{ ...mockWalletContextValue, ...value } as any}>
      <Contracts />
    </WalletContext.Provider>,
  )
}

describe('Contracts screen', () => {
  it('renders a loading state when the wallet is not ready', () => {
    renderContracts({ walletReady: false })
    // Loading logo renders — no crash, no contract content
    expect(screen.queryByText('Contracts')).not.toBeInTheDocument()
  })

  it('renders empty state when there are no contracts', async () => {
    renderContracts({ walletReady: true, advanced: advancedWithContracts([]) })

    await screen.findByText('Contracts')
    expect(screen.getByText('No contracts found.')).toBeInTheDocument()
  })

  it('renders contract cards with type and state', async () => {
    renderContracts({ walletReady: true, advanced: advancedWithContracts(mockContracts) })

    await screen.findByText('Contracts')
    expect(screen.getByText('default')).toBeInTheDocument()
    expect(screen.getByText('vhtlc')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('inactive')).toBeInTheDocument()
  })

  it('sorts active contracts before inactive ones', async () => {
    renderContracts({ walletReady: true, advanced: advancedWithContracts(mockContracts) })

    await screen.findByText('Contracts')
    const cards = screen.getAllByText(/^(active|inactive)$/)
    expect(cards[0].textContent).toBe('active')
    expect(cards[1].textContent).toBe('inactive')
  })
})
