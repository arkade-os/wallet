import { renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Currencies } from '../../lib/types'
import { FiatContext } from '../../providers/fiat'
import { WalletContext } from '../../providers/wallet'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { mockFiatContextValue, mockWalletContextValue } from '../screens/mocks'

describe('usePortfolioFiat', () => {
  it('converts fiat-like asset balances into the selected currency totals', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
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
            isAssetVerified: (assetId: string) => assetId === 'chf-asset',
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
          }}
        >
          {children}
        </WalletContext.Provider>
      </FiatContext.Provider>
    )

    const { result } = renderHook(() => usePortfolioFiat(), { wrapper })
    const chfRow = result.current.rows.find((row) => row.assetId === 'chf-asset')

    expect(chfRow?.fiatAmount).toBe(40000)
    expect(chfRow?.satsEquivalent).toBe(40000)
    expect(chfRow?.hasFiatPrice).toBe(true)
    expect(result.current.totalFiat).toBe(41000)
    expect(result.current.totalSats).toBe(41000)
  })

  it('does not price an unverified asset from its self-declared ticker', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FiatContext.Provider
        value={{
          ...mockFiatContextValue,
          fromFiatAmount: (amount: number) => amount * 2000,
          toFiat: (sats?: number) => sats ?? 0,
        }}
      >
        <WalletContext.Provider
          value={{
            ...mockWalletContextValue,
            balance: 1000,
            assetBalances: [{ assetId: 'spoofed-eur', amount: BigInt(100_000_000) }],
            assetMetadataCache: new Map([
              [
                'spoofed-eur',
                {
                  metadata: { decimals: 2, name: 'Fake euros', ticker: 'EUR' },
                  assetId: 'spoofed-eur',
                  supply: BigInt(100_000_000),
                  cachedAt: Date.now(),
                },
              ],
            ]),
          }}
        >
          {children}
        </WalletContext.Provider>
      </FiatContext.Provider>
    )

    const { result } = renderHook(() => usePortfolioFiat(), { wrapper })
    const spoofedRow = result.current.rows.find((row) => row.assetId === 'spoofed-eur')

    expect(spoofedRow?.hasFiatPrice).toBe(false)
    expect(spoofedRow?.fiatAmount).toBe(0)
    expect(spoofedRow?.satsEquivalent).toBe(0)
    expect(result.current.totalFiat).toBe(1000)
    expect(result.current.totalSats).toBe(1000)
  })
})
