import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { redirectToCallback } from '../../lib/appIntent'
import AppIntentScreen from '../../screens/AppIntent/Index'
import { FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import { mockFlowContextValue, mockNavigationContextValue, mockSvcWallet, mockWalletContextValue } from './mocks'

vi.mock('../../lib/appIntent', async () => {
  const actual = await vi.importActual<typeof import('../../lib/appIntent')>('../../lib/appIntent')
  return { ...actual, redirectToCallback: vi.fn() }
})

const PUBKEY = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
const XONLY = '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
const ADDRESS = 'tark1qqexample'
const CALLBACK = 'https://arkade.trade/connect'

const renderScreen = (appIntent: unknown, navigate = vi.fn()) => {
  const setAppIntent = vi.fn()
  render(
    <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate, screen: Pages.AppIntent }}>
      <FlowContext.Provider value={{ ...mockFlowContextValue, appIntent, setAppIntent } as any}>
        <WalletContext.Provider
          value={
            {
              ...mockWalletContextValue,
              wallet: { pubkey: PUBKEY },
              svcWallet: { ...mockSvcWallet, getAddress: () => Promise.resolve(ADDRESS) },
            } as any
          }
        >
          <AppIntentScreen />
        </WalletContext.Provider>
      </FlowContext.Provider>
    </NavigationContext.Provider>,
  )
  return { navigate, setAppIntent }
}

describe('App intent screen', () => {
  beforeEach(() => {
    vi.mocked(redirectToCallback).mockClear()
  })

  it('shares the receive address and x-only pubkey after confirmation', async () => {
    const { setAppIntent } = renderScreen({ status: 'connect', callback: CALLBACK })

    expect(await screen.findByText('arkade.trade is asking for your Arkade address.')).toBeInTheDocument()
    expect(await screen.findByTestId('app-intent-address')).toHaveTextContent(ADDRESS)
    fireEvent.click(screen.getByTestId('app-intent-share'))

    expect(redirectToCallback).toHaveBeenCalledWith(CALLBACK, { address: ADDRESS, pubkey: XONLY })
    expect(setAppIntent).not.toHaveBeenCalled()
  })

  it('returns error=denied when the user declines', async () => {
    renderScreen({ status: 'connect', callback: CALLBACK })
    await screen.findByTestId('app-intent-deny')
    fireEvent.click(screen.getByTestId('app-intent-deny'))
    expect(redirectToCallback).toHaveBeenCalledWith(CALLBACK, { error: 'denied' })
  })

  it('returns error=invalid for a bad link that still has a callback', () => {
    renderScreen({ status: 'invalid', error: 'bad-request', callback: CALLBACK })
    expect(screen.getByText('This payment link is not a valid Bitcoin request.')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('app-intent-return'))
    expect(redirectToCallback).toHaveBeenCalledWith(CALLBACK, { error: 'invalid' })
  })

  it('goes home when an invalid link has no callback', () => {
    const { navigate, setAppIntent } = renderScreen({ status: 'invalid', error: 'missing-callback' })
    fireEvent.click(screen.getByTestId('app-intent-home'))
    expect(setAppIntent).toHaveBeenCalledWith(undefined)
    expect(redirectToCallback).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith(Pages.Wallet)
  })
})
