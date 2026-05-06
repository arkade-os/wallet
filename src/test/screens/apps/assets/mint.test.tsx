import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AppAssetMint from '../../../../screens/Apps/Assets/Mint'
import { ConfigContext } from '../../../../providers/config'
import { FlowContext } from '../../../../providers/flow'
import { NavigationContext, Pages, Tabs } from '../../../../providers/navigation'
import { WalletContext } from '../../../../providers/wallet'
import { mockConfigContextValue, mockFlowContextValue, mockWalletContextValue } from '../../mocks'

function renderAssetMint(goBack = vi.fn()) {
  const navigate = vi.fn()

  render(
    <NavigationContext.Provider
      value={{
        direction: 'none',
        goBack,
        isInitialLoad: false,
        navigate,
        screen: Pages.AppAssetMint,
        tab: Tabs.Apps,
      }}
    >
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <FlowContext.Provider value={mockFlowContextValue as any}>
          <WalletContext.Provider value={mockWalletContextValue as any}>
            <AppAssetMint />
          </WalletContext.Provider>
        </FlowContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>,
  )

  return { goBack, navigate }
}

describe('AppAssetMint', () => {
  it('uses navigation history for the header back action', async () => {
    const goBack = vi.fn()
    const { navigate } = renderAssetMint(goBack)

    await userEvent.click(screen.getByLabelText('Go back'))

    expect(goBack).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalledWith(Pages.AppAssets)
  })
})
