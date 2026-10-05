import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ClaimSheet from '../../../screens/Wallet/Receive/ClaimSheet'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { WalletContext } from '../../../providers/wallet'
import { deliveredAssetId, planReceiverClaim, type ReceiverClaim } from '../../../lib/receiverClaims'
import { MUTINYNET_USDT_ASSET_ID } from '../../../lib/accountAssets'
import { mockAspContextValue, mockConfigContextValue, mockWalletContextValue } from '../mocks'
import { assetFareClaim, bitcoinClaim, coins, satsFareClaim } from '../../lib/receiverClaimsFixtures'

const usdtClaim = (): ReceiverClaim => {
  const claim = satsFareClaim(0n)
  claim.claim!.params.assetId = {
    txid: MUTINYNET_USDT_ASSET_ID.slice(0, 64).match(/../g)!.reverse().join(''),
    groupIndex: 0,
  }
  claim.claim!.params.receiverFare = undefined
  claim.claim!.params.recoveryRecipient = 'sender'
  claim.claim!.unclaimedMode = undefined
  return claim
}
const metadata = { name: 'USDT', ticker: 'USDT', decimals: 2, icon: 'https://example.com/usdt.png' }
const renderClaim = (
  claim: ReceiverClaim,
  wallet: Partial<Omit<typeof mockWalletContextValue, 'isVerifiedAsset' | 'setCacheEntry'>> & {
    isVerifiedAsset?: (id: string) => boolean
    setCacheEntry?: (id: string, details: any) => any
  } = {},
  props = {},
) =>
  render(
    <AspContext.Provider
      value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet' } }}
    >
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <WalletContext.Provider value={{ ...mockWalletContextValue, ...wallet } as any}>
          <ClaimSheet claim={claim} plan={planReceiverClaim(claim, coins([1000n]))} {...props} />
        </WalletContext.Provider>
      </ConfigContext.Provider>
    </AspContext.Provider>,
  )

