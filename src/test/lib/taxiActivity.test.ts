import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TaxiError } from '@arkade-taxi/client'
import type { TransferStatusResponse } from '@arkade-taxi/protocol'
import {
  forgetTaxiActivity,
  getTaxiActivityVersion,
  isTaxiActivityOpen,
  pollTaxiActivity,
  readTaxiActivity,
  recordTaxiActivity,
  recordTaxiStatus,
  refreshTaxiActivity,
  subscribeTaxiActivity,
  taxiActivityView,
  type TaxiActivity,
} from '../../lib/taxiActivity'
import { translate } from '../../lib/i18n'
import { Language } from '../../lib/types'
import { ASSET_ID, TAXI_URL } from './receiverTaxiFixtures'

const consoleError = vi.hoisted(() => vi.fn())
vi.mock('../../lib/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/logs')>()),
  consoleError,
}))

const TRANSFER = '3ccdf42c-2fc1-444b-8837-5efcae8e7fbc'
const LOCKUP = 'a'.repeat(64)

const record = (over: Partial<TaxiActivity> = {}): TaxiActivity => ({
  role: 'sender',
  network: 'regtest',
  taxiUrl: TAXI_URL,
  transferId: TRANSFER,
  mode: 'recycle',
  assetId: ASSET_ID,
  units: '1',
  lockupTxid: LOCKUP,
  state: 'quoted',
  updatedAt: 1_000,
  createdAt: 1_000,
  ...over,
})

const status = (over: Partial<TransferStatusResponse> = {}): TransferStatusResponse => ({
  transferId: TRANSFER,
  state: 'locking',
  updatedAt: 1_001,
  ...over,
})

const stored = () => readTaxiActivity('regtest')
const only = () => {
  expect(stored()).toHaveLength(1)
  return stored()[0]
}

const statusClient = (reply: () => Promise<TransferStatusResponse>) => ({
  status: vi.fn(reply),
  sponsoredStatus: vi.fn(reply),
})

beforeEach(() => {
  forgetTaxiActivity()
  consoleError.mockClear()
})
afterEach(() => vi.unstubAllGlobals())

