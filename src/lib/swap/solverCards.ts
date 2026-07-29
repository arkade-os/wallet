import { validateCard, type Card } from '@arkade-os/solver-discovery'
import { Network } from '@arkade-os/boltz-swap'
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
const readAll = (): PinnedSolverCard[] =>
  getStorageItem<PinnedSolverCard[]>(PINNED_CARDS_KEY, [], (blob) => {
    const entries = JSON.parse(blob)
    if (!Array.isArray(entries)) throw new Error('malformed pinned cards')
    return entries.filter(isPinnedShaped)
  })

const writeAll = (entries: PinnedSolverCard[]): void =>
  setStorageItemSafely(PINNED_CARDS_KEY, JSON.stringify(entries), 'Failed to save pinned solver cards')

export const getPinnedSolverCards = (network: Network): PinnedSolverCard[] =>
  readAll().filter((pinned) => pinned.network === network)

export type PinSolverCardResult = { ok: true; card: Card } | { ok: false; errors: string[] }

/** Validate and pin a pasted card.json for `network`. Card name is the solver
 * identity, so re-pinning the same name replaces the previous version (the
 * normal way to take a solver's updated card). */
export const pinSolverCard = (network: Network, input: unknown): PinSolverCardResult => {
  const result = validateCard(input)
  if (!result.ok || !result.value) return { ok: false, errors: result.errors }
  const card = result.value
  const others = readAll().filter((pinned) => !(pinned.network === network && pinned.card.name === card.name))
  writeAll([...others, { network, card, addedAt: Date.now() }])
  return { ok: true, card }
}

export const unpinSolverCard = (network: Network, name: string): void =>
  writeAll(readAll().filter((pinned) => !(pinned.network === network && pinned.card.name === name)))
