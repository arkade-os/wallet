import { renderHook } from '@testing-library/react'
import { type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { usePortfolioFiat } from '../../hooks/usePortfolioFiat'
import { MUTINYNET_DEPIX_ASSET_ID, MUTINYNET_USDT_ASSET_ID } from '../../lib/accountAssets'
import { Currencies } from '../../lib/types'
import { AspContext } from '../../providers/asp'
import { AssetsContext } from '../../providers/assets'
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
  registered = true,
}: {
  children: ReactNode
  network?: string
  registered?: boolean
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
      <AssetsContext.Provider value={{ isRegistered: () => registered }}>
        <FiatContext.Provider
          value={{
            ...mockFiatContextValue,
            fromFiatAmount: (amount: number, currency: Currencies) =>
              currency === Currencies.USD ? amount * 1_000 : currency === Currencies.BRL ? amount * 200 : 0,
            toFiat: (sats?: number) => sats ?? 0,
          }}
        >
          <WalletContext.Provider
            value={{ ...mockWalletContextValue, balance: 500, assetBalances, assetMetadataCache } as any}
          >
            {children}
          </WalletContext.Provider>
        </FiatContext.Provider>
      </AssetsContext.Provider>
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
    const unverifiedWrapper = ({ children }: { children: ReactNode }) => wrapper({ children, registered: false })
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
})
