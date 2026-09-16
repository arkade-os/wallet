import { createLnurlClient } from '@arkade-os/lnurl-client'
import { arkadeIdentityRequest, deriveSessionTokenForIdentity } from '@arkade-os/lnurl-client/arkade'
import type { Identity } from '@arkade-os/sdk'
import { readLnurlServers, saveLnurlServers, type LnurlServer } from './lnurlActivitySync'

export interface RegisteredLnurlAddress {
  username: string
  domain: string
  lightningAddress: string
  lnurl: string
}

/**
 * Claim a lightning address at `server` and bind this wallet's Arkade identity
 * to it, which is what lets payments arrive while the wallet is closed.
 *
 * The username is optional because the server may not let the wallet choose:
 * a domain allocating randomly assigns one, so the name that comes back is
 * authoritative and is what gets returned here.
 *
 * Registering the Arkade identity is a separate call and not optional in
 * practice — without it the address serves only the interactive rail, which is
 * the one case the wallet does not need a server for.
 */
export async function registerLnurlAddress(args: {
  identity: Identity
  arkadeAddress: string
  server: LnurlServer
  username?: string
}): Promise<RegisteredLnurlAddress> {
  const domain = args.server.domain.trim().toLowerCase()
  const client = createLnurlClient({ baseUrl: args.server.baseUrl })
  const token = await deriveSessionTokenForIdentity(args.identity, domain)

  const address = await client.registerAddress({
    token,
    domain,
    ...(args.username ? { username: args.username } : {}),
  })

  await client.registerArkadeIdentity(
    await arkadeIdentityRequest({
      identity: args.identity,
      arkadeAddress: args.arkadeAddress,
      token,
      username: address.username,
      domain,
    }),
  )

  rememberServer({ baseUrl: args.server.baseUrl, domain })

  return {
    username: address.username,
    domain: address.domain,
    lightningAddress: address.lightningAddress,
    lnurl: address.lnurl,
  }
}

/** Added to the synced set so activity for the new address is pulled on the
 *  next start. Keyed on both halves: one host can serve several domains. */
const rememberServer = (server: LnurlServer): void => {
  const known = readLnurlServers()
  if (known.some((s) => s.baseUrl === server.baseUrl && s.domain === server.domain)) return
  saveLnurlServers([...known, server])
}
