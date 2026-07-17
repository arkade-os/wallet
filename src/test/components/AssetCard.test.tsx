import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import AssetCard from '../../components/AssetCard'
import { ConfigContext } from '../../providers/config'
import { WalletContext } from '../../providers/wallet'
import { mockConfigContextValue, mockWalletContextValue } from '../screens/mocks'

const assetId = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd'

const renderCard = (isVerifiedAsset: (id: string) => boolean) =>
  render(
    <ConfigContext.Provider value={mockConfigContextValue as any}>
      <WalletContext.Provider value={{ ...mockWalletContextValue, isVerifiedAsset }}>
        <AssetCard assetId={assetId} balance={BigInt(10000)} decimals={2} name='Euro' ticker='EUR' />
      </WalletContext.Provider>
    </ConfigContext.Provider>,
  )

describe('AssetCard', () => {
  it('shows the official token logo and fiat-style formatting for verified asset IDs', () => {
    const { container } = renderCard((id) => id === assetId)
    expect(container.querySelector('.asset-card__logo')).not.toBeNull()
    expect(screen.getByText('100.00 EUR')).toBeInTheDocument()
  })

  it('does not give currency treatment to unverified assets with a fiat-like ticker', () => {
    const { container } = renderCard(() => false)
    expect(container.querySelector('.asset-card__logo')).toBeNull()
    expect(screen.getByText('100 EUR')).toBeInTheDocument()
  })
})
