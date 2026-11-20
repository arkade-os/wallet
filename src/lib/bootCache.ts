import type { WalletBalance } from '@arkade-os/sdk'
import type { AspInfo } from '../providers/asp'
import type { FiatPrices } from './fiat'
import type { Tx } from './types'
import { getStorageItem, setStorageItemSafely } from './storage'

/**
 * What the wallet last knew, kept so a returning visit has something to start
 * from while the network answers.
 *
 * The entries live in localStorage beside the wallet and its config, hold
 * nothing the wallet's own stores do not already hold in the clear, and go
 * with everything else when the wallet is reset (`clearStorage`). None is ever
 * acted on: the server info and the prices are replaced by the live answers as
 * soon as they arrive, and the Home snapshot is only drawn, with the syncing
 * line beside it, until the first live load takes over.
 */

const ASP_INFO_KEY = 'aspInfoSnapshot'
const FIAT_PRICES_KEY = 'fiatPricesSnapshot'
const HOME_KEY = 'homeSnapshot'

/** How old the last prices may be and still price the first frame. Past a day the figure they give is no longer close. */
export const FIAT_PRICES_MAX_AGE_MS = 24 * 60 * 60 * 1000

/**
 * The shape of the Home snapshot this code writes and reads. A snapshot is keyed by it rather than by
 * the build, so it outlives a deploy and the first visit after one still opens on Home. Bump it
 * whenever `HomeSnapshot` or a `Tx` row changes shape: an older snapshot is then left unread.
 */
export const HOME_SNAPSHOT_SHAPE = 'home-1'

/** How many history rows the Home snapshot keeps. Home draws three; the rest is headroom for rows its list hides. */
export const HOME_SNAPSHOT_TXS = 12

// JSON has no bigint, and both snapshots carry them (server limits, asset amounts).
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

/** Whether two server answers say the same thing, so a live answer can keep the cached object. */
export const sameAspInfo = (a: AspInfo, b: AspInfo): boolean => encode(a) === encode(b)

// The session times are bigints and are added to one another; a number among them would throw.
const isScheduledSession = (value: unknown): boolean =>
  isRecord(value) &&
  ['nextStartTime', 'nextEndTime', 'duration', 'period'].every((field) => typeof value[field] === 'bigint')

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
    if (info.scheduledSession !== undefined && !isScheduledSession(info.scheduledSession)) return undefined
    return info as unknown as AspInfo
  })

/** Keep the last prices, so the next visit can show a fiat figure before the feed has answered. */
export const saveFiatPricesSnapshot = (prices: FiatPrices, now = Date.now()): void => {
  // A feed that left a currency out, or answered with nothing, is not one to start the next visit from.
  const values = Object.values(prices)
  if (values.length === 0 || !values.every((value) => typeof value === 'number' && value > 0)) return
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

export type HomeSnapshot = {
  /** The shape it was written in (`HOME_SNAPSHOT_SHAPE`): a row whose shape an update changed is
   * never handed to a screen that does not expect it. */
  build: string
  /** The wallet these figures belong to. A snapshot is only ever shown for its own wallet on its own server. */
  pubkey: string
  aspUrl: string
  savedAt: number
  balance: WalletBalance['total']
  availableBalance: WalletBalance['available']
  assetBalances: WalletBalance['assets']
  availableAssetBalances: WalletBalance['availableAssets']
  txs: Tx[]
}

/** Keep what Home shows, so the next visit can draw it before the wallet has loaded. */
export const saveHomeSnapshot = (snapshot: HomeSnapshot): void => {
  if (!snapshot.build || !snapshot.pubkey || !snapshot.aspUrl) return
  setStorageItemSafely(
    HOME_KEY,
    encode({ ...snapshot, txs: snapshot.txs.slice(0, HOME_SNAPSHOT_TXS) }),
    'Failed to save Home snapshot',
  )
}

const isAssetBalance = (value: unknown): boolean =>
  isRecord(value) && typeof value.assetId === 'string' && ['bigint', 'number'].includes(typeof value.amount)

// Checks the fields that draw a row's figure, against a damaged entry. The other fields are as this code
// wrote them, which `HOME_SNAPSHOT_SHAPE` guarantees; a row tapped on stored Home opens on its loaded copy.
const isTx = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.amount === 'number' &&
  typeof value.createdAt === 'number' &&
  typeof value.type === 'string' &&
  typeof value.settled === 'boolean' &&
  typeof value.preconfirmed === 'boolean'

/** What Home last showed for the wallet `pubkey`, if this build saved it. */
export const readHomeSnapshot = (pubkey: string | undefined, build: string): HomeSnapshot | undefined =>
  getStorageItem<HomeSnapshot | undefined>(HOME_KEY, undefined, (text) => {
    const snapshot = decode(text)
    if (!pubkey || !isRecord(snapshot) || snapshot.pubkey !== pubkey || snapshot.build !== build) return undefined
    if (typeof snapshot.aspUrl !== 'string' || !snapshot.aspUrl) return undefined
    // No age limit, on purpose: a snapshot is only ever drawn with the syncing line beside it, and
    // the first load replaces it. `savedAt` is kept for diagnosis, and checked only for its type.
    if (typeof snapshot.savedAt !== 'number') return undefined
    if (typeof snapshot.balance !== 'number' || typeof snapshot.availableBalance !== 'number') return undefined
    if (!Array.isArray(snapshot.assetBalances) || !snapshot.assetBalances.every(isAssetBalance)) return undefined
    if (!Array.isArray(snapshot.availableAssetBalances) || !snapshot.availableAssetBalances.every(isAssetBalance)) {
      return undefined
    }
    if (!Array.isArray(snapshot.txs) || !snapshot.txs.every(isTx)) return undefined
    return snapshot as unknown as HomeSnapshot
  })

/**
 * The loaded copy of a history row that came from the snapshot, if the load has it. A row tapped on
 * stored Home holds the stored copy until the load lands, and the payment may have settled since.
 */
export const loadedCopyOf = (row: Tx, loaded: Tx[]): Tx | undefined =>
  loaded.find((tx) =>
    row.historyKey && tx.historyKey
      ? tx.historyKey === row.historyKey
      : tx.type === row.type &&
        tx.roundTxid === row.roundTxid &&
        tx.redeemTxid === row.redeemTxid &&
        tx.boardingTxid === row.boardingTxid,
  )
