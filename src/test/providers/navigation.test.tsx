import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function NavigationProbe() {
  const { goBack, isInitialLoad, navigate, screen: currentScreen } = useContext(NavigationContext)

  return (
    <div data-testid='navigation-probe' data-screen={currentScreen} data-initial-load={String(isInitialLoad)}>
      <button data-testid='go-wallet' onClick={() => navigate(Pages.Wallet)} />
      <button data-testid='go-swap' onClick={() => navigate(Pages.WalletSwap)} />
      <button data-testid='go-back' onClick={goBack} />
    </div>
  )
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

  it('does not flag initial load when returning home from the swap page', async () => {
    render(
      <NavigationProvider>
        <NavigationProbe />
      </NavigationProvider>,
    )

    const probe = screen.getByTestId('navigation-probe')

    // boot: landing on the wallet home from a boot page plays the load-in stagger
    fireEvent.click(screen.getByTestId('go-wallet'))
    await waitFor(() => expect(probe).toHaveAttribute('data-screen', String(Pages.Wallet)))
    expect(probe).toHaveAttribute('data-initial-load', 'true')

    // home -> swap
    fireEvent.click(screen.getByTestId('go-swap'))
    await waitFor(() => expect(probe).toHaveAttribute('data-screen', String(Pages.WalletSwap)))
    expect(probe).toHaveAttribute('data-initial-load', 'false')

    // swap -> back home: must not replay the stagger (flicker regression)
    fireEvent.click(screen.getByTestId('go-back'))
    await waitFor(() => expect(probe).toHaveAttribute('data-screen', String(Pages.Wallet)))
    expect(probe).toHaveAttribute('data-initial-load', 'false')
  })

  it('does not flag initial load when the swap page is replaced by home', async () => {
    render(
      <NavigationProvider>
        <NavigationProbe />
      </NavigationProvider>,
    )

    const probe = screen.getByTestId('navigation-probe')

    fireEvent.click(screen.getByTestId('go-wallet'))
    await waitFor(() => expect(probe).toHaveAttribute('data-screen', String(Pages.Wallet)))

    fireEvent.click(screen.getByTestId('go-swap'))
    await waitFor(() => expect(probe).toHaveAttribute('data-screen', String(Pages.WalletSwap)))

    // swap success / Escape key: root navigation back to the wallet home
    fireEvent.click(screen.getByTestId('go-wallet'))
    await waitFor(() => expect(probe).toHaveAttribute('data-screen', String(Pages.Wallet)))
    expect(probe).toHaveAttribute('data-initial-load', 'false')
  })
})
