import { describe, expect, it } from 'vitest'
import { CORRIDORS } from '@arkade-os/solver-discovery'
import { useCorridorSendReceipt } from '../../hooks/useCorridorSendReceipt'
import type { Tx } from '../../lib/types'

const send = (lnSwap: Record<string, unknown>): Tx => ({ lnSwap }) as unknown as Tx

describe('what a corridor-send receipt shows', () => {
  it('compares against corridor ids, not the rails they settle on', () => {
    // `bitcoin` is the RAIL `onchain` settles on. Comparing against it left
    // every on-chain send unlabelled and still reading "Completed".
    expect(CORRIDORS).toContain('onchain')
    expect(CORRIDORS).not.toContain('bitcoin')
  })

  it('names the two corridors, which were indistinguishable on this screen', () => {
    expect(useCorridorSendReceipt(send({ fundingTxid: 'f', corridor: 'onchain' }))?.corridor).toBe('On-chain')
    expect(useCorridorSendReceipt(send({ fundingTxid: 'f', corridor: 'lightning' }))?.corridor).toBe('Lightning')
  })

  it('carries the L1 claim — the tx that actually pays an on-chain recipient', () => {
    const receipt = useCorridorSendReceipt(send({ fundingTxid: 'f', corridor: 'onchain', claimTxid: 'claim-txid' }))

    expect(receipt?.claimTxid).toBe('claim-txid')
  })

  it('does not call an on-chain lockup spend "Completed" — it only proves the solver took its side', () => {
    const onchain = useCorridorSendReceipt(send({ fundingTxid: 'f', corridor: 'onchain', spendTxid: 's' }))
    const lightning = useCorridorSendReceipt(send({ fundingTxid: 'f', corridor: 'lightning', spendTxid: 's' }))

    expect(onchain?.spendLabel).toBe('Lockup spent')
    expect(lightning?.spendLabel).toBe('Completed')
  })

  it('still says Refunded on either corridor, because nothing broke', () => {
    const receipt = useCorridorSendReceipt(send({ fundingTxid: 'f', corridor: 'onchain', outcome: 'refunded' }))

    expect(receipt?.spendLabel).toBe('Refunded')
  })

  it('reports what the recipient gets beside the spread that explains the gap', () => {
    const receipt = useCorridorSendReceipt(
      send({ fundingTxid: 'f', takeAmount: 22_152, feeAmount: 710, solver: 'ln-solver-mutinynet' }),
    )

    expect(receipt).toMatchObject({ recipientGets: 22_152, swapFeeSats: 710, solver: 'ln-solver-mutinynet' })
  })

  it('returns nothing for a transaction that is not a corridor send', () => {
    expect(useCorridorSendReceipt({ settled: true } as Tx)).toBeUndefined()
  })
})
