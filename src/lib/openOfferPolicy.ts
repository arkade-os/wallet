import { notifySolverRouting, PAYMENT_ROUTE_POLICY_PREFIX, readSolverRouting, saveSolverRouting } from './solverRouting'

export type OpenOfferPolicy = 'ask' | 'when-needed' | 'off'
export type OnchainSendPreference = 'solver' | 'exit'

const key = (network: string, field: 'openOffers' | 'onchain'): string =>
  `${PAYMENT_ROUTE_POLICY_PREFIX}${field}:${network}`

const read = (network: string, field: 'openOffers' | 'onchain'): string | null | undefined => {
  try {
    return localStorage.getItem(key(network, field))
  } catch {
    return undefined
  }
}

export const readOpenOfferPolicy = (network: string): OpenOfferPolicy => {
  const policy = read(network, 'openOffers')
  if (policy === null) return 'when-needed'
  return policy === 'when-needed' || policy === 'off' ? policy : 'ask'
}

export const saveOpenOfferPolicy = (network: string, policy: OpenOfferPolicy): void => {
  localStorage.setItem(key(network, 'openOffers'), policy)
  notifySolverRouting()
}

const openOffersFirstKey = (network: string, direction: string): string =>
  `${PAYMENT_ROUTE_POLICY_PREFIX}openOffersFirst:${JSON.stringify([network, direction])}`

export const readOpenOffersFirst = (network: string, direction: string): boolean => {
  const choice = readSolverRouting(network, direction).openOffersFirst
  if (choice !== undefined) return choice
  try {
    // Earlier builds stored the route's Open offers preference separately from its order.
    return localStorage.getItem(openOffersFirstKey(network, direction)) === 'true'
  } catch {
    return false
  }
}

export const saveOpenOffersFirst = (network: string, direction: string, enabled: boolean): void => {
  saveSolverRouting(network, direction, { ...readSolverRouting(network, direction), openOffersFirst: enabled })
}

export const readOnchainSendPreference = (network: string): OnchainSendPreference =>
  read(network, 'onchain') === 'exit' ? 'exit' : 'solver'

export const saveOnchainSendPreference = (network: string, preference: OnchainSendPreference): void => {
  localStorage.setItem(key(network, 'onchain'), preference)
  notifySolverRouting()
}
