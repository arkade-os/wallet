import { renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Currencies } from '../../lib/types'
import { FiatContext } from '../../providers/fiat'
import { WalletContext } from '../../providers/wallet'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { mockFiatContextValue, mockWalletContextValue } from '../screens/mocks'

describe('usePortfolioFiat', () => {
  const assetDetails = (ticker: string, name = ticker) => ({
    metadata: {
      decimals: 2,
      name,
      ticker,
    },
    assetId: `${ticker.toLowerCase()}-asset`,
    supply: BigInt(1000000),
    cachedAt: Date.now(),
  })

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
            assetBalances: [{ assetId: 'chf-asset', amount: BigInt(2000) }],
            assetMetadataCache: new Map([['chf-asset', assetDetails('CHF', 'Swiss franc')]]),
          }}
        >
          {children}
        </WalletContext.Provider>
      </FiatContext.Provider>
    )

    const { result } = renderHook(() => usePortfolioFiat(), { wrapper })
    const chfRow = result.current.rows.find((row) => row.assetId === 'account:chf')

    expect(chfRow?.fiatAmount).toBe(40000)
    expect(chfRow?.satsEquivalent).toBe(40000)
    expect(chfRow?.hasFiatPrice).toBe(true)
    expect(chfRow?.sourceAssetIds).toEqual(['chf-asset'])
    expect(result.current.totalFiat).toBe(41000)
    expect(result.current.totalSats).toBe(41000)
  })

  it('aggregates USD assets into an account row', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FiatContext.Provider
        value={{
          ...mockFiatContextValue,
          fromFiatAmount: (amount: number, currency: Currencies) => (currency === Currencies.USD ? amount * 1000 : 0),
          toFiat: (sats?: number) => sats ?? 0,
        }}
      >
        <WalletContext.Provider
          value={{
            ...mockWalletContextValue,
            balance: 500,
            assetBalances: [
              { assetId: 'usdt-asset', amount: BigInt(1234) },
              { assetId: 'usdc-asset', amount: BigInt(567) },
            ],
            assetMetadataCache: new Map([
              ['usdt-asset', assetDetails('USDT', 'Tether USD')],
              ['usdc-asset', assetDetails('USDC', 'USD Coin')],
            ]),
          }}
        >
          {children}
        </WalletContext.Provider>
      </FiatContext.Provider>
    )

    const { result } = renderHook(() => usePortfolioFiat(), { wrapper })
    const usdRow = result.current.rows.find((row) => row.assetId === 'account:usd')

    expect(usdRow?.balance).toBe(BigInt(1801))
    expect(usdRow?.fiatAmount).toBe(18010)
    expect(usdRow?.satsEquivalent).toBe(18010)
    expect(usdRow?.hasFiatPrice).toBe(true)
    expect(usdRow?.sourceAssetIds).toEqual(['usdt-asset', 'usdc-asset'])
    expect(result.current.totalFiat).toBe(18510)
    expect(result.current.totalSats).toBe(18510)
  })

  it('applies prototype asset balance deltas to fiat account rows', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FiatContext.Provider
        value={{
          ...mockFiatContextValue,
          fromFiatAmount: (amount: number, currency: Currencies) => (currency === Currencies.USD ? amount * 1000 : 0),
          toFiat: (sats?: number) => sats ?? 0,
        }}
      >
        <WalletContext.Provider
          value={{
            ...mockWalletContextValue,
            balance: 500,
            assetBalances: [{ assetId: 'usdt-asset', amount: BigInt(1200) }],
            assetMetadataCache: new Map([['usdt-asset', assetDetails('USDT', 'Tether USD')]]),
            prototypeAssetBalanceDeltas: {
              'account:usd': BigInt(-500),
            },
          }}
        >
          {children}
        </WalletContext.Provider>
      </FiatContext.Provider>
    )

    const { result } = renderHook(() => usePortfolioFiat(), { wrapper })
    const usdRow = result.current.rows.find((row) => row.assetId === 'account:usd')

    expect(usdRow?.balance).toBe(BigInt(700))
    expect(usdRow?.fiatAmount).toBe(7000)
    expect(usdRow?.satsEquivalent).toBe(7000)
    expect(usdRow?.hasFiatPrice).toBe(true)
    expect(usdRow?.sourceAssetIds).toEqual(['usdt-asset'])
    expect(result.current.totalFiat).toBe(7500)
    expect(result.current.totalSats).toBe(7500)
  })
})
