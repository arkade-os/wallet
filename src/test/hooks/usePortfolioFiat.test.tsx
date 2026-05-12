import { PropsWithChildren } from 'react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { FiatContext } from '../../providers/fiat'
import { WalletContext } from '../../providers/wallet'
import { Fiats } from '../../lib/types'
import { mockFiatContextValue, mockWalletContextValue } from '../screens/mocks'

const usdtAssetId = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd'
const usdcAssetId = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdefabcd'
const popAssetId = '123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdefabcd'
const chfAssetId = '223456789abcdef0123456789abcdef0123456789abcdef0123456789abcdefabcd'

function wrapper({ children }: PropsWithChildren) {
  const assetMetadataCache = new Map([
    [
      usdtAssetId,
      {
        metadata: {
          name: 'USDT',
          ticker: 'USDT',
          decimals: 2,
        },
      },
    ],
    [
      usdcAssetId,
      {
        metadata: {
          name: 'USDC',
          ticker: 'USDC',
          decimals: 2,
        },
      },
    ],
    [
      popAssetId,
      {
        metadata: {
          name: 'POOP',
          ticker: 'POP',
          decimals: 0,
        },
      },
    ],
    [
      chfAssetId,
      {
        metadata: {
          name: 'Swiss franc',
          ticker: 'CHF',
          decimals: 2,
        },
      },
    ],
  ])

  return (
    <FiatContext.Provider
      value={{
        ...mockFiatContextValue,
        toFiat: vi.fn(() => 0),
        convertFiat: vi.fn((amount: number, from: Fiats) => {
          if (from === Fiats.USD) return amount
          if (from === Fiats.CHF) return amount * 1.11
          return 0
        }),
      }}
    >
      <WalletContext.Provider
        value={
          {
            ...mockWalletContextValue,
            balance: 0,
            assetBalances: [
              { assetId: usdtAssetId, amount: 7010 },
              { assetId: usdcAssetId, amount: 3047 },
              { assetId: popAssetId, amount: 10000 },
              { assetId: chfAssetId, amount: 3047 },
            ],
            assetMetadataCache,
          } as any
        }
      >
        {children}
      </WalletContext.Provider>
    </FiatContext.Provider>
  )
}

describe('usePortfolioFiat', () => {
  it('prices fiat-pegged assets through the fiat price feed', () => {
    const { result } = renderHook(() => usePortfolioFiat(), { wrapper })

    expect(result.current.rows.map((row) => row.ticker)).toEqual(['BTC', 'USDT', 'USDC'])
    expect(result.current.rows.find((row) => row.ticker === 'USDT')).toMatchObject({
      balance: 7010,
      fiatAmount: 70.1,
      hasFiatPrice: true,
    })
    expect(result.current.rows.find((row) => row.ticker === 'USDC')).toMatchObject({
      balance: 3047,
      fiatAmount: 30.47,
      hasFiatPrice: true,
    })
    expect(result.current.totalFiat).toBeCloseTo(100.57)
  })
})
