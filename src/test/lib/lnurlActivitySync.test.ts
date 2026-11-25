import { describe, it, expect, vi } from 'vitest'
import type { Identity } from '@arkade-os/sdk'
import type { PaymentSyncStore } from '@arkade-os/lnurl-client'
import { lnurlResyncOnPayment, syncLnurlActivity } from '../../lib/lnurlActivitySync'
import { lnurlPaymentSyncStore } from '../../lib/lnurlPaymentRepository'
import { lnurlReceiver } from '../../lib/receive/lnurlRail'

vi.mock('../../lib/receive/lnurlRail', () => ({ lnurlReceiver: vi.fn() }))

const identity = {} as Identity
const ARKADE_ADDRESS = 'ark1qtest'
const receiverMock = vi.mocked(lnurlReceiver)

describe('syncLnurlActivity', () => {
  it('syncs the receiver owned at the configured server', async () => {
    const sync = vi.fn().mockResolvedValue({ synced: 2, failures: [] })
    receiverMock.mockReturnValue({ owned: vi.fn().mockResolvedValue({ sync }) } as never)

    const result = await syncLnurlActivity(identity, ARKADE_ADDRESS)

    expect(result).toEqual({ synced: 2, failures: [] })
    expect(receiverMock).toHaveBeenCalledWith(
      expect.objectContaining({ identity, arkadeAddress: ARKADE_ADDRESS, store: lnurlPaymentSyncStore }),
    )
  })

  it('passes boardingAddress and an explicit store through', async () => {
    const sync = vi.fn().mockResolvedValue({ synced: 0, failures: [] })
    receiverMock.mockReturnValue({ owned: vi.fn().mockResolvedValue({ sync }) } as never)
    const store = {} as PaymentSyncStore

    await syncLnurlActivity(identity, ARKADE_ADDRESS, { boardingAddress: 'bc1qboard', store })

    expect(receiverMock).toHaveBeenCalledWith(expect.objectContaining({ boardingAddress: 'bc1qboard', store }))
  })

  it('hands its signal to the sync, which stops writing once it aborts', async () => {
    const store = { upsert: vi.fn(), readWatermark: vi.fn(), writeWatermark: vi.fn() }
    const controller = new AbortController()
    const sync = vi.fn().mockResolvedValue({ synced: 0, failures: [] })
    receiverMock.mockImplementation(() => ({ owned: vi.fn().mockResolvedValue({ sync }) }) as never)

    await syncLnurlActivity(identity, ARKADE_ADDRESS, { store, signal: controller.signal })

    expect(receiverMock).toHaveBeenCalledWith(expect.objectContaining({ store }))
    expect(sync).toHaveBeenCalledWith({ signal: controller.signal })
  })

  it('resolves to zero when no server is configured', async () => {
    receiverMock.mockReturnValue(undefined)

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
