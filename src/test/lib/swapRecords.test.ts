import { describe, expect, it, vi } from 'vitest'
const stored: object[] = []

vi.mock('../../lib/swapRepository', () => ({
  assetSwapRepository: {
    getSwapRecordsPage: async () => ({ items: stored }),
  },
}))

import { lnSendViews } from '../../lib/swapRecords'

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
})
