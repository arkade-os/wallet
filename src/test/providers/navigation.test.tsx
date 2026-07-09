import { render, screen, waitFor } from '@testing-library/react'
import { useContext, useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { NavigationContext, NavigationProvider, Pages } from '../../providers/navigation'

function DuplicateWalletNavigateProbe() {
  const { isInitialLoad, navigate, screen: currentScreen } = useContext(NavigationContext)

  useEffect(() => {
    navigate(Pages.Wallet)
    navigate(Pages.Wallet)
  }, [navigate])

  return <div data-testid='navigation-probe' data-screen={currentScreen} data-initial-load={String(isInitialLoad)} />
}

describe('NavigationProvider', () => {
  it('preserves the wallet initial-load flag when duplicate wallet navigations happen before render', async () => {
    render(
      <NavigationProvider>
        <DuplicateWalletNavigateProbe />
      </NavigationProvider>,
    )

    const probe = screen.getByTestId('navigation-probe')

    await waitFor(() => expect(probe).toHaveAttribute('data-screen', String(Pages.Wallet)))

    expect(probe).toHaveAttribute('data-initial-load', 'true')
  })
})
