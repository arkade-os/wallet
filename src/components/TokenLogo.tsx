import { glyphs, type GlyphName } from '../icons/Glyph'
import { walletAccountTicker, type WalletAccountTicker } from '../lib/accountAssets'

export type TokenLogoTicker = 'BTC' | 'USD' | 'USDT' | 'USDC' | 'CHF' | 'BRL' | 'CNY' | 'EUR' | 'GBP' | 'JPY'

export function tokenLogoTickerForTicker(ticker: string | undefined): TokenLogoTicker | undefined {
  const normalized = ticker?.trim().toUpperCase()
  if (
    normalized === 'BTC' ||
    normalized === 'USD' ||
    normalized === 'USDT' ||
    normalized === 'USDC' ||
    normalized === 'CHF' ||
    normalized === 'BRL' ||
    normalized === 'CNY' ||
    normalized === 'EUR' ||
    normalized === 'GBP' ||
    normalized === 'JPY'
  ) {
    return normalized
  }
}

export function accountTickerForAssetTicker(ticker: string | undefined): WalletAccountTicker | undefined {
  return walletAccountTicker(ticker)
}

/** Resolves the token logo for an asset, treating the wallet's native 'btc'
 * asset id as Bitcoin regardless of what string rides along as its ticker —
 * the swap screen's BTC leg carries the display unit ('sats'/'₿'), not a
 * real ticker, and would otherwise fall back to a lettered avatar. */
export function tokenLogoTickerForAsset(
  assetId: string | undefined,
  ticker: string | undefined,
): TokenLogoTicker | undefined {
  if (assetId === 'btc') return 'BTC'
  return tokenLogoTickerForTicker(ticker)
}

// A ticker only earns currency treatment (official logo, fiat-style formatting)
// once its asset is trusted — self-reported tickers of unverified assets get none.
export function trustedAssetTickers(
  ticker: string | undefined,
  trusted: boolean,
): { accountTicker: TokenLogoTicker | undefined; trustedTicker: string | undefined } {
  const accountTicker = trusted ? accountTickerForAssetTicker(ticker) : undefined
  return { accountTicker, trustedTicker: trusted ? (accountTicker ?? ticker) : undefined }
}

export default function TokenLogo({ ticker }: { ticker: TokenLogoTicker }) {
  if (ticker === 'BTC') return <Mark glyph='bitcoin' brand />
  if (ticker === 'USDT') return <Mark glyph='tether' />
  if (ticker === 'USD' || ticker === 'USDC') return <Mark glyph='dollar' />
  return <Mark text={CURRENCY_SIGNS[ticker]} />
}

const CURRENCY_SIGNS: Record<Exclude<TokenLogoTicker, 'BTC' | 'USD' | 'USDT' | 'USDC'>, string> = {
  BRL: 'R$',
  CHF: 'Fr',
  CNY: '¥',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
}

function Mark({ glyph, text, brand }: { glyph?: GlyphName; text?: string; brand?: boolean }) {
  const ink = brand ? 'var(--on-brand)' : 'var(--fg)'
  return (
    <svg aria-hidden='true' viewBox='0 0 32 32' focusable='false'>
      <circle cx='16' cy='16' r='16' fill={brand ? 'var(--brand)' : 'var(--well, var(--surface))'} />
      {glyph ? (
        <path
          d={glyphs[glyph]}
          transform='translate(6.4 6.4) scale(0.8)'
          fill='none'
          stroke={ink}
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      ) : (
        <text
          x='16'
          y='16.5'
          dominantBaseline='central'
          textAnchor='middle'
          fontFamily='var(--font-family-heading)'
          fontSize={text && text.length > 1 ? 12 : 16}
          fontWeight='500'
          fill={ink}
        >
          {text}
        </text>
      )}
    </svg>
  )
}

export function BitcoinLogo() {
  return <Mark glyph='bitcoin' brand />
}
