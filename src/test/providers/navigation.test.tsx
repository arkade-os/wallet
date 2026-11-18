import { act, render, screen, waitFor } from '@testing-library/react'
import { useContext, useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { holdBackLayer, NavigationContext, NavigationProvider, Pages } from '../../providers/navigation'

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

  // A sheet over Receive: Back used to pop the screen out from under it.
  it('closes an open sheet on Back and only leaves the screen on the next one', async () => {
    function Probe() {
      const { navigate, screen: currentScreen } = useContext(NavigationContext)
      useEffect(() => {
        navigate(Pages.Wallet)
        navigate(Pages.ReceiveQRCode)
      }, [navigate])
      return <div data-testid='navigation-probe' data-screen={currentScreen} />
    }
    render(
      <NavigationProvider>
        <Probe />
      </NavigationProvider>,
    )
    const probe = screen.getByTestId('navigation-probe')
    await waitFor(() => expect(probe).toHaveAttribute('data-screen', String(Pages.ReceiveQRCode)))

    const close = vi.fn()
    const release = holdBackLayer(close)
    const pushState = vi.spyOn(history, 'pushState')
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(close).toHaveBeenCalledOnce()
    expect(probe).toHaveAttribute('data-screen', String(Pages.ReceiveQRCode))
    // The entry Back consumed is put back, so the next Back still has the screen to pop.
    expect(pushState).toHaveBeenCalledOnce()
    pushState.mockRestore()

    release()
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(close).toHaveBeenCalledOnce()
    await waitFor(() => expect(probe).toHaveAttribute('data-screen', String(Pages.Wallet)))
  })
})
