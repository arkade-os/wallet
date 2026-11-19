import type { AspInfo } from '../providers/asp'
import type { FiatPrices } from './fiat'
import { getStorageItem, setStorageItemSafely } from './storage'

/**
 * What the wallet last knew, kept so a returning visit has something to start
 * from while the network answers.
 *
 * The entries live in localStorage beside the wallet and its config, hold
 * nothing the wallet's own stores do not already hold in the clear, and go
 * with everything else when the wallet is reset (`clearStorage`). None is ever
 * acted on: the server info and the prices are replaced by the live answers as
 * soon as they arrive.
 */

const ASP_INFO_KEY = 'aspInfoSnapshot'
const FIAT_PRICES_KEY = 'fiatPricesSnapshot'

/** How old the last prices may be and still price the first frame. Past a day the figure they give is no longer close. */
export const FIAT_PRICES_MAX_AGE_MS = 24 * 60 * 60 * 1000

// JSON has no bigint, and the server info carries them (limits, delays).
const encode = (value: unknown): string =>
  JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? { $bigint: v.toString() } : v))

const decode = (text: string): unknown =>
  JSON.parse(text, (_, v) =>
    v && typeof v === 'object' && typeof v.$bigint === 'string' && Object.keys(v).length === 1 ? BigInt(v.$bigint) : v,
  )

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/**
 * Keep the server's last answer, for the next visit to start from. Only a reachable answer is
 * worth keeping, and `build` marks who wrote it: a snapshot is read back only by the code that
 * saved it, so a field an update added or reshaped is never missing from what a screen is handed.
 */
export const saveAspInfoSnapshot = (info: AspInfo, build: string): void => {
  if (info.unreachable || !info.url || !info.network || !info.signerPubkey || !build) return
  setStorageItemSafely(ASP_INFO_KEY, encode({ build, info }), 'Failed to save server info snapshot')
}

/** The server's last answer for `url`, if this build saved one. */
export const readAspInfoSnapshot = (url: string, build: string): AspInfo | undefined =>
  getStorageItem<AspInfo | undefined>(ASP_INFO_KEY, undefined, (text) => {
    const stored = decode(text)
    if (!isRecord(stored) || stored.build !== build || !isRecord(stored.info)) return undefined
    const info = stored.info
    if (info.url !== url || info.unreachable !== false) return undefined
    if (typeof info.network !== 'string' || !info.network) return undefined
    if (typeof info.signerPubkey !== 'string' || !info.signerPubkey) return undefined
    if (typeof info.dust !== 'bigint' || !isRecord(info.fees)) return undefined
    return info as unknown as AspInfo
  })

/** Keep the last prices, so the next visit can show a fiat figure before the feed has answered. */
export const saveFiatPricesSnapshot = (prices: FiatPrices, now = Date.now()): void => {
  // A feed that left a currency out is not one to start the next visit from.
  if (!Object.values(prices).every((value) => typeof value === 'number' && value > 0)) return
  setStorageItemSafely(FIAT_PRICES_KEY, JSON.stringify({ at: now, prices }), 'Failed to save fiat prices snapshot')
}

/** The last prices, if they are recent enough to show. */
export const readFiatPricesSnapshot = (now = Date.now()): FiatPrices | undefined =>
  getStorageItem<FiatPrices | undefined>(FIAT_PRICES_KEY, undefined, (text) => {
    const stored = JSON.parse(text)
    if (!isRecord(stored) || typeof stored.at !== 'number' || !isRecord(stored.prices)) return undefined
    if (now - stored.at > FIAT_PRICES_MAX_AGE_MS || stored.at > now) return undefined
    const values = Object.values(stored.prices)
    if (values.length === 0 || !values.every((value) => typeof value === 'number' && value > 0)) return undefined
    return stored.prices as unknown as FiatPrices
  })
