import { describe, it, expect } from 'vitest'
import { TxType, type ArkTransaction } from '@arkade-os/sdk'
import type { StoredPayment } from '@arkade-os/lnurl-client'
import { LNURL_ACTIVITY_KIND, LNURL_RESOLVER_ID, lnurlResolver } from '../../../lib/activity/lnurlResolver'

const BASE_URL = 'https://lnurl-a.test'

const makeRecord = (paymentReference: string): StoredPayment => ({
  key: `${BASE_URL}|verify-1`,
  baseUrl: BASE_URL,
  domain: 'example.com',
  lightningAddress: 'alice@example.com',
  identifier: 'verify-1',
  kind: 'destination',
  settled: true,
  amountMsat: 42000,
  createdAt: 1700000000,
  settledAt: 1700000060,
  swapId: null,
  paymentReference,
})

const makeTx = (arkTxid: string): ArkTransaction => ({
  key: { boardingTxid: '', commitmentTxid: '', arkTxid },
  type: TxType.TxReceived,
  amount: 42,
  settled: true,
  createdAt: 1700000060,
})

describe('lnurlResolver', () => {
  it('attributes a transaction whose txid matches a payment reference', async () => {
    const resolver = lnurlResolver(async () => new Map([['txid-1', makeRecord('txid-1')]]))
    await resolver.prepare?.()

    const memberships = resolver.resolve(makeTx('txid-1'))

    expect(resolver.id).toBe(LNURL_RESOLVER_ID)
    expect(memberships).toHaveLength(1)
    expect(memberships?.[0]?.kind).toBe(LNURL_ACTIVITY_KIND)
    expect(memberships?.[0]?.groupId).toBe(`lnurl:${BASE_URL}|verify-1`)
    expect(memberships?.[0]?.metadata).toMatchObject({
      lightningAddress: 'alice@example.com',
      domain: 'example.com',
      baseUrl: BASE_URL,
    })
  })

  it('leaves an unrelated transaction plain', async () => {
    const resolver = lnurlResolver(async () => new Map([['txid-1', makeRecord('txid-1')]]))
    await resolver.prepare?.()

    expect(resolver.resolve(makeTx('txid-other'))).toBeUndefined()
  })

  it('resolves nothing before prepare has run', () => {
    expect(
      lnurlResolver(async () => new Map([['txid-1', makeRecord('txid-1')]])).resolve(makeTx('txid-1')),
    ).toBeUndefined()
  })

  it('picks up records written after the first history load', async () => {
    let records = new Map<string, StoredPayment>()
    const resolver = lnurlResolver(async () => records)

    await resolver.prepare?.()
    expect(resolver.resolve(makeTx('txid-late'))).toBeUndefined()

    records = new Map([['txid-late', makeRecord('txid-late')]])
    await resolver.prepare?.()

    expect(resolver.resolve(makeTx('txid-late'))?.[0]?.kind).toBe(LNURL_ACTIVITY_KIND)
  })
})
