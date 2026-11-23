import { notifySolverRouting, PAYMENT_ROUTE_POLICY_PREFIX } from './solverRouting'

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

export const readOnchainSendPreference = (network: string): OnchainSendPreference =>
  read(network, 'onchain') === 'exit' ? 'exit' : 'solver'

export const saveOnchainSendPreference = (network: string, preference: OnchainSendPreference): void => {
  localStorage.setItem(key(network, 'onchain'), preference)
  notifySolverRouting()
}
