import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import AssetCard from '../../components/AssetCard'
import SendSuccess from '../../screens/Wallet/Send/Success'
import { FlowContext } from '../../providers/flow'
import { ConfigContext } from '../../providers/config'
import { mockFlowContextValue, mockConfigContextValue, mockWalletContextValue } from '../screens/mocks'
import { WalletContext } from '../../providers/wallet'

const assetId = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd'

const renderCard = (isVerifiedAsset: (id: string) => boolean, ticker = 'EUR') =>
  render(
    <WalletContext.Provider value={{ ...mockWalletContextValue, isVerifiedAsset }}>
      <AssetCard assetId={assetId} balance={BigInt(10000)} decimals={2} name='Euro' ticker={ticker} />
    </WalletContext.Provider>,
  )

describe('AssetCard', () => {
  it('shows the exact amount in both parts of the payment confirmation', () => {
    render(
      <WalletContext.Provider
        value={{
          ...mockWalletContextValue,
          isVerifiedAsset: () => true,
          assetMetadataCache: new Map([
            [assetId, { assetId, cachedAt: 0, supply: BigInt(100000000), metadata: { ticker: 'DEPIX', decimals: 8 } }],
          ]),
        }}
      >
        <FlowContext.Provider
          value={{ ...mockFlowContextValue, sendInfo: { assets: [{ assetId, amount: BigInt(420000) }] } }}
        >
          <SendSuccess />
        </FlowContext.Provider>
      </WalletContext.Provider>,
    )
    expect(screen.getByText('0.0042 DEPIX')).toBeInTheDocument()
    expect(screen.getByText('0.0042 DEPIX sent successfully')).toBeInTheDocument()
  })

  it('does not leak the less-than bound when balances are hidden', () => {
    render(
      <ConfigContext.Provider
        value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, showBalance: false } }}
      >
        <AssetCard assetId={assetId} balance={BigInt(420000)} decimals={8} ticker='DEPIX' fiatText='<$0.01' />
      </ConfigContext.Provider>,
    )
    expect(screen.getByText('$••••')).toBeInTheDocument()
    expect(screen.queryByText('<$0.01')).not.toBeInTheDocument()
  })

  it('preserves the fiat unit for hidden negative threshold values', () => {
    render(
      <ConfigContext.Provider
        value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, showBalance: false } }}
      >
        <AssetCard assetId={assetId} balance={BigInt(-420000)} decimals={8} ticker='DEPIX' fiatText='>-$0.01' />
      </ConfigContext.Provider>,
    )
    expect(screen.getByText('$••••')).toBeInTheDocument()
    expect(screen.queryByText('>-$0.01')).not.toBeInTheDocument()
  })

  it.each([false, true])('formats a tiny balance with exactAmount=%s', (exactAmount) => {
    render(
      <WalletContext.Provider value={{ ...mockWalletContextValue, isVerifiedAsset: () => true }}>
        <AssetCard
          assetId={assetId}
          balance={BigInt(420000)}
          decimals={8}
          ticker='DEPIX'
          exactAmount={exactAmount}
          fiatText='<$0.01'
        />
      </WalletContext.Provider>,
    )
    expect(screen.getByText(exactAmount ? '0.0042 DEPIX' : '<0.01 DEPIX')).toBeInTheDocument()
    expect(screen.getByText('<$0.01')).toBeInTheDocument()
  })

  it('shows the official token logo and fiat-style formatting for verified asset IDs', () => {
    const { container } = renderCard((id) => id === assetId)
    expect(container.querySelector('.asset-card__logo')).not.toBeNull()
    expect(screen.getByText('100.00 EUR')).toBeInTheDocument()
    expect(screen.queryByText('Unverified')).not.toBeInTheDocument()
  })

  it('does not give currency treatment to unverified assets with a fiat-like ticker', () => {
    const { container } = renderCard(() => false)
    expect(container.querySelector('.asset-card__logo')).toBeNull()
    expect(screen.getByText('100 EUR')).toBeInTheDocument()
    expect(screen.getByText('Unverified')).toBeInTheDocument()
  })

  it('does not treat an unverified asset with a BTC ticker as bitcoin', () => {
    renderCard(() => false, 'BTC')
    expect(screen.getByText('100 BTC')).toBeInTheDocument()
    expect(screen.getByText('Unverified')).toBeInTheDocument()
  })

  it('shows a designated currency flag via logoTicker while the balance stays asset-denominated', () => {
    const { container } = render(
      <WalletContext.Provider value={{ ...mockWalletContextValue, isVerifiedAsset: (id) => id === assetId }}>
        <AssetCard
          assetId={assetId}
          balance={BigInt(10000)}
          decimals={2}
          name='DePix'
          ticker='DEPIX'
          logoTicker='BRL'
        />
      </WalletContext.Provider>,
    )
    expect(container.querySelector('.asset-card__logo')).not.toBeNull()
    // the amount stays in the real asset's unit — only the logo follows the currency
    expect(screen.getByText('100.00 DEPIX')).toBeInTheDocument()
  })

  it('never shows a logoTicker flag for an unverified asset', () => {
    const { container } = render(
      <WalletContext.Provider value={{ ...mockWalletContextValue, isVerifiedAsset: () => false }}>
        <AssetCard
          assetId={assetId}
          balance={BigInt(10000)}
          decimals={2}
          name='DePix'
          ticker='DEPIX'
          logoTicker='BRL'
        />
      </WalletContext.Provider>,
    )
    expect(container.querySelector('.asset-card__logo')).toBeNull()
  })
})
