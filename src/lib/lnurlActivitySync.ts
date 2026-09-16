import { createLnurlClient, syncPayments, type PaymentSyncStore, type PaymentSyncTarget } from '@arkade-os/lnurl-client'
import { deriveSessionTokenForIdentity } from '@arkade-os/lnurl-client/arkade'
import type { Identity } from '@arkade-os/sdk'
import { lnurlPaymentSyncStore } from './lnurlPaymentRepository'
import { getStorageItem, setStorageItemSafely } from './storage'
import { LNURL_SERVERS_STORAGE_KEY } from './storageKeys'

/** An lnurl-server this wallet holds addresses at. */
export interface LnurlServer {
  baseUrl: string
  domain: string
}

export interface LnurlSyncOutcome {
  synced: number
  failures: { baseUrl: string; error: unknown }[]
}

const normalizeDomain = (domain: string): string => domain.trim().toLowerCase()

export const readLnurlServers = (): LnurlServer[] =>
  getStorageItem<LnurlServer[]>(LNURL_SERVERS_STORAGE_KEY, [], (value) => JSON.parse(value))

export const saveLnurlServers = (servers: LnurlServer[]): void => {
  setStorageItemSafely(LNURL_SERVERS_STORAGE_KEY, JSON.stringify(servers), 'Failed to save lnurl servers')
}

/**
 * Pull payment activity for every address this wallet owns at each server.
 *
 * Targets are discovered, never remembered. A server may assign the username
 * itself, and an address can be revoked and re-registered under a different
 * one, so `listAddresses` is the only source of truth for what a token owns.
 *
 * Failure is per-server and non-fatal: one unreachable server must not stop the
 * others, and must not cost the caller the addresses it could reach.
 */
export async function syncLnurlActivity(
  identity: Identity,
  servers: LnurlServer[] = readLnurlServers(),
  store: PaymentSyncStore = lnurlPaymentSyncStore,
): Promise<LnurlSyncOutcome> {
  const targets: PaymentSyncTarget[] = []
  const failures: LnurlSyncOutcome['failures'] = []
  for (const server of servers) {
    try {
      // Normalised the way the token derivation and the server both do it.
      // Comparing a stored "Example.com" against the server's "example.com"
      // verbatim would drop every address while still reporting success.
      const domain = normalizeDomain(server.domain)
      const token = await deriveSessionTokenForIdentity(identity, domain)
      const owned = await createLnurlClient({ baseUrl: server.baseUrl }).listAddresses(token)
      for (const entry of owned) {
        // A token is bound to one domain, so it cannot authenticate at another
        // even where one server answers for several.
        if (entry.status !== 'active' || normalizeDomain(entry.domain) !== domain) continue
        targets.push({ baseUrl: server.baseUrl, token, username: entry.username, domain: entry.domain })
      }
    } catch (error) {
      failures.push({ baseUrl: server.baseUrl, error })
    }
  }
  if (targets.length === 0) return { synced: 0, failures }
  const result = await syncPayments(targets, { client: (baseUrl) => createLnurlClient({ baseUrl }), store })
  return { synced: result.synced, failures: [...failures, ...result.failures] }
}
