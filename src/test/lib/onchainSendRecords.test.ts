import { describe, expect, it, vi } from 'vitest'
import { isUnfundedReservation, RESERVATION_GRACE_SECONDS } from '../../lib/onchainSendRecords'

const LOCKUP =
  'tark1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'
vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  ArkAddress: { decode: () => ({ pkScript: new Uint8Array(34) }) },
}))

const NOW = 1_800_000_000
const record = (over: Record<string, unknown> = {}) =>
  ({ lockupAddress: LOCKUP, createdAt: NOW - RESERVATION_GRACE_SECONDS - 1, ...over }) as never

describe('isUnfundedReservation', () => {
  const empty = async () => []
  const funded = async () => [{}]

  it('drops a reservation the indexer has had time to see and did not', async () => {
    expect(await isUnfundedReservation(record(), empty, NOW)).toBe(true)
  })

  // Dropping a young reservation on an empty lookup abandons an L1 claim.
  it('keeps a reservation younger than the grace period, empty lookup or not', async () => {
    expect(await isUnfundedReservation(record({ createdAt: NOW }), empty, NOW)).toBe(false)
    expect(await isUnfundedReservation(record({ createdAt: NOW - RESERVATION_GRACE_SECONDS + 1 }), empty, NOW)).toBe(
      false,
    )
  })

  it('keeps a reservation whose lockup is funded', async () => {
    expect(await isUnfundedReservation(record(), funded, NOW)).toBe(false)
  })

  it('keeps one that already names its funding transaction, without asking', async () => {
    const asked = vi.fn(empty)
    expect(await isUnfundedReservation(record({ fundingArkTxid: 'abc' }), asked, NOW)).toBe(false)
    expect(asked).not.toHaveBeenCalled()
  })

  it('keeps everything when the lookup itself fails — a failed read is not evidence', async () => {
    const boom = async () => {
      throw new Error('indexer down')
    }
    expect(await isUnfundedReservation(record(), boom, NOW)).toBe(false)
  })

  it('keeps everything when there is no chain reader at all', async () => {
    expect(await isUnfundedReservation(record(), undefined, NOW)).toBe(false)
  })
})
