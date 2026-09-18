import { renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Currencies, Unit } from '../../lib/types'
import { usePortfolioBalanceDisplay } from '../../hooks/usePortfolioBalanceDisplay'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { mockConfigContextValue, mockFiatContextValue } from '../screens/mocks'

function wrapper({ currency, unit }: { currency: Currencies; unit: Unit }) {
  const config = {
    currency,
    unit,
    showBalance: true,
  } as any
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
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
})
