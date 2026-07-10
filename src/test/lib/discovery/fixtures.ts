import { AssetDescriptor, DiscoveryIndex, IndexMarket } from '../../../lib/discovery'

// Network-scoped asset ids as this wallet stores them: 68 hex chars.
export const DEPIX_ID = '00d1' + 'ab'.repeat(32)
export const USDT_ID = '00d2' + 'cd'.repeat(32)

export const NOW_SECONDS = 1783958400

export const btcAsset: AssetDescriptor = { id: 'btc', name: 'Bitcoin', ticker: 'BTC', precision: 8 }
export const usdtAsset: AssetDescriptor = { id: USDT_ID, name: 'Tether USD', ticker: 'USDT', precision: 6 }
export const depixAsset: AssetDescriptor = { id: DEPIX_ID, name: 'Depix', ticker: 'DEPIX', precision: 8 }

/** The default fixture market's identity: `<base_asset.id>/<quote_asset.id>`. */
export const BTC_USDT_ID_PAIR = `btc/${USDT_ID}`

export const market = (over: Partial<IndexMarket> = {}): IndexMarket => ({
  pair: 'BTC/USDT',
  solver: 'arklabs-solver',
  base_asset: btcAsset,
  quote_asset: usdtAsset,
  price_feed: 'https://feed.example.com/btcusdt',
  price_decimals: 8,
  invert: false,
  fee_bps: 30,
  min_base_amount: 1000,
  max_base_amount: 5000000,
  ...over,
})

/** A DePix-base market, as it would be listed for mutinynet. */
export const depixMarket = (over: Partial<IndexMarket> = {}): IndexMarket =>
  market({
    pair: 'DEPIX/BTC',
    solver: 'depix-solver',
    base_asset: depixAsset,
    quote_asset: btcAsset,
    price_feed: 'https://feed.example.com/depix',
    ...over,
  })

export const index = (over: Partial<DiscoveryIndex> = {}): DiscoveryIndex => ({
  version: 0,
  network: 'mutinynet',
  generated_at: NOW_SECONDS - 3600,
  commit: 'deadbeef',
  markets: [market()],
  ...over,
})

export const jsonResponse = (data: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
  }) as Response
