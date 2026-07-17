import { describe, expect, it } from 'vitest'
import {
  accountChartColorToken,
  designatedAccountCurrency,
  MUTINYNET_DEPIX_ASSET_ID,
  MUTINYNET_USDT_ASSET_ID,
  walletAccountTicker,
  walletAssetLabel,
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

  it.each(['USD', 'BRL'])('recognizes the explicit %s account label', (ticker) => {
    expect(walletAccountTicker(ticker)).toBe(ticker)
  })

  it.each(['USDT', 'USDC', 'AUSD', 'DPIX', 'DEPIX'])('does not infer an account from the %s ticker', (ticker) => {
    expect(walletAccountTicker(ticker)).toBeUndefined()
  })

  it('designates the two verified Mutinynet account assets only', () => {
    expect(designatedAccountCurrency('mutinynet', MUTINYNET_USDT_ASSET_ID)).toBe('USD')
    expect(designatedAccountCurrency('mutinynet', MUTINYNET_DEPIX_ASSET_ID)).toBe('BRL')
    expect(designatedAccountCurrency('bitcoin', MUTINYNET_USDT_ASSET_ID)).toBeUndefined()
  })

  it('keeps issuer metadata when no explicit account designation is supplied', () => {
    expect(
      walletAssetPresentation({
        name: 'Tether USD',
        ticker: 'USDT',
        icon: 'https://issuer.example/tether.svg',
      }),
    ).toEqual({ name: 'Tether USD', ticker: 'USDT', icon: 'https://issuer.example/tether.svg' })
  })

  it('uses the fallback asset name without empty ticker parentheses', () => {
    const presentation = walletAssetPresentation(undefined, 'asset-id')

    expect(walletAssetLabel(presentation)).toBe('asset-id')
  })
})
