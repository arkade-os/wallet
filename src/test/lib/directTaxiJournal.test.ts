import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SingleKey } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import {
  ReturnedDirectTaxi,
  checkTaxiPayment,
  getPendingDirectTaxi,
  journalDirectTaxi,
  resumePendingDirectTaxi,
  taxiActivityFromPending,
  type PendingTaxiRecord,
} from '../../lib/directTaxiSend'
import { forgetTaxiActivity, readTaxiActivity, recordTaxiActivity } from '../../lib/taxiActivity'
import { ASSET_ID, INFO, KEYS, RECEIVER_ADDRESS, TAXI_URL } from './receiverTaxiFixtures'

const TRANSFER = '3ccdf42c-2fc1-444b-8837-5efcae8e7fbc'
const LOCKUP = 'a'.repeat(64)
const LOCKED = { state: 'locked', outpoint: { txid: LOCKUP, vout: 0 } }
const STUCK = {
  state: 'locking',
  submissionPhase: 'failed',
  failureCode: 'lockup_submission_invalid_provider_response',
  failureDetail: 'server checkpoint 0 changed unsigned fields or metadata',
}

const wallet = { identity: SingleKey.fromRandomBytes() }
let journalKey = ''

const journal = async (over: Partial<PendingTaxiRecord> = {}): Promise<PendingTaxiRecord> => {
  const senderKey = hex.encode(await wallet.identity.xOnlyPublicKey())
  journalKey = `directTaxiPending:regtest:${senderKey}`
  const record: PendingTaxiRecord = {
    network: 'regtest',
    senderKey,
    taxiUrl: TAXI_URL,
    operatorKey: KEYS.operator,
    transferId: TRANSFER,
    expectedTxid: LOCKUP,
    expectedVout: 0,
    mode: 'recycle',
    receiverAddress: RECEIVER_ADDRESS,
    assetId: ASSET_ID,
    assetAmount: '1',
    ...over,
  }
  localStorage.setItem(journalKey, JSON.stringify(record))
  return record
}

const reply = (body: unknown, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) })

