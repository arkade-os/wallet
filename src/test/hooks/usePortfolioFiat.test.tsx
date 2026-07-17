import { renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Currencies } from '../../lib/types'
import { FiatContext } from '../../providers/fiat'
import { WalletContext } from '../../providers/wallet'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { mockFiatContextValue, mockWalletContextValue } from '../screens/mocks'

describe('usePortfolioFiat', () => {
  const makeWrapper = (isVerifiedAsset: (assetId: string) => boolean) => {
    return ({ children }: { children: ReactNode }) => (
      <FiatContext.Provider
        value={{
          ...mockFiatContextValue,
          fromFiatAmount: (amount: number, currency: Currencies) => (currency === Currencies.CHF ? amount * 2000 : 0),
          toFiat: (sats?: number) => sats ?? 0,
        }}
      >
        <WalletContext.Provider
          value={{
            ...mockWalletContextValue,
            balance: 1000,
            assetBalances: [{ assetId: 'chf-asset', amount: BigInt(2000) }],
            assetMetadataCache: new Map([
              [
                'chf-asset',
                {
                  metadata: {
                    decimals: 2,
                    name: 'Swiss franc',
                    ticker: 'CHF',
                  },
                  assetId: 'chf-asset',
                  supply: BigInt(1000000),
                  cachedAt: Date.now(),
                },
              ],
            ]),
            isVerifiedAsset,
          }}
        >
          {children}
        </WalletContext.Provider>
      </FiatContext.Provider>
    )
  }

  it('converts verified fiat-like asset balances into the selected currency totals', () => {
    const wrapper = makeWrapper((assetId) => assetId === 'chf-asset')

    const { result } = renderHook(() => usePortfolioFiat(), { wrapper })
    const chfRow = result.current.rows.find((row) => row.assetId === 'chf-asset')

    expect(chfRow?.fiatAmount).toBe(40000)
    expect(chfRow?.satsEquivalent).toBe(40000)
    expect(chfRow?.hasFiatPrice).toBe(true)
    expect(result.current.totalFiat).toBe(41000)
    expect(result.current.totalSats).toBe(41000)
  })

  it('does not assign a fiat price to unverified assets, even with a fiat-like ticker', () => {
    const wrapper = makeWrapper(() => false)

    const { result } = renderHook(() => usePortfolioFiat(), { wrapper })
    const chfRow = result.current.rows.find((row) => row.assetId === 'chf-asset')

    expect(chfRow?.fiatAmount).toBe(0)
    expect(chfRow?.satsEquivalent).toBe(0)
    expect(chfRow?.hasFiatPrice).toBe(false)
    expect(result.current.totalFiat).toBe(1000)
    expect(result.current.totalSats).toBe(1000)
  })
})
