import { isNetwork, validateCard, type Card, type Network } from '@arkade-os/solver-discovery'
import { getStorageItem, setStorageItemSafely } from '../storage'

/** A solver card the user pinned by hand: solver operators who prefer not to
 * list in the public registry hand their card.json to users directly, and the
 * user pastes it in Settings > Solvers (#828). */
export interface PinnedSolverCard {
  /** Network the user pinned the card for — cards do not carry one themselves. */
  network: Network
  /** The schema-validated card, exactly as the solver published it. */
  card: Card
  /** Pin time, for display and stable list ordering. */
  addedAt: number
}

const PINNED_CARDS_KEY = 'pinnedSolverCards'

/** Caps so pasted cards cannot crowd out the wallet's own persistence in the
 * ~5 MB localStorage budget: real cards are a few KB with a handful of markets. */
export const MAX_PINNED_CARDS_PER_NETWORK = 10
export const MAX_CARD_JSON_BYTES = 64 * 1024

const isPinnedShaped = (entry: unknown): entry is PinnedSolverCard => {
  const pinned = entry as PinnedSolverCard | null
  return Boolean(
    pinned &&
      typeof pinned.network === 'string' &&
      typeof pinned.addedAt === 'number' &&
      pinned.card &&
      typeof pinned.card.name === 'string' &&
      Array.isArray(pinned.card.markets),
  )
}

// unshaped entries are dropped rather than failing the read: one hand-edited
// blob must not take every pinned solver down with it. Full schema validation
// happens again at discovery time, where a bad card is skipped with a warning.
const parseEntries = (blob: string | null): PinnedSolverCard[] => {
  if (blob === null) return []
  try {
    const entries = JSON.parse(blob)
    return Array.isArray(entries) ? entries.filter(isPinnedShaped) : []
  } catch {
    return []
  }
}

const readBlob = (): string | null => getStorageItem<string | null>(PINNED_CARDS_KEY, null, (blob) => blob)

const readAll = (): PinnedSolverCard[] => parseEntries(readBlob())

// a failed write (quota, private mode) must reach the caller: reporting a pin
// as saved while storage rejected it would leave a phantom solver in the UI
const writeAll = (entries: PinnedSolverCard[]): boolean =>
  setStorageItemSafely(PINNED_CARDS_KEY, JSON.stringify(entries), 'Failed to save pinned solver cards')

// single-entry memo: discovery re-reads the pinned list on every call (mount,
// tab return, refresh), so an unchanged blob should cost a string compare, not
// a re-parse — and the stable array identity lets discovery skip re-validating
// cards that did not change
let readCache: { blob: string | null; network: Network; cards: PinnedSolverCard[] } | undefined

export const getPinnedSolverCards = (network: Network): PinnedSolverCard[] => {
  const blob = readBlob()
  if (readCache && readCache.blob === blob && readCache.network === network) return readCache.cards
  const cards = parseEntries(blob).filter((pinned) => pinned.network === network)
  readCache = { blob, network, cards }
  return cards
}

export type PinSolverCardResult = { ok: true; card: Card } | { ok: false; errors: string[] }

/** Validate and pin a pasted card.json for `network`. Card name is the solver
 * identity, so re-pinning the same name replaces the previous version (the
 * normal way to take a solver's updated card). */
export const pinSolverCard = (network: Network, input: unknown): PinSolverCardResult => {
  // defense in depth for untyped callers: discovery ignores cards pinned
  // under a network the SDK does not know, so refuse to persist them at all
  if (!isNetwork(network)) return { ok: false, errors: [`solver cards are not supported on network "${network}"`] }
  const result = validateCard(input)
  if (!result.ok || !result.value) return { ok: false, errors: result.errors }
  const card = result.value
  if (JSON.stringify(card).length > MAX_CARD_JSON_BYTES) {
    return { ok: false, errors: [`card is too large (max ${MAX_CARD_JSON_BYTES / 1024} KB)`] }
  }
  const others = readAll().filter((pinned) => !(pinned.network === network && pinned.card.name === card.name))
  if (others.filter((pinned) => pinned.network === network).length >= MAX_PINNED_CARDS_PER_NETWORK) {
    return { ok: false, errors: [`at most ${MAX_PINNED_CARDS_PER_NETWORK} solvers can be pinned — remove one first`] }
  }
  if (!writeAll([...others, { network, card, addedAt: Date.now() }])) {
    return { ok: false, errors: ['could not save the card — storage is full or unavailable'] }
  }
  return { ok: true, card }
}

export const unpinSolverCard = (network: Network, name: string): void => {
  writeAll(readAll().filter((pinned) => !(pinned.network === network && pinned.card.name === name)))
}
