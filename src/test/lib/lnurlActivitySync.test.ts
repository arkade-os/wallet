import { beforeEach, describe, it, expect, vi } from 'vitest'
import type { Identity } from '@arkade-os/sdk'
import { syncPayments, type PaymentSyncStore } from '@arkade-os/lnurl-client'
import { lnurlResyncOnPayment, syncLnurlActivity } from '../../lib/lnurlActivitySync'
import { lnurlPaymentSyncStore } from '../../lib/lnurlPaymentRepository'
import { configuredLnurlServer, lnurlReceiver } from '../../lib/receive/lnurlRail'

vi.mock('../../lib/receive/lnurlRail', () => ({ configuredLnurlServer: vi.fn(), lnurlReceiver: vi.fn() }))
vi.mock('@arkade-os/lnurl-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/lnurl-client')>()),
  syncPayments: vi.fn(),
}))

const identity = {} as Identity
const ARKADE_ADDRESS = 'ark1qtest'
const receiverMock = vi.mocked(lnurlReceiver)
const syncMock = vi.mocked(syncPayments)
const server = { baseUrl: 'https://lnurl.test', domain: 'lnurl.test' }

beforeEach(() => {
  vi.mocked(configuredLnurlServer).mockReturnValue(server)
  syncMock.mockReset().mockResolvedValue({ synced: 0, failures: [] })
})

describe('syncLnurlActivity', () => {
  it('syncs the receiver owned at the configured server', async () => {
    syncMock.mockResolvedValue({ synced: 2, failures: [] })
    receiverMock.mockReturnValue({
      owned: vi.fn().mockResolvedValue({ handle: 'alice' }),
      token: async () => 'test-token',
    } as never)

    const result = await syncLnurlActivity(identity, ARKADE_ADDRESS)

    expect(result).toEqual({ synced: 2, failures: [] })
    expect(receiverMock).toHaveBeenCalledWith(
      expect.objectContaining({ identity, arkadeAddress: ARKADE_ADDRESS, store: lnurlPaymentSyncStore }),
    )
    expect(syncMock).toHaveBeenCalledWith(
      [{ ...server, token: 'test-token', handle: 'alice' }],
      expect.objectContaining({ client: expect.any(Function), store: lnurlPaymentSyncStore }),
    )
  })

  it('passes boardingAddress and an explicit store through', async () => {
    receiverMock.mockReturnValue({
      owned: vi.fn().mockResolvedValue({ handle: 'alice' }),
      token: async () => 'test-token',
    } as never)
    const store = {} as PaymentSyncStore

    await syncLnurlActivity(identity, ARKADE_ADDRESS, { boardingAddress: 'bc1qboard', store })

    expect(receiverMock).toHaveBeenCalledWith(expect.objectContaining({ boardingAddress: 'bc1qboard', store }))
  })

  it('does not discover or refresh destinations when the wallet is already locked', async () => {
    receiverMock.mockClear()
    const controller = new AbortController()
    controller.abort()

    await expect(syncLnurlActivity(identity, ARKADE_ADDRESS, { signal: controller.signal })).resolves.toEqual({
      synced: 0,
      failures: [],
    })

    expect(receiverMock).not.toHaveBeenCalled()
  })

  it('refreshes destinations under the lock signal and resolves to zero once discovery aborts', async () => {
    const controller = new AbortController()
    const owned = vi.fn().mockImplementation(async () => {
      controller.abort()
      throw controller.signal.reason
    })
    receiverMock.mockReturnValue({ owned } as never)

    await expect(syncLnurlActivity(identity, ARKADE_ADDRESS, { signal: controller.signal })).resolves.toEqual({
      synced: 0,
      failures: [],
    })

    expect(owned).toHaveBeenCalledWith({ signal: controller.signal, refresh: true })
  })

  it('still fails when discovery fails for another reason', async () => {
    const failure = new Error('lookup failed')
    receiverMock.mockReturnValue({ owned: vi.fn().mockRejectedValue(failure) } as never)

    await expect(syncLnurlActivity(identity, ARKADE_ADDRESS, { signal: new AbortController().signal })).rejects.toBe(
      failure,
    )
  })

  it('hands its signal to the sync, which stops writing once it aborts', async () => {
    const store = { upsert: vi.fn(), readWatermark: vi.fn(), writeWatermark: vi.fn() }
    const controller = new AbortController()
    receiverMock.mockReturnValue({
      owned: vi.fn().mockResolvedValue({ handle: 'alice' }),
      token: async () => 'test-token',
    } as never)

    await syncLnurlActivity(identity, ARKADE_ADDRESS, { store, signal: controller.signal })

    expect(receiverMock).toHaveBeenCalledWith(expect.objectContaining({ store }))
    expect(syncMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ store, signal: controller.signal }),
    )
  })

  it('resolves to zero when no server is configured', async () => {
    vi.mocked(configuredLnurlServer).mockReturnValue(undefined)

    await expect(syncLnurlActivity(identity, ARKADE_ADDRESS)).resolves.toEqual({ synced: 0, failures: [] })
  })

  it('resolves to zero when the identity owns nothing there', async () => {
    receiverMock.mockReturnValue({ owned: vi.fn().mockResolvedValue(undefined) } as never)

    await expect(syncLnurlActivity(identity, ARKADE_ADDRESS)).resolves.toEqual({ synced: 0, failures: [] })
  })
})

describe('lnurlResyncOnPayment', () => {
  it('pulls activity shortly after a payment lands and again once the server caught up, reloading on news', async () => {
    vi.useFakeTimers()
    try {
      const sync = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1)
      const reload = vi.fn()
      const resync = lnurlResyncOnPayment(sync, reload)

      resync.onPayment()
      resync.onPayment()
      await vi.advanceTimersByTimeAsync(5_000)
      expect(sync).toHaveBeenCalledTimes(1)
      expect(reload).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(20_000)
      expect(sync).toHaveBeenCalledTimes(2)
      expect(reload).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('pulls nothing once cancelled, as a lock or reset does', async () => {
    vi.useFakeTimers()
    try {
      const sync = vi.fn().mockResolvedValue(1)
      const resync = lnurlResyncOnPayment(sync, vi.fn())

      resync.onPayment()
      resync.cancel()
      await vi.advanceTimersByTimeAsync(60_000)

      expect(sync).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
