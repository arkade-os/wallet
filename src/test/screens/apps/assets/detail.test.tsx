import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AppAssetDetail from '../../../../screens/Apps/Assets/Detail'
import { ConfigContext } from '../../../../providers/config'
import { FlowContext } from '../../../../providers/flow'
import { NavigationContext, Pages, Tabs } from '../../../../providers/navigation'
import { WalletContext } from '../../../../providers/wallet'
import { mockConfigContextValue, mockFlowContextValue, mockWalletContextValue } from '../../mocks'

const assetInfo = {
  assetId: 'asset-id',
  supply: 1000,
  metadata: {
    name: 'Test asset',
    ticker: 'TEST',
    decimals: 0,
  },
}

function renderAssetDetail(goBack = vi.fn()) {
  const navigate = vi.fn()

  render(
    <NavigationContext.Provider
      value={{
        direction: 'none',
        goBack,
        isInitialLoad: false,
        navigate,
        screen: Pages.AppAssetDetail,
        tab: Tabs.Apps,
      }}
    >
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <FlowContext.Provider value={{ ...mockFlowContextValue, assetInfo } as any}>
          <WalletContext.Provider
            value={{
              ...mockWalletContextValue,
              assetBalances: [{ assetId: assetInfo.assetId, amount: 10 }],
              assetMetadataCache: new Map(),
            }}
          >
            <AppAssetDetail />
          </WalletContext.Provider>
        </FlowContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>,
  )

  return { goBack, navigate }
}

describe('AppAssetDetail', () => {
  it('uses navigation history for the header back action', async () => {
    const goBack = vi.fn()
    const { navigate } = renderAssetDetail(goBack)

    await waitFor(() => expect(screen.getAllByText('Test asset').length).toBeGreaterThan(0))
    await userEvent.click(screen.getByLabelText('Go back'))

    expect(goBack).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalledWith(Pages.AppAssets)
  })
})
