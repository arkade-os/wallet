import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SingleKey } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { FailedDirectTaxi, PendingDirectTaxi, getPendingDirectTaxi } from '../../lib/directTaxiSend'
import { ASSET_ID, KEYS, RECEIVER_ADDRESS, TAXI_URL, taxiFetch } from './receiverTaxiFixtures'

const wallet = { identity: SingleKey.fromRandomBytes() }
const TXID = 'a'.repeat(64)
const FAILED = {
  transferId: 't-1',
  state: 'locking',
  submissionPhase: 'failed',
  failureCode: 'lockup_submission_invalid_provider_response',
  failureDetail: 'server checkpoint 0 changed unsigned fields or metadata',
  updatedAt: 1,
}

let key = ''
const storedPayment = async (over: Record<string, unknown> = {}) => {
  const senderKey = hex.encode(await wallet.identity.xOnlyPublicKey())
  key = `directTaxiPending:regtest:${senderKey}`
  const record = {
    network: 'regtest',
    senderKey,
    taxiUrl: TAXI_URL,
    operatorKey: KEYS.operator,
    transferId: 't-1',
    expectedTxid: TXID,
    expectedVout: 0,
    mode: 'recycle',
    receiverAddress: RECEIVER_ADDRESS,
    assetId: ASSET_ID,
    assetAmount: '1',
    ...over,
  }
  localStorage.setItem(key, JSON.stringify(record))
  return (await getPendingDirectTaxi(wallet, 'regtest'))!
}

const statusPolls = (fetch: ReturnType<typeof taxiFetch>) =>
  fetch.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('transfers/'))

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('checking a Taxi payment that is still on record', () => {
  it('stops at a failed submission and shows its detail, keeping the record', async () => {
    const fetch = taxiFetch({ statuses: [FAILED] })
    vi.stubGlobal('fetch', fetch)
    const failed = await (await storedPayment()).resume().catch((error: unknown) => error)
    expect(failed).toBeInstanceOf(FailedDirectTaxi)
    expect(failed).toMatchObject({
      name: 'FailedDirectTaxi',
      failureCode: FAILED.failureCode,
      message:
        'Taxi could not submit this payment: server checkpoint 0 changed unsigned fields or metadata ' +
        '(lockup_submission_invalid_provider_response). Nothing has been delivered.',
    })
    expect(statusPolls(fetch)).toEqual([`${TAXI_URL}/v1/transfers/t-1`])
    expect(localStorage.getItem(key)).not.toBeNull()
  })

  it('forgets a failed payment only when asked', async () => {
    vi.stubGlobal('fetch', taxiFetch({ statuses: [{ ...FAILED, failureDetail: undefined }] }))
    const failed = (await (await storedPayment()).resume().catch((error: unknown) => error)) as FailedDirectTaxi
    expect(failed.message).toBe(
      'Taxi could not submit this payment (lockup_submission_invalid_provider_response). Nothing has been delivered.',
    )
    failed.forget()
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('keeps polling through a failure code on a live phase, which the Taxi retries', async () => {
    const retrying = { ...FAILED, submissionPhase: 'prepared', failureCode: 'lockup_submission_prepared_ambiguous' }
    const locked = { transferId: 't-1', state: 'locked', outpoint: { txid: TXID, vout: 0 }, updatedAt: 2 }
    vi.stubGlobal('fetch', taxiFetch({ statuses: [retrying, locked] }))
    expect(await (await storedPayment()).resume()).toBe(TXID)
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('still calls an unreachable status ambiguous, and keeps the record', async () => {
    const reachable = taxiFetch()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('transfers/')) throw new TypeError('Failed to fetch')
        return reachable(url, init)
      }),
    )
    const pending = await (await storedPayment()).resume().catch((error: unknown) => error)
    expect(pending).toBeInstanceOf(PendingDirectTaxi)
    expect(pending).not.toBeInstanceOf(FailedDirectTaxi)
    expect((pending as Error).message).toBe('Payment may have been submitted; retry checks the same transfer')
    expect(localStorage.getItem(key)).not.toBeNull()
  })

  it('stops the same way for a sponsored payment, polling its own status', async () => {
    const fetch = taxiFetch({ statuses: [FAILED] })
    vi.stubGlobal('fetch', fetch)
    const failed = await (await storedPayment({ mode: 'sponsored' })).resume().catch((error: unknown) => error)
    expect(failed).toBeInstanceOf(FailedDirectTaxi)
    expect(statusPolls(fetch)).toEqual([`${TAXI_URL}/v1/sponsored-transfers/t-1`])
  })
})
