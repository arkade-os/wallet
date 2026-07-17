import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AssetCard from '../../components/AssetCard'
import { ConfigContext } from '../../providers/config'
import { FlowContext } from '../../providers/flow'
import { NavigationContext } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import {
  mockConfigContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../screens/mocks'

function renderAssetCard(isAssetVerified: (assetId: string) => boolean) {
  return render(
    <ConfigContext.Provider value={mockConfigContextValue}>
      <WalletContext.Provider value={{ ...mockWalletContextValue, isAssetVerified }}>
        <FlowContext.Provider value={mockFlowContextValue}>
          <NavigationContext.Provider value={mockNavigationContextValue}>
            <AssetCard assetId='spoofed-usdt' balance={BigInt(100_000)} decimals={2} name='Fake tether' ticker='USDT' />
          </NavigationContext.Provider>
        </FlowContext.Provider>
      </WalletContext.Provider>
    </ConfigContext.Provider>,
  )
}

describe('AssetCard', () => {
  it('does not infer a branded logo from an unverified asset ticker', () => {
    const { container } = renderAssetCard(() => false)

    expect(container.querySelector('.asset-card__logo')).not.toBeInTheDocument()
    expect(container).toHaveTextContent('U')
  })

  it('shows the branded logo when the asset identity is verified', () => {
    const { container } = renderAssetCard((assetId) => assetId === 'spoofed-usdt')

    expect(container.querySelector('.asset-card__logo')).toBeInTheDocument()
  })
})
