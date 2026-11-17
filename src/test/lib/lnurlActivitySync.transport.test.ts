import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Identity } from '@arkade-os/sdk'
import type { LnurlClient, PaymentSyncStore } from '@arkade-os/lnurl-client'
import { syncLnurlActivity } from '../../lib/lnurlActivitySync'

vi.mock('../../lib/receive/lnurlRail', async () => {
  const { createLnurlClient, syncPayments } = await import('@arkade-os/lnurl-client')
  const server = { baseUrl: 'https://lnurl.test', domain: 'lnurl.test' }
  return {
    configuredLnurlServer: () => server,
    lnurlReceiver: ({ client, store }: { client?: LnurlClient; store: PaymentSyncStore }) => ({
      domain: server.domain,
      token: async () => 'test-token',
      owned: async () => {
        await (client ?? createLnurlClient(server)).listAddresses('test-token')
        return {
          handle: 'alice',
          sync: ({ signal }: { signal?: AbortSignal }) =>
            syncPayments([{ ...server, token: 'test-token', handle: 'alice' }], {
              client: (baseUrl) => createLnurlClient({ baseUrl }),
              store,
              signal,
            }),
        }
      },
    }),
  }
})

const page = () =>
  Response.json({
    source: { domain: 'lnurl.test', lightningAddress: 'alice@lnurl.test', handle: 'alice' },
    payments: [],
    nextSince: 0,
  })

const healthyFetch = async (input: string) =>
  new URL(input).pathname === '/lnurl/address' ? Response.json([]) : page()

describe('LNURL activity transport', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const runWithStall = (stage: 'discovery' | 'headers' | 'body') => {
    let release = () => {}
    let requestSignal: AbortSignal | null | undefined
    const store = { upsert: vi.fn(), readWatermark: vi.fn(), writeWatermark: vi.fn() }
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const discovery = new URL(input).pathname === '/lnurl/address'
      if (discovery && stage !== 'discovery') return Response.json([])
      requestSignal = init?.signal
      if (stage === 'body') {
        return new Response(
          new ReadableStream({
            start(controller) {
              release = () => controller.close()
              requestSignal?.addEventListener('abort', () => controller.error(requestSignal?.reason), { once: true })
            },
          }),
        )
      }
      return new Promise<Response>((resolve, reject) => {
        release = () => resolve(discovery ? Response.json([]) : page())
        requestSignal?.addEventListener('abort', () => reject(requestSignal?.reason), { once: true })
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    const settled = vi.fn()
    const pending = syncLnurlActivity({} as Identity, 'ark1test', { store, signal: controller.signal }).then(
      settled,
      settled,
    )
    return { controller, settled, pending, store, release: () => release(), signal: () => requestSignal }
  }

  it.each(['discovery', 'headers', 'body'] as const)('bounds a stalled %s and permits the next sync', async (stage) => {
    const run = runWithStall(stage)
    try {
      await vi.advanceTimersByTimeAsync(10_000)
      expect(run.signal()?.aborted).toBe(true)
      expect(run.settled).toHaveBeenCalledOnce()
      expect(run.store.upsert).not.toHaveBeenCalled()

      vi.stubGlobal('fetch', vi.fn(healthyFetch))
      await expect(syncLnurlActivity({} as Identity, 'ark1test', { store: run.store })).resolves.toEqual({
        synced: 0,
        failures: [],
      })
    } finally {
      vi.stubGlobal('fetch', vi.fn(healthyFetch))
      if (!run.signal()?.aborted) run.release()
      await run.pending
    }
  })

  it('aborts an in-flight payment body when the wallet locks without writing it', async () => {
    const run = runWithStall('body')
    try {
      await vi.advanceTimersByTimeAsync(0)
      run.controller.abort()
      await vi.advanceTimersByTimeAsync(0)
      expect(run.signal()?.aborted).toBe(true)
      expect(run.settled).toHaveBeenCalledOnce()
      expect(run.store.upsert).not.toHaveBeenCalled()
      expect(run.store.writeWatermark).not.toHaveBeenCalled()
    } finally {
      if (!run.signal()?.aborted) run.release()
      await run.pending
    }
  })

  it('stores a payment once and advances the handle watermark through the bounded client', async () => {
    const payment = {
      paymentHash: 'payment-hash',
      paymentOption: 'lightning',
      pr: 'invoice',
      preimage: 'preimage',
      swapId: 'swap-id',
      payoutReference: 'arkade-txid',
      settled: true,
      amountMsat: 20_000,
      createdAt: 1000,
      settledAt: 2000,
    }
    const store = { upsert: vi.fn(), readWatermark: vi.fn().mockResolvedValue(500), writeWatermark: vi.fn() }
    const fetchMock = vi.fn(async (input: string) =>
      new URL(input).pathname === '/lnurl/address'
        ? Response.json([])
        : Response.json({
            source: { domain: 'lnurl.test', lightningAddress: 'alice@lnurl.test', handle: 'alice' },
            payments: [payment],
            nextSince: 1000,
          }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(syncLnurlActivity({} as Identity, 'ark1test', { store })).resolves.toEqual({
      synced: 1,
      failures: [],
    })

    expect(store.upsert).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({
        key: 'https://lnurl.test|payment-hash',
        handle: 'alice',
        kind: 'bolt11',
        amountMsat: 20_000,
        payoutReference: 'arkade-txid',
      }),
    ])
    expect(store.writeWatermark).toHaveBeenCalledExactlyOnceWith('https://lnurl.test', 'alice@lnurl.test', 1000)
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://lnurl.test/lnurl/address/alice/payments?domain=lnurl.test&since=500&limit=50',
    )
  })
})
