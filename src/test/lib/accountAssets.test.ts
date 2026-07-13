import { describe, expect, it } from 'vitest'
import { accountChartColorToken, walletAccountTicker, walletAssetPresentation } from '../../lib/accountAssets'

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
})