describe('the Taxi activity store', () => {
  it('drops malformed records and never throws, and reads one network at a time', () => {
    const valid = record()
    localStorage.setItem(
      'taxiActivity',
      JSON.stringify([
        valid,
        { ...valid, transferId: 'bad', role: 'payer' },
        { ...valid, transferId: 'ftp', taxiUrl: 'ftp://taxi.example' },
        { ...valid, transferId: 'units', units: '01' },
        { ...valid, transferId: 'txid', lockupTxid: 'zz' },
        { ...valid, transferId: 'detail', failureDetail: 'x'.repeat(513) },
        { ...valid, transferId: 'state', state: 'toString' },
        { ...valid, transferId: 'mutiny', network: 'mutinynet' },
        null,
        'text',
      ]),
    )
    expect(stored()).toEqual([valid])
    expect(readTaxiActivity('mutinynet').map((r) => r.transferId)).toEqual(['mutiny'])
    for (const raw of ['{', 'null', '{}', '7']) {
      localStorage.setItem('taxiActivity', raw)
      expect(stored()).toEqual([])
    }
  })

  it('keeps the first createdAt and never moves a state backwards', () => {
    recordTaxiActivity(record({ createdAt: 500, updatedAt: 500 }))
    recordTaxiStatus(record(), status({ state: 'locked', updatedAt: 2_000 }))
    recordTaxiStatus(record(), status({ state: 'locking', updatedAt: 3_000 }))
    expect(only()).toMatchObject({ state: 'locked', createdAt: 500, updatedAt: 2_000 })

    recordTaxiActivity(record({ role: 'receiver', state: 'recycled', updatedAt: 5_000 }))
    recordTaxiStatus(record({ role: 'receiver' }), status({ state: 'locked', updatedAt: 6_000 }))
    expect(readTaxiActivity('regtest').find((r) => r.role === 'receiver')?.state).toBe('recycled')
  })

  it('applies a forward state even when the Taxi clock is behind ours', () => {
    recordTaxiActivity(record({ updatedAt: 9_000 }))
    recordTaxiStatus(record(), status({ state: 'locking', updatedAt: 1 }))
    expect(only().state).toBe('locking')
  })

  it('applies an equal state only when its update is not older, so a failure lands on locking', () => {
    recordTaxiStatus(record(), status({ updatedAt: 2_000 }))
    recordTaxiStatus(record(), status({ updatedAt: 1_500, submissionPhase: 'claimed' }))
    expect(only().submissionPhase).toBeUndefined()
    recordTaxiStatus(
      record(),
      status({
        updatedAt: 2_000,
        submissionPhase: 'failed',
        failureCode: 'lockup_submission_invalid_provider_response',
        failureDetail: 'server checkpoint 0 changed unsigned fields or metadata',
      }),
    )
    expect(only()).toMatchObject({ state: 'locking', submissionPhase: 'failed' })
    recordTaxiStatus(record(), status({ state: 'locked', updatedAt: 2_500, outpoint: { txid: LOCKUP, vout: 0 } }))
    expect(only()).not.toHaveProperty('failureCode')
  })

  it('ignores a state it does not know, logging it once', () => {
    recordTaxiActivity(record())
    recordTaxiStatus(record(), status({ state: 'teleported' }))
    recordTaxiStatus(record(), status({ state: 'teleported' }))
    expect(only().state).toBe('quoted')
    expect(consoleError).toHaveBeenCalledTimes(1)
  })

  it('writes and notifies only when a record really changes', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeTaxiActivity(listener)
    const before = getTaxiActivityVersion()
    recordTaxiActivity(record())
    recordTaxiActivity(record())
    recordTaxiStatus(record(), status({ state: 'quoted', updatedAt: 1_000 }))
    expect(getTaxiActivityVersion()).toBe(before + 1)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    recordTaxiStatus(record(), status())
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('keeps every open record and the 200 newest closed ones', () => {
    const closed = Array.from({ length: 205 }, (_, index) =>
      record({ transferId: `closed-${index}`, state: 'recycled', createdAt: index }),
    )
    localStorage.setItem('taxiActivity', JSON.stringify(closed))
    recordTaxiActivity(record({ transferId: 'open', createdAt: 0 }))
    const ids = stored().map((r) => r.transferId)
    expect(ids).toHaveLength(201)
    expect(ids).toContain('open')
    expect(ids).not.toContain('closed-4')
    expect(ids).toContain('closed-5')
  })

  it('forgets every record, and says so', () => {
    recordTaxiActivity(record())
    const before = getTaxiActivityVersion()
    forgetTaxiActivity()
    expect(stored()).toEqual([])
    expect(getTaxiActivityVersion()).toBe(before + 1)
  })

  it('closes a sponsored payment at locked, and a covenant one only at its end', () => {
    expect(isTaxiActivityOpen(record({ mode: 'sponsored', state: 'locking' }))).toBe(true)
    expect(isTaxiActivityOpen(record({ mode: 'sponsored', state: 'locked' }))).toBe(false)
    expect(isTaxiActivityOpen(record({ state: 'locked' }))).toBe(true)
    expect(isTaxiActivityOpen(record({ state: 'recovering' }))).toBe(true)
    for (const state of ['recycled', 'purchased', 'refunded', 'recovered', 'expired', 'gone'])
      expect(isTaxiActivityOpen(record({ state }))).toBe(false)
  })
})

describe('taxiActivityView', () => {
  const receiver = { role: 'receiver' as const }
  it.each([
    ['a transfer the Taxi forgot', { state: 'gone' }, {}, 'Unknown', 'void', 'Gone', 'none'],
    ['a failed submission', { state: 'locking', submissionPhase: 'failed' }, {}, 'Failed', 'failed', 'Failed', 'check'],
    ['an unconfirmed send', { state: 'locking' }, { pending: true }, 'Pending', 'pending', 'Unconfirmed', 'check'],
    ['a send in flight', { state: 'quoted' }, {}, 'Pending', 'pending', 'Sending', 'check'],
    ['a delivered covenant send', { state: 'locked' }, {}, 'Awaiting claim', 'pending', 'AwaitingClaim', 'check'],
    ['a sponsored send', { state: 'locked', mode: 'sponsored' as const }, {}, 'Completed', 'done', 'Delivered', 'none'],
    ['a send being returned', { state: 'recovering' }, {}, 'Being returned', 'pending', 'ReturningToYou', 'check'],
    ['a claimed send', { state: 'recycled' }, {}, 'Claimed', 'done', 'ClaimedByReceiver', 'none'],
    ['a recovered send', { state: 'recovered' }, {}, 'Returned', 'void', 'ReturnedToYou', 'none'],
    ['a refunded send', { state: 'refunded' }, {}, 'Returned', 'void', 'ReturnedToYou', 'none'],
    ['an expired quote', { state: 'expired' }, {}, 'Not sent', 'void', 'NotSent', 'none'],
    [
      'a verified delivery',
      { ...receiver, state: 'locked' },
      { claimable: true },
      'Claimable',
      'pending',
      'ReadyToClaim',
      'claim',
    ],
    ['an unverified delivery', { ...receiver, state: 'locked' }, {}, 'Claimable', 'pending', 'Verifying', 'check'],
    [
      'a delivery returning to the sender',
      { ...receiver, state: 'recovering', returnsTo: 'sender' as const },
      {},
      'Being returned',
      'pending',
      'ReturningToSender',
      'check',
    ],
    [
      'a delivery returning to the receiver',
      { ...receiver, state: 'recovering', returnsTo: 'receiver' as const },
      {},
      'Being returned',
      'pending',
      'ReturningToYou',
      'check',
    ],
    ['a claimed delivery', { ...receiver, state: 'purchased' }, {}, 'Claimed', 'done', 'Claimed', 'none'],
    [
      'a delivery returned to the sender',
      { ...receiver, state: 'recovered', returnsTo: 'sender' as const },
      {},
      'Returned',
      'void',
      'ReturnedToSender',
      'none',
    ],
    [
      'a delivery recovered to the receiver',
      { ...receiver, state: 'recovered', returnsTo: 'receiver' as const },
      {},
      'Completed',
      'done',
      'ReturnedToYou',
      'none',
    ],
  ])('%s', (_, over, options, label, tone, explanation, action) => {
    const view = taxiActivityView(record(over), options)
    expect(translate(Language.English, view.label)).toBe(label)
    expect(view.explanation).toBe(`transaction.taxiExplain${explanation}`)
    expect(translate(Language.English, view.explanation)).not.toBe(view.explanation)
    expect(translate(Language.Spanish, view.explanation)).not.toBe(view.explanation)
    expect({ tone: view.tone, action: view.action }).toEqual({ tone, action })
  })
})

describe('refreshTaxiActivity', () => {
  it('ignores a status for another transfer', async () => {
    recordTaxiActivity(record())
    await refreshTaxiActivity(
      record(),
      statusClient(async () => status({ transferId: 'other', state: 'locked' })),
    )
    expect(only().state).toBe('quoted')
  })

  it('ignores a sender status naming a lockup other than the one it signed', async () => {
    recordTaxiActivity(record())
    const foreign = status({ state: 'locked', outpoint: { txid: 'b'.repeat(64), vout: 0 } })
    await refreshTaxiActivity(
      record(),
      statusClient(async () => foreign),
    )
    expect(only().state).toBe('quoted')
  })

  it('reads a sponsored transfer from the sponsored endpoint', async () => {
    const client = statusClient(async () => status({ state: 'locked' }))
    await refreshTaxiActivity(record({ mode: 'sponsored' }), client)
    expect(client.sponsoredStatus).toHaveBeenCalledWith(TRANSFER)
    expect(client.status).not.toHaveBeenCalled()
    expect(only().state).toBe('locked')
  })

  it('marks an open record gone once the Taxi no longer knows it, but leaves a settled one alone', async () => {
    const forgot = statusClient(async () => {
      throw new TaxiError('not_found', `transfer ${TRANSFER} not found`)
    })
    recordTaxiActivity(record({ state: 'locked' }))
    await refreshTaxiActivity(record(), forgot)
    expect(only().state).toBe('gone')

    forgetTaxiActivity()
    recordTaxiActivity(record({ state: 'recycled' }))
    await refreshTaxiActivity(record(), forgot)
    expect(only().state).toBe('recycled')
  })

  it('rejects on a network error and leaves the record as it was', async () => {
    recordTaxiActivity(record())
    const before = getTaxiActivityVersion()
    const unreachable = statusClient(async () => {
      throw new TaxiError('NETWORK_ERROR', 'taxi: GET could not be sent')
    })
    await expect(refreshTaxiActivity(record(), unreachable)).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(only().state).toBe('quoted')
    expect(getTaxiActivityVersion()).toBe(before)
  })

  it('reads a record once while a read of it is already in flight', async () => {
    let answer!: (value: TransferStatusResponse) => void
    const client = statusClient(() => new Promise((resolve) => (answer = resolve)))
    const first = refreshTaxiActivity(record(), client)
    const second = refreshTaxiActivity(record(), client)
    answer(status())
    await Promise.all([first, second])
    expect(client.status).toHaveBeenCalledTimes(1)
  })
})

describe('pollTaxiActivity', () => {
  const reply = (body: unknown, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) })

  it('reads only open records, never an http Taxi from an https page, and logs a failing Taxi once', async () => {
    recordTaxiActivity(record({ transferId: 'open' }))
    recordTaxiActivity(record({ transferId: 'settled', state: 'recycled' }))
    recordTaxiActivity(record({ transferId: 'plain', taxiUrl: 'http://taxi.plain.example' }))
    recordTaxiActivity(record({ transferId: 'down', taxiUrl: 'https://taxi.down.example' }))
    const fetch = vi.fn(async (url: string) => {
      if (url === `${TAXI_URL}/v1/transfers/open`) return reply(status({ transferId: 'open', state: 'locking' }))
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', fetch)

    await pollTaxiActivity('regtest', 'https:')
    await pollTaxiActivity('regtest', 'https:')

    expect(fetch.mock.calls.map(([url]) => url).sort()).toEqual([
      'https://taxi.down.example/v1/transfers/down',
      'https://taxi.down.example/v1/transfers/down',
      `${TAXI_URL}/v1/transfers/open`,
      `${TAXI_URL}/v1/transfers/open`,
    ])
    expect(stored().find((r) => r.transferId === 'open')?.state).toBe('locking')
    expect(consoleError).toHaveBeenCalledTimes(1)
  })
})
