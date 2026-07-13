import { describe, expect, it } from 'vitest'
import {
  accountChartColorToken,
  allocateFiatAccountAssets,
  primaryFiatAccountSource,
  walletAccountTicker,
  walletAssetPresentation,
} from '../../lib/accountAssets'

describe('wallet account asset presentation', () => {
  it.each([
    ['BTC', '--account-chart-btc'],
    ['USD', '--account-chart-usd'],
    ['CHF', '--account-chart-chf'],
    ['BRL', '--account-chart-brl'],
    ['CNY', '--account-chart-cny'],
    ['EUR', '--account-chart-eur'],
    ['GBP', '--account-chart-gbp'],
    ['JPY', '--account-chart-jpy'],
  ])('uses the %s flag identity color for account charts', (ticker, colorToken) => {
    expect(accountChartColorToken(ticker)).toBe(colorToken)
  })

  it('uses the brand chart color for an unrecognized asset', () => {
    expect(accountChartColorToken('OTHER')).toBe('--account-chart-default')
  })

  it.each(['USD', 'USDT', 'USDC', 'AUSD'])('maps %s to USD', (ticker) => {
    expect(walletAccountTicker(ticker)).toBe('USD')
  })

  it.each(['BRL', 'DPIX', 'DEPIX'])('maps %s to BRL', (ticker) => {
    expect(walletAccountTicker(ticker)).toBe('BRL')
  })

  it('removes issuer branding from wallet-facing metadata', () => {
    expect(
      walletAssetPresentation({
        name: 'Tether USD',
        ticker: 'USDT',
        icon: 'https://issuer.example/tether.svg',
      }),
    ).toEqual({ name: 'USD', ticker: 'USD' })
  })

  it('allocates an account send across multiple backing assets', () => {
    const sources = [
      { assetId: 'usdt', balance: BigInt(6_000), decimals: 2 },
      { assetId: 'usdc', balance: BigInt(4_000_000), decimals: 4 },
    ]

    expect(allocateFiatAccountAssets(BigInt(8_000), 2, sources)).toEqual([
      { assetId: 'usdt', amount: BigInt(6_000) },
      { assetId: 'usdc', amount: BigInt(200_000) },
    ])
  })

  it('uses the largest backing balance as the default receive rail', () => {
    const sources = [
      { assetId: 'smaller', balance: BigInt(2_500), decimals: 2 },
      { assetId: 'larger', balance: BigInt(5_000_000), decimals: 4 },
    ]

    expect(primaryFiatAccountSource(sources, 2)?.assetId).toBe('larger')
  })
})
