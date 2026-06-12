import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Contracts from '../../../screens/Settings/Contracts'
import { WalletContext } from '../../../providers/wallet'
import { mockWalletContextValue, mockSvcWallet } from '../mocks'
import type { Contract } from '@arkade-os/sdk'

const mockContracts: Contract[] = [
  {
    type: 'vhtlc',
    state: 'inactive',
    address: 'ark1qinactive000000000000000000000000',
    script: 'abcdef1234567890inactive',
    createdAt: 1717000000000,
    params: {},
  },
  {
    type: 'default',
    state: 'active',
    address: 'ark1qactive0000000000000000000000000',
    script: 'abcdef1234567890active00',
    createdAt: 1717000000000,
    params: {},
  },
]

function renderContracts(svcWallet: typeof mockSvcWallet | undefined) {
  return render(
    <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet } as any}>
      <Contracts />
    </WalletContext.Provider>,
  )
}

describe('Contracts screen', () => {
  it('renders a loading state when svcWallet is undefined', () => {
    renderContracts(undefined)
    // Loading logo renders — no crash, no contract content
    expect(screen.queryByText('Contracts')).not.toBeInTheDocument()
  })

  it('renders empty state when there are no contracts', async () => {
    const svcWalletWithContracts = {
      ...mockSvcWallet,
      getContractManager: () =>
        Promise.resolve({
          getContracts: () => Promise.resolve([]),
        }),
    }
    renderContracts(svcWalletWithContracts as any)

    await screen.findByText('Contracts')
    expect(screen.getByText('No contracts found.')).toBeInTheDocument()
  })

  it('renders contract cards with type and state', async () => {
    const svcWalletWithContracts = {
      ...mockSvcWallet,
      getContractManager: () =>
        Promise.resolve({
          getContracts: () => Promise.resolve(mockContracts),
        }),
    }
    renderContracts(svcWalletWithContracts as any)

    await screen.findByText('Contracts')
    expect(screen.getByText('default')).toBeInTheDocument()
    expect(screen.getByText('vhtlc')).toBeInTheDocument()
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0)
  })

  it('sorts active contracts before inactive ones', async () => {
    const svcWalletWithContracts = {
      ...mockSvcWallet,
      getContractManager: () =>
        Promise.resolve({
          getContracts: () => Promise.resolve(mockContracts),
        }),
    }
    renderContracts(svcWalletWithContracts as any)

    await screen.findByText('Contracts')
    const cards = screen
      .getAllByText(/^(Active|Inactive)$/)
      .filter((node) => node.className.includes('contract-card__status'))
    expect(cards[0].textContent).toBe('Active')
    expect(cards[1].textContent).toBe('Inactive')
  })

  it('renders the contracts summary and metadata', async () => {
    const svcWalletWithContracts = {
      ...mockSvcWallet,
      getContractManager: () =>
        Promise.resolve({
          getContracts: () => Promise.resolve(mockContracts),
        }),
    }
    renderContracts(svcWalletWithContracts as any)

    await screen.findByText('Contracts')

    expect(screen.getByLabelText('Contract summary')).toBeInTheDocument()
    expect(screen.getAllByText('Script bytes').length).toBeGreaterThan(0)
  })
})
