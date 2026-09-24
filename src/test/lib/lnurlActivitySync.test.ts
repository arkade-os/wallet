import { describe, it, expect, vi } from 'vitest'
import type { Identity } from '@arkade-os/sdk'
import type { PaymentSyncStore } from '@arkade-os/lnurl-client'
import { lnurlSyncWritesSettled, syncLnurlActivity } from '../../lib/lnurlActivitySync'
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

  it('drops writes once the signal aborts, so a reset stays cleared', async () => {
    const store = { upsert: vi.fn(), readWatermark: vi.fn(), writeWatermark: vi.fn() }
    const controller = new AbortController()
    receiverMock.mockImplementation(
      ({ store: synced }) =>
        ({
          owned: vi.fn().mockResolvedValue({
            sync: async () => {
              await synced!.upsert([])
              controller.abort('lock-reset')
              await synced!.upsert([])
              await synced!.writeWatermark('https://lnurl.test', 'alice@lnurl.test', 1)
              return { synced: 1, failures: [] }
            },
          }),
        }) as never,
    )

    await syncLnurlActivity(identity, ARKADE_ADDRESS, { store, signal: controller.signal })

    expect(store.upsert).toHaveBeenCalledTimes(1)
    expect(store.writeWatermark).not.toHaveBeenCalled()
  })

  it('lets a reset wait out a write that began before the abort', async () => {
    let release = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    const store = { upsert: vi.fn(() => held), readWatermark: vi.fn(), writeWatermark: vi.fn() }
    const controller = new AbortController()
    receiverMock.mockImplementation(
      ({ store: synced }) =>
        ({
          owned: vi.fn().mockResolvedValue({
            sync: async () => {
              await synced!.upsert([])
              return { synced: 1, failures: [] }
            },
          }),
        }) as never,
    )
    const sync = syncLnurlActivity(identity, ARKADE_ADDRESS, { store, signal: controller.signal })
    await vi.waitFor(() => expect(store.upsert).toHaveBeenCalled())

    controller.abort('lock-reset')
    let settled = false
    const writes = lnurlSyncWritesSettled().then(() => (settled = true))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(settled).toBe(false)

    release()
    await writes
    await sync
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
