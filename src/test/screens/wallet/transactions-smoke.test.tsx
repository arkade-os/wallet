import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TransactionsList from '../../../components/TransactionsList'
import { WalletContext } from '../../../providers/wallet'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import {
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../mocks'
import type { Tx } from '../../../lib/types'

// jsdom reports all element dimensions as 0, so the virtualizer only renders
// the leading overscan batch (≤ overscan items).  We allow a small ceiling to
// stay robust against changes to the overscan constant.
const MAX_DOM_ROWS = 20

// Upper bound on initial render time.  With virtualisation the render cost is
// O(overscan) not O(n), so even 5 000 txs should initialise in well under this.
const RENDER_THRESHOLD_MS = 500

function generateTxs(count: number): Tx[] {
  return Array.from({ length: count }, (_, i) => ({
    amount: 1000 + (i % 100) * 10,
    boardingTxid: '',
    createdAt: Math.floor(Date.now() / 1000) - i * 60,
    explorable: undefined,
    preconfirmed: false,
    redeemTxid: '',
    roundTxid: `${'0'.repeat(63 - i.toString(16).length)}${i.toString(16)}`,
    settled: true,
    type: i % 2 === 0 ? 'received' : 'sent',
  }))
}

function renderWithTxs(txs: Tx[]) {
  return render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <FiatContext.Provider value={mockFiatContextValue as any}>
          <FlowContext.Provider value={mockFlowContextValue as any}>
            <WalletContext.Provider value={{ ...mockWalletContextValue, txs }}>
              <TransactionsList />
            </WalletContext.Provider>
          </FlowContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>,
  )
}

// Smoke test: verifies that TransactionsList is virtualised — only a small,
// bounded number of DOM rows are mounted regardless of how many transactions
// exist in the wallet.
describe('TransactionsList smoke test — large transaction history', () => {
  it('mounts a constant number of DOM rows regardless of total tx count (virtualisation check)', () => {
    const { container: c100 } = renderWithTxs(generateTxs(100))
    const { container: c5000 } = renderWithTxs(generateTxs(5000))

    const rows100 = c100.querySelectorAll('[data-testid="tx-row"]').length
    const rows5000 = c5000.querySelectorAll('[data-testid="tx-row"]').length

    process.stdout.write(`[smoke] DOM rows: 100 txs → ${rows100}, 5000 txs → ${rows5000}\n`)

    // Both should be well below the total count — virtualisation is working.
    expect(rows100, `Expected ≤ ${MAX_DOM_ROWS} DOM rows for 100 txs, got ${rows100}`).toBeLessThanOrEqual(MAX_DOM_ROWS)
    expect(rows5000, `Expected ≤ ${MAX_DOM_ROWS} DOM rows for 5000 txs, got ${rows5000}`).toBeLessThanOrEqual(
      MAX_DOM_ROWS,
    )
  })

  const cases: number[] = [100, 500, 1000, 3000, 5000]

  for (const count of cases) {
    it(`renders ${count} transactions within ${RENDER_THRESHOLD_MS}ms`, () => {
      const txs = generateTxs(count)

      const start = performance.now()
      const { unmount } = renderWithTxs(txs)
      const duration = performance.now() - start

      unmount()

      // Log timing unconditionally so CI output always shows the numbers.
      process.stdout.write(`[smoke] ${count} txs → ${duration.toFixed(1)}ms\n`)

      expect(
        duration,
        `Rendering ${count} txs took ${duration.toFixed(0)}ms — exceeds ${RENDER_THRESHOLD_MS}ms threshold.`,
      ).toBeLessThan(RENDER_THRESHOLD_MS)
    })
  }
})
