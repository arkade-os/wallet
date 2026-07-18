import { renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Currencies } from '../../lib/types'
import { MUTINYNET_DEPIX_ASSET_ID, MUTINYNET_USDT_ASSET_ID } from '../../lib/accountAssets'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { AspContext } from '../../providers/asp'
import { FiatContext } from '../../providers/fiat'
import { WalletContext } from '../../providers/wallet'
import { mockAspContextValue, mockFiatContextValue, mockWalletContextValue } from '../screens/mocks'

const assetDetails = (assetId: string, ticker: string, decimals = 2) => ({
  assetId,
  cachedAt: Date.now(),
  metadata: { decimals, name: ticker, ticker },
  supply: BigInt(1_000_000),
})

function wrapper({
  children,
  network = 'mutinynet',
  verified = true,
}: {
  children: ReactNode
  network?: string
  verified?: boolean
}) {
  const assetBalances = [
    { assetId: MUTINYNET_USDT_ASSET_ID, amount: BigInt(1_234) },
    { assetId: MUTINYNET_DEPIX_ASSET_ID, amount: BigInt(2_000) },
  ]
  const assetMetadataCache = new Map([
    [MUTINYNET_USDT_ASSET_ID, assetDetails(MUTINYNET_USDT_ASSET_ID, 'USDT')],
    [MUTINYNET_DEPIX_ASSET_ID, assetDetails(MUTINYNET_DEPIX_ASSET_ID, 'DEPIX')],
  ])
  return (
    <AspContext.Provider
      value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network } } as any}
    >
      <FiatContext.Provider
        value={{
          ...mockFiatContextValue,
          fromFiatAmount: (amount: number, currency: Currencies) =>
            currency === Currencies.USD ? amount * 1_000 : currency === Currencies.BRL ? amount * 200 : 0,
          toFiat: (sats?: number) => sats ?? 0,
        }}
      >
        <WalletContext.Provider
          value={
            {
              ...mockWalletContextValue,
              balance: 500,
              assetBalances,
              assetMetadataCache,
              isVerifiedAsset: () => verified,
            } as any
          }
        >
          {children}
        </WalletContext.Provider>
      </FiatContext.Provider>
    </AspContext.Provider>
  )
}

// a verified asset with a fiat-like ticker but no explicit designation
const makeChfWrapper = (isVerifiedAsset: (assetId: string) => boolean) => {
  return ({ children }: { children: ReactNode }) => (
    <AspContext.Provider
      value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet' } } as any}
    >
      <FiatContext.Provider
        value={{
          ...mockFiatContextValue,
          fromFiatAmount: (amount: number, currency: Currencies) => (currency === Currencies.CHF ? amount * 2000 : 0),
          toFiat: (sats?: number) => sats ?? 0,
        }}
      >
        <WalletContext.Provider
          value={
            {
              ...mockWalletContextValue,
              balance: 1000,
              assetBalances: [{ assetId: 'chf-asset', amount: BigInt(2000) }],
              assetMetadataCache: new Map([['chf-asset', assetDetails('chf-asset', 'CHF')]]),
              isVerifiedAsset,
            } as any
          }
        >
          {children}
        </WalletContext.Provider>
      </FiatContext.Provider>
    </AspContext.Provider>
  )
}

describe('usePortfolioFiat', () => {
  it('creates separate verified Mutinynet USD and BRL accounts and includes both in the total', () => {
    const { result } = renderHook(() => usePortfolioFiat(), { wrapper })

    expect(result.current.rows.find((row) => row.assetId === MUTINYNET_USDT_ASSET_ID)).toMatchObject({
      name: 'USD',
      ticker: 'USD',
      balance: BigInt(1_234),
      sourceAsset: { assetId: MUTINYNET_USDT_ASSET_ID, balance: BigInt(1_234), decimals: 2 },
    })
    expect(result.current.rows.find((row) => row.assetId === MUTINYNET_DEPIX_ASSET_ID)).toMatchObject({
      name: 'BRL',
      ticker: 'BRL',
      balance: BigInt(2_000),
      sourceAsset: { assetId: MUTINYNET_DEPIX_ASSET_ID, balance: BigInt(2_000), decimals: 2 },
    })
    expect(result.current.totalSats).toBe(16_840)
  })

  it('does not count an unverified asset toward the portfolio total', () => {
    const unverifiedWrapper = ({ children }: { children: ReactNode }) => wrapper({ children, verified: false })
    const { result } = renderHook(() => usePortfolioFiat(), { wrapper: unverifiedWrapper })

    expect(result.current.totalSats).toBe(500)
    expect(result.current.rows.find((row) => row.assetId === MUTINYNET_USDT_ASSET_ID)?.ticker).toBe('USDT')
  })

  it('does not apply Mutinynet designations on Mainnet', () => {
    const mainnetWrapper = ({ children }: { children: ReactNode }) => wrapper({ children, network: 'bitcoin' })
    const { result } = renderHook(() => usePortfolioFiat(), { wrapper: mainnetWrapper })

    expect(result.current.totalSats).toBe(500)
    expect(result.current.rows.some((row) => row.fiatCurrency)).toBe(false)
  })

  it('does not treat a verified but undesignated fiat-like ticker as a currency account', () => {
    const { result } = renderHook(() => usePortfolioFiat(), { wrapper: makeChfWrapper(() => true) })
    const chfRow = result.current.rows.find((row) => row.assetId === 'chf-asset')

    expect(chfRow?.fiatAmount).toBe(0)
    expect(chfRow?.hasFiatPrice).toBe(false)
    expect(result.current.totalSats).toBe(1000)
  })

  it('does not assign a fiat price to unverified assets, even with a fiat-like ticker', () => {
    const { result } = renderHook(() => usePortfolioFiat(), { wrapper: makeChfWrapper(() => false) })
    const chfRow = result.current.rows.find((row) => row.assetId === 'chf-asset')

    expect(chfRow?.fiatAmount).toBe(0)
    expect(chfRow?.satsEquivalent).toBe(0)
    expect(chfRow?.hasFiatPrice).toBe(false)
    expect(result.current.totalFiat).toBe(1000)
    expect(result.current.totalSats).toBe(1000)
  })
})
