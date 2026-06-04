import { renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Fiats } from '../../lib/types'
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
          fromFiatAmount: (amount: number, currency: Fiats) => (currency === Fiats.CHF ? amount * 2000 : 0),
          toFiat: (sats: number) => sats,
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
})
