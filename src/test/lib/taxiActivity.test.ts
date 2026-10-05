import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { TransferStatusResponse } from '@arkade-taxi/protocol'
import {
  forgetTaxiActivity,
  recordTaxiActivity,
  recordTaxiStatus,
  taxiActivityView,
  useTaxiActivity,
  type TaxiActivity,
} from '../../lib/taxiActivity'
import { translate } from '../../lib/i18n'
import { Language } from '../../lib/types'
import { ASSET_ID, TAXI_URL } from './receiverTaxiFixtures'

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

beforeEach(() => {
  forgetTaxiActivity()
})

describe('useTaxiActivity', () => {
  it('re-renders with every change to its network, and only its network', () => {
    const persisted = record({ carrierSats: '329', fare: { currency: 'asset', units: '7' } })
    localStorage.setItem('taxiActivity', JSON.stringify([persisted, record({ network: 'mutinynet' })]))
    const { result } = renderHook(() => useTaxiActivity('regtest'))
    expect(result.current).toEqual([persisted])
    act(() => recordTaxiActivity(record({ state: 'locking', updatedAt: 1_001 })))
    expect(result.current).toMatchObject([
      { state: 'locking', carrierSats: '329', fare: { currency: 'asset', units: '7' } },
    ])
    act(() => recordTaxiStatus(record(), status({ state: 'locked', updatedAt: 1_002 })))
    expect(result.current).toMatchObject([{ state: 'locked' }])
    act(() => recordTaxiActivity(record({ network: 'mutinynet', transferId: 'elsewhere' })))
    expect(result.current).toHaveLength(1)
    act(() => forgetTaxiActivity())
    expect(result.current).toEqual([])
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
      'an expired quote still journaled',
      { state: 'expired' },
      { pending: true },
      'Not sent',
      'void',
      'NotSent',
      'check',
    ],
    [
      'a claimed send still journaled',
      { state: 'recycled' },
      { pending: true },
      'Claimed',
      'done',
      'ClaimedByReceiver',
      'check',
    ],
    ['a forgotten transfer still journaled', { state: 'gone' }, { pending: true }, 'Unknown', 'void', 'Gone', 'none'],
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
