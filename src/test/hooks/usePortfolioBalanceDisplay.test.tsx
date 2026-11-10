import { renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { WalletContext } from '../../providers/wallet'
import { Currencies, Unit } from '../../lib/types'
import { usePortfolioBalanceDisplay } from '../../hooks/usePortfolioBalanceDisplay'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { mockConfigContextValue, mockFiatContextValue, mockWalletContextValue } from '../screens/mocks'

function wrapper({ currency, unit, balance = 0 }: { currency: Currencies; unit: Unit; balance?: number }) {
  const config = {
    currency,
    unit,
    showBalance: true,
  } as any
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <WalletContext.Provider value={{ ...mockWalletContextValue, balance }}>
        <ConfigContext.Provider value={{ ...mockConfigContextValue, config } as any}>
          <FiatContext.Provider
            value={{
              ...mockFiatContextValue,
              toFiat: (sats?: number) => sats ?? 0,
              fiatDecimals: () => 2,
            }}
          >
            {children}
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </WalletContext.Provider>
    )
  }
}

describe('usePortfolioBalanceDisplay', () => {
  it('shows a secondary line in the bitcoin unit when a fiat currency is selected', () => {
    const { result } = renderHook(() => usePortfolioBalanceDisplay(), {
      wrapper: wrapper({ currency: Currencies.USD, unit: Unit.SATS }),
    })

    expect(result.current.balance).toBe('$0.00')
    expect(result.current.showSecondary).toBe(true)
    expect(result.current.secondaryUnit).toBe('sats')
  })

  it('hides the secondary line when the currency is BTC', () => {
    const { result } = renderHook(() => usePortfolioBalanceDisplay(), {
      wrapper: wrapper({ currency: Currencies.BTC, unit: Unit.SATS }),
    })

    expect(result.current.showSecondary).toBe(false)
  })

  it('shows unknown until boarding has loaded', () => {
    const { result } = renderHook(() => usePortfolioBalanceDisplay(), {
      wrapper: wrapper({ currency: Currencies.USD, unit: Unit.SATS, balance: -1 }),
    })
    expect(result.current.balance).toBe('Unknown')
    expect(result.current.showSecondary).toBe(false)
  })

  it('stays unknown when an asset has value but the BTC balance is unloaded', () => {
    const { result } = renderHook(() => usePortfolioBalanceDisplay(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <WalletContext.Provider
          value={{
            ...mockWalletContextValue,
            balance: -1,
            assetBalances: [{ assetId: 'asset', amount: BigInt(10) }],
          }}
        >
          <ConfigContext.Provider
            value={{
              ...mockConfigContextValue,
              config: { ...mockConfigContextValue.config, currency: Currencies.USD, unit: Unit.SATS } as any,
            }}
          >
            <FiatContext.Provider value={{ ...mockFiatContextValue, toFiat: (sats?: number) => sats ?? 0 }}>
              {children}
            </FiatContext.Provider>
          </ConfigContext.Provider>
        </WalletContext.Provider>
      ),
    })
    expect(result.current.balance).toBe('Unknown')
  })
})