const taxi = (transfer: Record<string, unknown>) => {
  const fetch = vi.fn(async (url: string) => {
    if (url === `${TAXI_URL}/v1/info`) return reply(INFO)
    if (url === `${TAXI_URL}/v1/transfers/${TRANSFER}`)
      return reply({ transferId: TRANSFER, updatedAt: 1_790_960_764, ...transfer })
    return reply({ code: 'not_found', error: url }, 404)
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

const attempt = (kind: 'covenant' | 'sponsored', params: Record<string, string>) =>
  ({ kind, quote: { params, fare: { currency: 'sats', units: '7' }, expiresAt: 2_000 } }) as unknown as NonNullable<
    PendingTaxiRecord['attempt']
  >

const request = vi.fn((_name: string, callback: () => Promise<unknown>) => callback())

beforeEach(() => {
  localStorage.clear()
  forgetTaxiActivity()
  request.mockClear()
  Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })
})
afterEach(() => vi.unstubAllGlobals())

describe('a journaled direct Taxi payment in history', () => {
  it('records every status a resumed payment reads, ending at locked', async () => {
    await journal()
    taxi(LOCKED)
    const payment = await getPendingDirectTaxi(wallet, 'regtest')
    await expect(payment!.resume()).resolves.toBe(LOCKUP)
    expect(readTaxiActivity('regtest')).toMatchObject([
      {
        role: 'sender',
        transferId: TRANSFER,
        state: 'locked',
        assetId: ASSET_ID,
        units: '1',
        lockupTxid: LOCKUP,
        destination: RECEIVER_ADDRESS,
      },
    ])
  })

  it('records a payment the Taxi returned', async () => {
    await journal()
    taxi({ ...LOCKED, state: 'recovered', spentTxid: 'c'.repeat(64) })
    const payment = await getPendingDirectTaxi(wallet, 'regtest')
    await expect(payment!.resume()).rejects.toBeInstanceOf(ReturnedDirectTaxi)
    expect(readTaxiActivity('regtest')).toMatchObject([{ state: 'recovered', spentTxid: 'c'.repeat(64) }])
  })
})

describe('journalDirectTaxi', () => {
  it('puts a signed payment in history as it journals it, before a submission can throw', async () => {
    const record = await journal({ attempt: attempt('covenant', { topup: '330' }) })
    localStorage.clear()
    journalDirectTaxi(record)
    expect((await getPendingDirectTaxi(wallet, 'regtest'))?.record).toEqual(record)
    expect(readTaxiActivity('regtest')).toMatchObject([{ role: 'sender', state: 'quoted', carrierSats: '330' }])
  })

  it('still journals the payment when history cannot read its quote', async () => {
    const unreadable = { kind: 'sponsored', quote: {} } as unknown as PendingTaxiRecord['attempt']
    const record = await journal({ attempt: unreadable })
    localStorage.clear()
    expect(() => journalDirectTaxi(record)).not.toThrow()
    expect((await getPendingDirectTaxi(wallet, 'regtest'))?.record).toEqual(record)
  })
})

describe('taxiActivityFromPending', () => {
  it('takes the loan and fare from a covenant quote', async () => {
    const record = await journal({ attempt: attempt('covenant', { topup: '330' }) })
    expect(taxiActivityFromPending(record, 1_500)).toEqual({
      role: 'sender',
      network: 'regtest',
      taxiUrl: TAXI_URL,
      transferId: TRANSFER,
      mode: 'recycle',
      assetId: ASSET_ID,
      units: '1',
      carrierSats: '330',
      fare: { currency: 'sats', units: '7' },
      destination: RECEIVER_ADDRESS,
      lockupTxid: LOCKUP,
      state: 'quoted',
      updatedAt: 1_500,
      createdAt: 1_500,
    })
  })

  it('takes a sponsored contribution as the carrier', async () => {
    const record = await journal({ mode: 'sponsored', attempt: attempt('sponsored', { contribution: '329' }) })
    expect(taxiActivityFromPending(record, 1_500)).toMatchObject({ mode: 'sponsored', carrierSats: '329' })
  })

  it('names no carrier or fare without the signed attempt, and reads an empty asset as bitcoin', async () => {
    const activity = taxiActivityFromPending(await journal({ assetId: '', assetAmount: '100' }), 1_500)
    expect(activity).toMatchObject({ units: '100' })
    expect(activity).not.toHaveProperty('assetId')
    expect(activity).not.toHaveProperty('carrierSats')
    expect(activity).not.toHaveProperty('fare')
  })
})

describe('resumePendingDirectTaxi', () => {
  it('resumes only the journaled transfer, under the lock a new send takes', async () => {
    await journal()
    const fetch = taxi(LOCKED)
    await expect(resumePendingDirectTaxi(wallet, 'regtest', 'another-transfer')).resolves.toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
    await expect(resumePendingDirectTaxi(wallet, 'regtest', TRANSFER)).resolves.toBe(LOCKUP)
    expect(request).toHaveBeenCalledWith(journalKey, expect.any(Function))
    expect(localStorage.getItem(journalKey)).toBeNull()
    await expect(resumePendingDirectTaxi(wallet, 'regtest', TRANSFER)).resolves.toBeUndefined()
  })
})

describe('checkTaxiPayment', () => {
  it('re-reads a payment whose submission failed without resuming it', async () => {
    recordTaxiActivity(taxiActivityFromPending(await journal(), 1_000))
    const fetch = taxi(STUCK)
    await checkTaxiPayment(readTaxiActivity('regtest')[0], wallet)
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([`${TAXI_URL}/v1/transfers/${TRANSFER}`])
    expect(request).not.toHaveBeenCalled()
    expect(readTaxiActivity('regtest')[0]).toMatchObject(STUCK)
    expect(localStorage.getItem(journalKey)).not.toBeNull()
  })

  it('resumes a journaled payment the Taxi has not failed, clearing the journal once it settles', async () => {
    recordTaxiActivity(taxiActivityFromPending(await journal(), 1_000))
    const fetch = taxi(LOCKED)
    await checkTaxiPayment(readTaxiActivity('regtest')[0], wallet)
    expect(fetch).toHaveBeenCalledWith(`${TAXI_URL}/v1/info`, expect.anything())
    expect(localStorage.getItem(journalKey)).toBeNull()
    expect(readTaxiActivity('regtest')[0].state).toBe('locked')
  })

  it('only re-reads a delivery, even one whose id the journal also holds', async () => {
    const delivery = { ...taxiActivityFromPending(await journal(), 1_000), role: 'receiver' as const }
    recordTaxiActivity(delivery)
    taxi(LOCKED)
    await checkTaxiPayment(delivery, wallet)
    expect(request).not.toHaveBeenCalled()
    expect(readTaxiActivity('regtest')[0].state).toBe('locked')
  })
})
