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

// Performance threshold: rendering should complete within this many ms.
// The TransactionsList renders all transactions at once with no windowing —
// if this threshold is exceeded the test fails and pinpoints the bottleneck.
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

// Smoke test: renders the wallet transaction list with progressively more
// transactions to surface the unvirtualised list performance regression
// reported when a wallet has several thousand transactions.
describe('TransactionsList smoke test — large transaction history', () => {
  const cases: number[] = [100, 500, 1000, 3000, 5000]

  for (const count of cases) {
    it(`renders ${count} transactions within ${RENDER_THRESHOLD_MS}ms`, () => {
      const txs = generateTxs(count)

      const start = performance.now()
      const { unmount } = renderWithTxs(txs)
      const duration = performance.now() - start

      unmount()

      // Log timing unconditionally so CI output always shows the numbers even
      // when the assertion passes.
      process.stdout.write(`[smoke] ${count} txs → ${duration.toFixed(1)}ms\n`)

      expect(
        duration,
        `Rendering ${count} txs took ${duration.toFixed(0)}ms — exceeds ${RENDER_THRESHOLD_MS}ms threshold. The list has no virtualisation; consider windowing (e.g. react-virtual) to fix this.`,
      ).toBeLessThan(RENDER_THRESHOLD_MS)
    })
  }
})
