import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Wallet from '../../../screens/Wallet/Index'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { mockNavigationContextValue } from '../mocks'

describe('Wallet screen', () => {
  it('renders the wallet screen with the correct elements', async () => {
    const user = userEvent.setup()

    render(<Wallet />)
    expect(screen.getAllByText('$0.00').length).toBeGreaterThan(0)
    expect(screen.getByText('Send')).toBeInTheDocument()
    expect(screen.getByText('Receive')).toBeInTheDocument()
    expect(screen.getByTestId('home-action-swap')).toBeEnabled()
    await user.click(screen.getByTestId('home-action-swap'))
    expect(screen.getByTestId('swap-coming-soon-sheet')).toBeInTheDocument()
    expect(screen.getByText('Assets')).toBeInTheDocument()
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
  })

  it('opens the bitcoin detail page from the bitcoin asset row', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()

    render(
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <Wallet />
      </NavigationContext.Provider>,
    )

    await user.click(screen.getByTestId(/^asset-row-BTC-/))
    expect(navigate).toHaveBeenCalledWith(Pages.BitcoinDetail)
  })
})
