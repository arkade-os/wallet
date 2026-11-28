import { describe, expect, it, vi } from 'vitest'
const stored: object[] = []

vi.mock('../../lib/swapRepository', () => ({
  assetSwapRepository: {
    getSwapRecordsPage: async () => ({ items: stored }),
  },
  quoteSnapshotOf: () => undefined,
}))

import { solverId, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import type { Swap } from '@arkade-os/swap/advanced'
import { candidateUsage, lnSendViews, offerSwaps, solverUsage } from '../../lib/swapRecords'
import { assetSwapRepository } from '../../lib/swapRepository'

// Plain JSON, as the store hands it back.
const send = (market: { kind: string; backend: string }) => ({
  id: 'rfq-1',
  family: 'rfq',
  route: {
    give: { corridor: 'arkade', asset: 'arkade:bitcoin/slip44:0', instrument: { kind: 'wallet' } },
    take: { corridor: 'lightning', asset: 'bolt11:bitcoin/slip44:0', instrument: { kind: 'wallet' } },
  },
  give: { asset: 'arkade:bitcoin/slip44:0', amount: '100000' },
  take: { asset: 'bolt11:bitcoin/slip44:0', amount: '99000' },
  fee: { asset: 'arkade:bitcoin/slip44:0', amount: '1000' },
  market,
  expiresAt: 1_000,
  state: 'settled',
  kind: 'lightning_send',
  rfqId: 'rfq-1',
  lockupAddress: 'ark1lockup',
  lockupPkScript: '51',
  lock: { hash: '00'.repeat(32) },
  refundLocktime: 0,
  profile: {},
  fundingTxid: 'aa'.repeat(32),
  createdAt: 1_000,
  updatedAt: 1_000,
})

describe('lnSendViews', () => {
  it('omits the recipient amount and fee of a restored send', async () => {
    stored.splice(0, stored.length, send({ kind: 'restored', backend: 'rfq' }))
    const [view] = await lnSendViews()
    expect(view.amount).toBe(100_000)
    expect(view).not.toHaveProperty('takeAmount')
    expect(view).not.toHaveProperty('feeAmount')
  })

  it('keeps history readable when the repository is unavailable', async () => {
    vi.spyOn(assetSwapRepository, 'getSwapRecordsPage').mockRejectedValueOnce(new Error('history unavailable'))
    await expect(lnSendViews()).resolves.toEqual([])
  })

  it('reads sent destinations from the stored endpoint', async () => {
    const payment = send({ kind: 'restored', backend: 'rfq' })
    stored.splice(
      0,
      stored.length,
      {
        ...payment,
        route: {
          ...payment.route,
          take: {
            ...payment.route.take,
            instrument: { kind: 'invoice', bolt11: 'lnbc1recipient', paymentHash: 'ab'.repeat(32), expiresAt: 1030 },
          },
        },
      },
      {
        ...payment,
        id: 'rfq-2',
        kind: 'onchain_send',
        route: {
          ...payment.route,
          take: {
            corridor: 'onchain',
            asset: 'bitcoin:bitcoin/slip44:0',
            instrument: { kind: 'address', address: 'bc1recipient' },
          },
        },
      },
    )

    const views = await lnSendViews()
    expect(views.map((view) => view.destination)).toEqual(['lnbc1recipient', 'bc1recipient'])
  })
})

describe('offerSwaps', () => {
  it('only projects the matching directed payment recipient', async () => {
    const recipient = 'ark1recipient'
    const payment = send({ kind: 'restored', backend: 'rfq' })
    const offer = {
      ...payment,
      id: 'offer-1',
      family: 'offer',
      status: 'fulfilled',
      swapAddress: 'ark1lockup',
      swapPkScript: '51',
      offerHex: '0100',
      expiresAt: 1030,
      take: { asset: `arkade:bitcoin/asset:${'ab'.repeat(34)}`, amount: '20' },
      route: {
        ...payment.route,
        take: {
          corridor: 'arkade',
          asset: `arkade:bitcoin/asset:${'ab'.repeat(34)}`,
          instrument: { kind: 'address', address: recipient },
        },
      },
    }

    stored.splice(
      0,
      stored.length,
      { ...offer, assetPayment: { receiveAddress: recipient, validUntil: 1030 } },
      { ...offer, id: 'offer-2', assetPayment: { receiveAddress: offer.swapAddress, validUntil: 1030 } },
      { ...offer, id: 'offer-3' },
    )

    const swaps = await offerSwaps()
    expect(swaps).toHaveLength(3)
    expect(swaps[0]).toMatchObject({ paymentDestination: recipient, swapAddress: 'ark1lockup' })
    expect(swaps[1].paymentDestination).toBeUndefined()
    expect(swaps[2].paymentDestination).toBeUndefined()
  })
})

describe('solverUsage', () => {
  it('reports repository read errors instead of displaying zero completed swaps', async () => {
    vi.spyOn(assetSwapRepository, 'getSwapRecordsPage').mockRejectedValueOnce(new Error('history unavailable'))
    await expect(solverUsage('bitcoin', 'direction', [])).rejects.toThrow('history unavailable')
  })
})

describe('candidateUsage', () => {
  const network = 'mutinynet'
  const key = 'ab'.repeat(32)
  const give = 'arkade:mutinynet/slip44:1'
  const take = `arkade:mutinynet/asset:${'cd'.repeat(34)}`
  const direction = JSON.stringify([network, give, take])
  const card = (source: string, sourceType: 'local' | 'registry', relays = ['wss://relay']) =>
    ({
      solver: 'ln',
      source,
      sourceType,
      discovery_pubkey: key,
      transports: { nostr: { relays } },
      base_asset: { id: give, name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      quote_asset: { id: take, name: 'USD', ticker: 'USD', decimals: 2 },
      fee_bps: 10,
      min_base_amount: '1',
      max_base_amount: '100',
      min_quote_amount: '1',
      max_quote_amount: '100',
    }) as DiscoveredMarket
  const swap = (id: string, listed: DiscoveredMarket, solver?: string) =>
    ({
      id,
      outcome: 'filled',
      route: { give: { asset: give }, take: { asset: take } },
      market: {
        kind: 'card',
        solver: 'ln',
        source: listed.source,
        sourceType: listed.sourceType,
        discoveryPubkey: key,
      },
      solver,
    }) as unknown as Swap
  const local = card('ln', 'local')
  const registry = card('https://registry/mutinynet.json', 'registry')

  it('counts a quote the solver signed toward its key, whichever source listed the card', () => {
    const usage = candidateUsage(
      [swap('a', local, key), swap('b', registry, key)],
      [local, registry],
      network,
      direction,
    )
    expect(usage).toEqual({ [solverId(local, network)]: 2, [solverId(registry, network)]: 2 })
  })

  it('keeps an unsigned swap with the source that listed it', () => {
    expect(candidateUsage([swap('a', local)], [local, registry], network, direction)).toEqual({
      [solverId(local, network)]: 1,
    })
  })

  it('lends no key history to a card that is not quoted over that key', () => {
    const spot = card('spot', 'registry', [])
    expect(candidateUsage([swap('a', local, key)], [spot], network, direction)).toEqual({})
  })
})
