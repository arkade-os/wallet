import {
  orderSolverMarkets,
  solverDirectionKey,
  solverId,
  type Card,
  type DiscoveredMarket,
  type LocalCardInput,
  type Side,
  type SolverRoutingPreferences,
} from '@arkade-os/solver-discovery'

const STORAGE_KEY = 'solverRouting'
let version = 0
const listeners = new Set<() => void>()
const onStorage = (event: StorageEvent) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    version += 1
    listeners.forEach((fn) => fn())
  }
}
const cleanIds = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && Boolean(id)))] : []

const clean = (value: unknown): SolverRoutingPreferences => {
  const prefs = value && typeof value === 'object' ? (value as SolverRoutingPreferences) : {}
  const disabled = cleanIds(prefs.disabled)
  return {
    mode: prefs.mode === 'usage' || prefs.mode === 'cost' ? prefs.mode : 'manual',
    priority: cleanIds(prefs.priority),
    ...(disabled.length ? { disabled } : {}),
  }
}
const read = (): Record<string, unknown> => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
export const readSolverRouting = (network: string, direction: string): SolverRoutingPreferences =>
  clean(read()[JSON.stringify([network, direction])])
const write = (key: string, value: unknown): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...read(), [key]: value }))
  version += 1
  listeners.forEach((fn) => fn())
}
export const saveSolverRouting = (network: string, direction: string, prefs: SolverRoutingPreferences): void =>
  write(JSON.stringify([network, direction]), clean(prefs))

const cardPreferenceId = (network: string, card: Pick<Card, 'name' | 'discovery_pubkey'>, source: string): string =>
  JSON.stringify([network, card.discovery_pubkey?.toLowerCase() ?? [source, card.name]])

const inputPreferenceId = (input: LocalCardInput): string => {
  const card = input.card as Card
  return cardPreferenceId(input.network ?? 'bitcoin', card, input.label ?? `local:${card.name}`)
}

const readDisabledCards = (network: string): string[] => {
  // A null direction cannot collide with a real ordered direction key.
  const scope = read()[JSON.stringify([network, null])]
  return cleanIds(scope && typeof scope === 'object' ? (scope as { disabledCards?: unknown }).disabledCards : [])
}

export const isSolverCardEnabled = (input: LocalCardInput): boolean =>
  !readDisabledCards(input.network ?? 'bitcoin').includes(inputPreferenceId(input))

const saveCardEnabled = (network: string, id: string, enabled: boolean): void => {
  const disabledCards = readDisabledCards(network).filter((value) => value !== id)
  if (!enabled) disabledCards.push(id)
  write(JSON.stringify([network, null]), { disabledCards })
}

export const saveSolverCardEnabled = (input: LocalCardInput, enabled: boolean): void =>
  saveCardEnabled(input.network ?? 'bitcoin', inputPreferenceId(input), enabled)

const marketCardPreferenceId = (card: DiscoveredMarket, network: string): string | undefined =>
  // Pauses follow a declared key across sources; keyless cards stay local.
  card.discovery_pubkey || card.sourceType === 'local'
    ? cardPreferenceId(network, { name: card.solver, discovery_pubkey: card.discovery_pubkey }, card.source)
    : undefined

export const isSolverGloballyEnabled = (card: DiscoveredMarket, network: string): boolean => {
  const id = marketCardPreferenceId(card, network)
  return id === undefined || !readDisabledCards(network).includes(id)
}

export const enableSolverGlobally = (card: DiscoveredMarket, network: string): void => {
  const id = marketCardPreferenceId(card, network)
  if (id !== undefined) saveCardEnabled(network, id, true)
}

export const effectiveSolverRouting = (
  network: string,
  direction: string,
  candidates: readonly { card: DiscoveredMarket }[],
): SolverRoutingPreferences => {
  const preferences = readSolverRouting(network, direction)
  const disabledCards = new Set(readDisabledCards(network))
  const disabled = new Set(preferences.disabled)
  for (const { card } of candidates) {
    const id = marketCardPreferenceId(card, network)
    if (id !== undefined && disabledCards.has(id)) disabled.add(solverId(card, network))
  }
  return disabled.size ? { ...preferences, disabled: [...disabled] } : preferences
}

export const isSolverEnabled = (card: DiscoveredMarket, give: Side, network: string): boolean =>
  orderSolverMarkets([{ card, give }], {
    network,
    preferences: effectiveSolverRouting(network, solverDirectionKey(card, give, network), [{ card }]),
  }).length > 0

export const getSolverRoutingVersion = (): number => version
export const subscribeSolverRouting = (fn: () => void): (() => void) => {
  if (listeners.size === 0) window.addEventListener('storage', onStorage)
  listeners.add(fn)
  return () => {
    if (listeners.delete(fn) && listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}
