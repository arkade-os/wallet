import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import TokenLogo, {
  tokenLogoTickerForTicker,
  BrazilFlagLogo,
  CubaFlagLogo,
  UnitedKingdomFlagLogo,
} from '../../components/TokenLogo'

describe('tokenLogoTickerForTicker', () => {
  it('maps every supported currency ticker to a token logo ticker', () => {
    for (const ticker of ['BTC', 'USD', 'USDT', 'USDC', 'CHF', 'BRL', 'CNY', 'CUP', 'EUR', 'GBP', 'JPY']) {
      expect(tokenLogoTickerForTicker(ticker)).toBe(ticker)
    }
  })

  it('normalizes casing and trims', () => {
    expect(tokenLogoTickerForTicker(' brl ')).toBe('BRL')
  })

  it('returns undefined for unknown tickers', () => {
    expect(tokenLogoTickerForTicker('XYZ')).toBeUndefined()
  })
})

describe('TokenLogo', () => {
  it('renders the Brazilian flag for BRL', () => {
    const { container } = render(<TokenLogo ticker='BRL' />)
    expect(container.querySelector('clipPath[id^="br-flag-circle"]')).not.toBeNull()
    expect(container.innerHTML).toContain('#009B3A')
    expect(container.innerHTML).toContain('#FFDF00')
  })

  it('renders the United Kingdom flag for GBP', () => {
    const { container } = render(<TokenLogo ticker='GBP' />)
    expect(container.querySelector('clipPath[id^="gb-flag-circle"]')).not.toBeNull()
  })

  it('renders the Cuban flag for CUP', () => {
    const { container } = render(<TokenLogo ticker='CUP' />)
    expect(container.querySelector('clipPath[id^="cu-flag-circle"]')).not.toBeNull()
  })

  // url(#id) resolves against the whole document, not the local <svg>, so two
  // instances of the same flag used to point at whichever clipPath came first.
  // TokenLogo is rendered per transaction and per swap hop, so a list with two
  // USD entries is enough to produce the duplicate.
  it('gives each instance of the same flag its own clip path id', () => {
    const { container } = render(
      <>
        <TokenLogo ticker='USD' />
        <TokenLogo ticker='USD' />
        <BrazilFlagLogo />
        <BrazilFlagLogo />
        <CubaFlagLogo />
        <CubaFlagLogo />
        <UnitedKingdomFlagLogo />
        <UnitedKingdomFlagLogo />
      </>,
    )

    for (const prefix of ['us-flag-circle', 'br-flag-circle', 'cu-flag-circle', 'gb-flag-circle']) {
      const ids = [...container.querySelectorAll('clipPath')].map((el) => el.getAttribute('id'))
      const matching = ids.filter((id) => id?.startsWith(prefix))
      expect(matching).toHaveLength(2)
      expect(new Set(matching).size).toBe(2)
    }
  })

  // The clip path has to live inside the same <svg> that references it, or the
  // reference is resolving against a sibling instance.
  it('scopes each clip path to the svg that references it', () => {
    const { container } = render(
      <>
        <TokenLogo ticker='USD' />
        <TokenLogo ticker='USD' />
      </>,
    )

    for (const svg of container.querySelectorAll('svg')) {
      const g = svg.querySelector('g[clip-path]')
      if (!g) continue
      const url = g.getAttribute('clip-path') ?? ''
      const id = url.match(/url\(#(.+)\)/)?.[1]
      expect(id).toBeTruthy()
      expect(svg.querySelector(`clipPath[id="${id}"]`)).not.toBeNull()
    }
  })
})
