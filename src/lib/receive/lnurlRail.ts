import { arkadeLnurl, type ArkadeLnurl, type ArkadeSigner } from '@arkade-os/lnurl-client/arkade'
import { LnurlError, type PaymentSyncStore } from '@arkade-os/lnurl-client'

/** An lnurl-server this wallet holds addresses at. */
export interface LnurlServer {
  baseUrl: string
  domain: string
}

/**
 * The server this build offers addresses at, or undefined when none is set.
 *
 * Configured rather than defaulted: which lnurl-server a wallet trusts with its
 * receive identity is not a choice to bake into a binary, and a wrong default
 * would be a bearer credential handed to someone the user never picked.
 * `VITE_LNURL_DOMAIN` is only needed where the LUD-16 domain differs from the
 * API host, which is the unusual case.
 */
export const configuredLnurlServer = (): LnurlServer | undefined => {
  const baseUrl = import.meta.env.VITE_LNURL_SERVER?.trim()
  if (!baseUrl) return undefined
  try {
    const domain = (import.meta.env.VITE_LNURL_DOMAIN?.trim() || new URL(baseUrl).hostname).toLowerCase()
    return { baseUrl, domain }
  } catch {
    return undefined
  }
}

/** The facade bound to this build's server and receive identity, or undefined
 *  when unconfigured — claiming, discovery and payer routing all go through it. */
export function lnurlReceiver(deps: {
  identity: ArkadeSigner
  arkadeAddress: string
  boardingAddress?: string
  store?: PaymentSyncStore
}): ArkadeLnurl | undefined {
  const server = configuredLnurlServer()
  if (!server) return undefined
  return arkadeLnurl({ ...deps, baseUrl: server.baseUrl, domain: server.domain })
}

const CLAIM_ERROR_MESSAGES: Record<string, string> = {
  taken: 'That name is already taken.',
  invalid_username: 'That name is not allowed here.',
  blacklisted: 'That name is not allowed here.',
  invalid_claim: 'That claim code is not valid.',
  forbidden_mode: 'This server does not offer that option.',
  limit_reached: 'Too many attempts — try again shortly.',
}

/** User-facing text for a failed claim, keyed off the server's machine code
 *  where one exists so the message survives its wording changing. */
export const lnurlClaimErrorMessage = (error: unknown): string => {
  if (error instanceof LnurlError && error.code) {
    const known = CLAIM_ERROR_MESSAGES[error.code]
    if (known) return known
  }
  return error instanceof Error ? error.message : 'Could not get a lightning address.'
}
