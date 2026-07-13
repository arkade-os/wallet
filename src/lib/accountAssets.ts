export type WalletAccountTicker = 'BTC' | 'USD' | 'CHF' | 'BRL' | 'CNY' | 'EUR' | 'GBP' | 'JPY'

export function walletAccountTicker(ticker: string | undefined): WalletAccountTicker | undefined {
  const normalized = ticker?.trim().toUpperCase()
  if (normalized === 'BTC') return 'BTC'
  if (normalized === 'USD' || normalized === 'AUSD' || normalized === 'USDT' || normalized === 'USDC') return 'USD'
  if (normalized === 'CHF') return 'CHF'
  if (normalized === 'BRL' || normalized === 'DPIX' || normalized === 'DEPIX') return 'BRL'
  if (normalized === 'CNY') return 'CNY'
  if (normalized === 'EUR') return 'EUR'
  if (normalized === 'GBP') return 'GBP'
  if (normalized === 'JPY') return 'JPY'
}

export function walletAssetPresentation(
  metadata: { name?: string; ticker?: string; icon?: string } | undefined,
  fallbackName = 'Asset',
): { name: string; ticker: string; icon?: string } {
  const accountTicker = walletAccountTicker(metadata?.ticker)
  if (accountTicker) return { name: accountTicker, ticker: accountTicker }

  return {
    name: metadata?.name ?? fallbackName,
    ticker: metadata?.ticker?.trim().toUpperCase() ?? '',
    icon: metadata?.icon,
  }
}
