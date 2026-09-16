import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { StoredPayment, PaymentSyncStore } from '@arkade-os/lnurl-client'
import type { Identity } from '@arkade-os/sdk'
import { syncLnurlActivity, readLnurlServers, saveLnurlServers } from '../../lib/lnurlActivitySync'

const SERVER = { baseUrl: 'https://lnurl-a.test', domain: 'example.com' }
const OTHER = { baseUrl: 'https://lnurl-b.test', domain: 'other.com' }

const listAddresses = vi.fn()
const listPayments = vi.fn()

vi.mock('@arkade-os/lnurl-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/lnurl-client')>()),
  createLnurlClient: () => ({ listAddresses, listPayments }),
}))

vi.mock('@arkade-os/lnurl-client/arkade', () => ({
  deriveSessionTokenForIdentity: async (_identity: unknown, domain: string) => `token-for-${domain}`,
}))

const identity = {} as Identity

const entry = (username: string, domain: string, status = 'active') => ({
  username,
  domain,
  status,
  createdAt: 1,
  lightningAddress: `${username}@${domain}`,
  lnurl: 'LNURL1',
})

const page = (username: string, domain: string, payments: unknown[] = []) => ({
  source: { domain, lightningAddress: `${username}@${domain}` },
  payments,
  nextSince: 0,
})

const bolt11 = (paymentHash: string) => ({
  kind: 'bolt11' as const,
  paymentHash,
  pr: 'lnbc1',
  preimage: null,
  swapId: null,
  settled: true,
  amountMsat: 1000,
  createdAt: 5,
  settledAt: 6,
})

const memoryStore = (): PaymentSyncStore & { all(): StoredPayment[] } => {
  const records = new Map<string, StoredPayment>()
  const watermarks = new Map<string, number>()
  return {
    upsert: async (next) => {
      for (const r of next) records.set(r.key, r)
    },
    readWatermark: async (baseUrl, address) => watermarks.get(`${baseUrl}|${address}`),
    writeWatermark: async (baseUrl, address, since) => {
      watermarks.set(`${baseUrl}|${address}`, since)
    },
    all: () => [...records.values()],
  }
}

beforeEach(() => {
  localStorage.clear()
  listAddresses.mockReset()
  listPayments.mockReset()
})
afterEach(() => vi.clearAllMocks())

describe('lnurl server list', () => {
  it('round-trips and defaults to empty', () => {
    expect(readLnurlServers()).toEqual([])
    saveLnurlServers([SERVER])
    expect(readLnurlServers()).toEqual([SERVER])
  })
})

describe('syncLnurlActivity', () => {
  it('discovers the username from the server rather than assuming one', async () => {
    // The server assigned "brave-otter"; nothing wallet-side chose it.
    listAddresses.mockResolvedValue([entry('brave-otter', SERVER.domain)])
    listPayments.mockResolvedValue(page('brave-otter', SERVER.domain, [bolt11('hash-1')]))
    const store = memoryStore()

    const result = await syncLnurlActivity(identity, [SERVER], store)

    expect(listPayments).toHaveBeenCalledWith(
      'token-for-example.com',
      'brave-otter',
      expect.objectContaining({ domain: SERVER.domain }),
    )
    expect(result).toEqual({ synced: 1, failures: [] })
    expect(store.all()[0]?.lightningAddress).toBe(`brave-otter@${SERVER.domain}`)
  })

  it('skips addresses that are not active or belong to another domain', async () => {
    listAddresses.mockResolvedValue([
      entry('revoked', SERVER.domain, 'revoked'),
      entry('elsewhere', 'somewhere-else.test'),
      entry('alice', SERVER.domain),
    ])
    listPayments.mockResolvedValue(page('alice', SERVER.domain))

    await syncLnurlActivity(identity, [SERVER], memoryStore())

    expect(listPayments).toHaveBeenCalledTimes(1)
    expect(listPayments).toHaveBeenCalledWith(expect.anything(), 'alice', expect.anything())
  })

  it('does not call the sync loop when nothing is owned', async () => {
    listAddresses.mockResolvedValue([])

    await expect(syncLnurlActivity(identity, [SERVER], memoryStore())).resolves.toEqual({ synced: 0, failures: [] })
    expect(listPayments).not.toHaveBeenCalled()
  })

  it('reports a server whose discovery fails without losing the others', async () => {
    listAddresses.mockImplementation(async (token: string) =>
      token === `token-for-${OTHER.domain}`
        ? Promise.reject(new Error('unreachable'))
        : [entry('alice', SERVER.domain)],
    )
    listPayments.mockResolvedValue(page('alice', SERVER.domain, [bolt11('hash-1')]))

    const result = await syncLnurlActivity(identity, [SERVER, OTHER], memoryStore())

    expect(result.synced).toBe(1)
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]?.baseUrl).toBe(OTHER.baseUrl)
  })

  it('reads the stored server list when none is passed', async () => {
    saveLnurlServers([SERVER])
    listAddresses.mockResolvedValue([entry('alice', SERVER.domain)])
    listPayments.mockResolvedValue(page('alice', SERVER.domain))

    await syncLnurlActivity(identity, undefined, memoryStore())

    expect(listAddresses).toHaveBeenCalledWith('token-for-example.com')
  })
})
