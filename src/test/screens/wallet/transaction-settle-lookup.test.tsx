import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Transaction from '../../../screens/Wallet/Transaction'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { SwapsContext } from '../../../providers/swaps'
import type { Tx } from '../../../lib/types'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockTxInfo,
  mockWalletContextValue,
} from '../mocks'

const getInputsToSettle = vi.hoisted(() => vi.fn())
vi.mock('../../../lib/asp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/asp')>()),
  getInputsToSettle,
}))

const renderDetails = (tx: Tx) =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo: tx }}>
              <WalletContext.Provider
                value={{ ...mockWalletContextValue, txs: [tx], svcWallet: {}, vtxoManager: {} } as any}
              >
                <SwapsContext.Provider value={{ swaps: [] } as any}>
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <Transaction />
                  </LimitsContext.Provider>
                </SwapsContext.Provider>
              </WalletContext.Provider>
            </FlowContext.Provider>
          </AspContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>,
  )

describe('opening a payment', () => {
  beforeEach(() => {
    getInputsToSettle.mockReset()
    getInputsToSettle.mockResolvedValue({ inputs: [], vtxos: [], boardingUtxos: [] })
  })

  // Only an unsettled payment can offer to settle. Asking the worker for every expiring coin and
  // every deposit on each open was a cost a wallet with a long history paid on every tap.
  it('does not look for coins to settle when the payment is settled', async () => {
    renderDetails({ ...mockTxInfo, settled: true, preconfirmed: false } as Tx)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getInputsToSettle).not.toHaveBeenCalled()
  })

  it('still looks for them when the payment is not settled yet', async () => {
    renderDetails({ ...mockTxInfo, settled: false, preconfirmed: true } as Tx)
    await waitFor(() => expect(getInputsToSettle).toHaveBeenCalledTimes(1))
  })
})
