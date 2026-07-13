import { describe, expect, it } from 'vitest'
import { walletAccountTicker, walletAssetPresentation } from '../../lib/accountAssets'

describe('wallet account asset presentation', () => {
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
