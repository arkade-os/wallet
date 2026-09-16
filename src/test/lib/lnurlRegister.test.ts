import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Identity } from '@arkade-os/sdk'
import { registerLnurlAddress } from '../../lib/lnurlRegister'
import { readLnurlServers, saveLnurlServers } from '../../lib/lnurlActivitySync'

const SERVER = { baseUrl: 'https://lnurl-a.test', domain: 'example.com' }
const ARK = 'ark1qexampledestination'

const registerAddress = vi.fn()
const registerArkadeIdentity = vi.fn()

vi.mock('@arkade-os/lnurl-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/lnurl-client')>()),
  createLnurlClient: () => ({ registerAddress, registerArkadeIdentity }),
}))

vi.mock('@arkade-os/lnurl-client/arkade', () => ({
  deriveSessionTokenForIdentity: async (_i: unknown, domain: string) => `token-for-${domain}`,
  arkadeIdentityRequest: async (p: { token: string; username: string; arkadeAddress: string; domain?: string }) => ({
    token: p.token,
    username: p.username,
    arkadeAddress: p.arkadeAddress,
    claimPublicKey: '02' + 'ab'.repeat(32),
    ...(p.domain ? { domain: p.domain } : {}),
  }),
}))

const identity = {} as Identity

const registered = (username: string) => ({
  username,
  domain: SERVER.domain,
  lightningAddress: `${username}@${SERVER.domain}`,
  lnurl: 'LNURL1EXAMPLE',
  status: 'active',
})

beforeEach(() => {
  localStorage.clear()
  registerAddress.mockReset()
  registerArkadeIdentity.mockReset()
  registerArkadeIdentity.mockResolvedValue(undefined)
})

describe('registerLnurlAddress', () => {
  it('returns the server-assigned username when none was requested', async () => {
    registerAddress.mockResolvedValue(registered('brave-otter'))

    const result = await registerLnurlAddress({ identity, arkadeAddress: ARK, server: SERVER })

    expect(registerAddress).toHaveBeenCalledWith({ token: 'token-for-example.com', domain: SERVER.domain })
    expect(result.lightningAddress).toBe(`brave-otter@${SERVER.domain}`)
  })

  it('binds the Arkade identity to the name the server actually assigned', async () => {
    registerAddress.mockResolvedValue(registered('brave-otter'))

    await registerLnurlAddress({ identity, arkadeAddress: ARK, server: SERVER, username: 'alice' })

    expect(registerAddress).toHaveBeenCalledWith(expect.objectContaining({ username: 'alice' }))
    // The bind uses the returned name, not the requested one: a domain that
    // allocates randomly ignores the request and the two would diverge.
    expect(registerArkadeIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'brave-otter', arkadeAddress: ARK }),
    )
  })

  it('adds the server to the synced set so activity is pulled next start', async () => {
    registerAddress.mockResolvedValue(registered('alice'))

    await registerLnurlAddress({ identity, arkadeAddress: ARK, server: SERVER })

    expect(readLnurlServers()).toEqual([SERVER])
  })

  it('does not duplicate a server already being synced', async () => {
    saveLnurlServers([SERVER])
    registerAddress.mockResolvedValue(registered('alice'))

    await registerLnurlAddress({ identity, arkadeAddress: ARK, server: SERVER })

    expect(readLnurlServers()).toEqual([SERVER])
  })

  it('does not remember a server whose identity bind failed', async () => {
    registerAddress.mockResolvedValue(registered('alice'))
    registerArkadeIdentity.mockRejectedValue(new Error('bind failed'))

    await expect(registerLnurlAddress({ identity, arkadeAddress: ARK, server: SERVER })).rejects.toThrow('bind failed')
    // Syncing an address that cannot receive offline would report success while
    // the rails that need the identity stay unavailable.
    expect(readLnurlServers()).toEqual([])
  })
})