describe('Taxi asset claim presentation', () => {
  it('shows the exact delivered asset identity and decimal amount like the send success card', () => {
    const claim = usdtClaim()
    expect(deliveredAssetId(claim)).toBe(MUTINYNET_USDT_ASSET_ID)
    const { container } = renderClaim(claim, {
      assetMetadataCache: new Map([[MUTINYNET_USDT_ASSET_ID, { metadata, cachedAt: Date.now() }]]),
      isVerifiedAsset: (id) => id === MUTINYNET_USDT_ASSET_ID,
    })
    expect(screen.getByText('USD · USDT')).toBeInTheDocument()
    expect(screen.getByText('5.00 USDT')).toBeInTheDocument()
    expect(container.querySelector('.asset-card__logo')).not.toBeNull()
    expect(screen.queryByText(/500 units arrived/)).not.toBeInTheDocument()
    expect(screen.getByTestId('claim-carrier')).toHaveTextContent('330 sats')
    expect(screen.getByTestId('claim-plan')).toHaveTextContent('Your sats balance stays unchanged')
  })

  it('loads an uncached incoming asset once and uses the moderated cache entry', async () => {
    const claim = usdtClaim()
    const getAssetDetails = vi.fn(async () => ({ metadata }))
    const setCacheEntry = vi.fn((id, details) => ({
      ...details,
      metadata: { ...details.metadata, icon: undefined },
      cachedAt: Date.now(),
    }))
    const { container } = renderClaim(claim, {
      svcWallet: { assetManager: { getAssetDetails } } as any,
      setCacheEntry,
      isVerifiedAsset: (id) => id === MUTINYNET_USDT_ASSET_ID,
    })
    expect(await screen.findByText('5.00 USDT')).toBeInTheDocument()
    expect(getAssetDetails).toHaveBeenCalledExactlyOnceWith(MUTINYNET_USDT_ASSET_ID)
    expect(setCacheEntry).toHaveBeenCalledWith(MUTINYNET_USDT_ASSET_ID, { metadata })
    expect(container.querySelector('img[src="https://example.com/usdt.png"]')).toBeNull()
  })

  it('shows an unknown asset ID and atomic units without borrowing another cached identity', () => {
    const claim = satsFareClaim(0n)
    const id = deliveredAssetId(claim)!
    renderClaim(claim, { assetMetadataCache: new Map([[MUTINYNET_USDT_ASSET_ID, { metadata, cachedAt: Date.now() }]]) })
    expect(screen.getByText(`${id.slice(0, 12)}...${id.slice(-12)}`)).toBeInTheDocument()
    expect(screen.getByText('500 atomic units')).toBeInTheDocument()
    expect(screen.queryByText('5.00 USDT')).not.toBeInTheDocument()
  })

  it('does not grant a currency identity to an unverified asset with a USDT ticker', () => {
    const claim = satsFareClaim(0n)
    const { container } = renderClaim(claim, {
      assetMetadataCache: new Map([[deliveredAssetId(claim)!, { metadata, cachedAt: Date.now() }]]),
    })
    expect(screen.getByText('5 USDT')).toBeInTheDocument()
    expect(screen.getByText('Unverified')).toBeInTheDocument()
    expect(container.querySelector('.asset-card__logo')).toBeNull()
    expect(screen.queryByText('USD · USDT')).not.toBeInTheDocument()
  })

  it('distinguishes an asset fare from carrier repayment and shows the retained asset amount', () => {
    const claim = assetFareClaim(9n)
    renderClaim(claim, {
      assetMetadataCache: new Map([
        [deliveredAssetId(claim)!, { metadata: { name: 'Token', ticker: 'TKN', decimals: 0 }, cachedAt: Date.now() }],
      ]),
    })
    expect(screen.getByTestId('claim-fare')).toHaveTextContent('9 TKN')
    expect(screen.getByTestId('claim-carrier')).toHaveTextContent('330 sats')
    expect(screen.getByTestId('claim-plan')).toHaveTextContent('491 TKN')
    expect(screen.getByTestId('claim-plan')).toHaveTextContent('Your sats balance stays unchanged')
  })

  it('preserves the claim, dismiss and failed-attempt controls', () => {
    const claim = usdtClaim()
    const onClaim = vi.fn()
    const onDismiss = vi.fn()
    const view = renderClaim(claim, {}, { onClaim, onDismiss })
    fireEvent.click(screen.getByRole('button', { name: 'Claim' }))
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(onClaim).toHaveBeenCalledOnce()
    expect(onDismiss).toHaveBeenCalledOnce()
    view.unmount()
    renderClaim(claim, {}, { spent: true, error: 'Claim failed' })
    expect(screen.getByRole('button', { name: 'Claim' })).toBeDisabled()
    expect(screen.getByText('Claim failed')).toBeInTheDocument()
  })

  it('ignores metadata resolving after the displayed claim changes', async () => {
    let resolveDetails!: (details: any) => void
    const getAssetDetails = vi.fn(
      () =>
        new Promise<any>((resolve) => {
          resolveDetails = resolve
        }),
    )
    const setCacheEntry = vi.fn()
    const nextClaim = satsFareClaim(0n)
    const nextId = deliveredAssetId(nextClaim)!
    const wallet = {
      ...mockWalletContextValue,
      svcWallet: { assetManager: { getAssetDetails } },
      setCacheEntry,
      assetMetadataCache: new Map([
        [nextId, { metadata: { name: 'Next token', ticker: 'NEXT', decimals: 0 }, cachedAt: Date.now() }],
      ]),
    }
    const tree = (claim: ReceiverClaim) => (
      <WalletContext.Provider value={wallet as any}>
        <ClaimSheet claim={claim} plan={planReceiverClaim(claim, coins([1000n]))} />
      </WalletContext.Provider>
    )
    const view = render(tree(usdtClaim()))
    view.rerender(tree(nextClaim))
    await act(async () => {
      resolveDetails({ metadata })
      await Promise.resolve()
    })
    expect(screen.getByText('500 NEXT')).toBeInTheDocument()
    expect(screen.queryByText('5.00 USDT')).not.toBeInTheDocument()
    expect(setCacheEntry).not.toHaveBeenCalled()
  })

  it('does not guess an amount denomination when metadata has no decimals', () => {
    const claim = usdtClaim()
    renderClaim(claim, {
      assetMetadataCache: new Map([
        [MUTINYNET_USDT_ASSET_ID, { metadata: { name: 'USDT', ticker: 'USDT' }, cachedAt: Date.now() }],
      ]),
      isVerifiedAsset: (id) => id === MUTINYNET_USDT_ASSET_ID,
    })
    expect(screen.getByText('500 atomic units')).toBeInTheDocument()
    expect(screen.queryByText('500.00 USDT')).not.toBeInTheDocument()
  })
  it('does not ask for a sats coin when a legacy asset claim uses purchase', () => {
    const claim = usdtClaim()
    claim.claim!.params.claimMode = undefined
    renderClaim(claim, {}, { plan: planReceiverClaim(claim, []) })
    expect(screen.getByTestId('claim-fare')).toHaveTextContent('You do not need sats to claim')
    expect(screen.queryByTestId('claim-carrier')).toBeNull()
  })
  it('does not fetch asset metadata for bitcoin claims', () => {
    const getAssetDetails = vi.fn()
    renderClaim(bitcoinClaim(230n), { svcWallet: { assetManager: { getAssetDetails } } as any })
    expect(screen.getByText('100 sats arrived through your Taxi.')).toBeInTheDocument()
    expect(getAssetDetails).not.toHaveBeenCalled()
  })
})
