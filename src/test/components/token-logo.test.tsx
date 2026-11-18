import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import TokenLogo, { tokenLogoTickerForTicker } from '../../components/TokenLogo'

describe('tokenLogoTickerForTicker', () => {
  it('maps every supported currency ticker to a token logo ticker', () => {
    for (const ticker of ['BTC', 'USD', 'USDT', 'USDC', 'CHF', 'BRL', 'CNY', 'EUR', 'GBP', 'JPY']) {
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
  it('draws Bitcoin on the accent', () => {
    const { container } = render(<TokenLogo ticker='BTC' />)
    expect(container.querySelector('circle')?.getAttribute('fill')).toBe('var(--brand)')
    expect(container.querySelector('path')).not.toBeNull()
  })

  it('draws a currency sign for fiat accounts', () => {
    expect(render(<TokenLogo ticker='BRL' />).container.textContent).toBe('R$')
    expect(render(<TokenLogo ticker='GBP' />).container.textContent).toBe('£')
    expect(render(<TokenLogo ticker='EUR' />).container.textContent).toBe('€')
  })

  it('draws the dollar and tether signs as glyphs, on the surface colour', () => {
    for (const ticker of ['USD', 'USDC', 'USDT'] as const) {
      const { container } = render(<TokenLogo ticker={ticker} />)
      expect(container.querySelector('circle')?.getAttribute('fill')).toBe('var(--well, var(--surface))')
      expect(container.querySelector('path')).not.toBeNull()
    }
  })

  // Marks reference nothing by id, so the same mark can repeat in a list or
  // a swap route without duplicate ids in the document.
  it('renders no ids, however many times a mark repeats', () => {
    const { container } = render(
      <>
        <TokenLogo ticker='USD' />
        <TokenLogo ticker='USD' />
        <TokenLogo ticker='BRL' />
        <TokenLogo ticker='BRL' />
      </>,
    )
    expect(container.querySelectorAll('[id]')).toHaveLength(0)
  })
})
