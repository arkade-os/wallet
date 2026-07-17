import type { DiscoveredMarket } from '@arkade-os/solver-discovery'

// the two mutinynet registry markets, in the 0.1.3 registry schema
export const USDT_ID = 'f121ac9b7656797cc68d1e8fecacfbaa2069ec1461edf0bf2f3c37404cb9791a0000'
export const DEPIX_ID = '47004bf4a5fbdb2221f708030528de68ea28f5980044e546b7bb5a352457d1f30000'

export const btcUsdt: DiscoveredMarket = {
  pair: 'BTC/USDT',
  base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
  quote_asset: { id: USDT_ID, name: 'USDT', ticker: 'USDT', decimals: 2 },
  price_feed: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
  price_feed_schema: { type: 'json', price_path: '/bitcoin/usd' },
  price_decimals: 6,
  fee_bps: 30,
  min_base_amount: '1000',
  max_base_amount: '5000000',
  min_quote_amount: '50',
  max_quote_amount: '500000',
  solver: 'frenchman',
  source: 'registry',
  sourceType: 'registry',
}

export const btcDepix: DiscoveredMarket = {
  ...btcUsdt,
  pair: 'BTC/DePix',
  quote_asset: { id: DEPIX_ID, name: 'Decentralized Pix', ticker: 'DePix', decimals: 8 },
  price_feed: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCBRL',
  price_feed_schema: { type: 'json', price_path: '/price' },
  price_decimals: 0,
  min_quote_amount: '1000000',
  max_quote_amount: '100000000000',
  solver: 'jpmorgan',
}
