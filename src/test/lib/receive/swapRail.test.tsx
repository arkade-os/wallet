import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useSwapRail } from '../../../lib/receive/swapRail'
import { AspContext } from '../../../providers/asp'
import { FlowContext } from '../../../providers/flow'
import { SwapsContext } from '../../../providers/swaps'
import { WalletContext } from '../../../providers/wallet'
import { mockAspContextValue, mockFlowContextValue, mockSvcWallet, mockWalletContextValue } from '../../screens/mocks'

const renderRail = (enabled: boolean) => {
  const receiveLightning = vi.fn(async () => ({ id: 'swap-1', invoice: 'lnbc1test' }))
  const flow = {
    ...mockFlowContextValue,
    recvInfo: { ...mockFlowContextValue.recvInfo, satoshis: 1000 },
    setRecvInfo: vi.fn(),
  }
  const swaps = {
    receiveLightning,
    cancelSwap: vi.fn(async () => {}),
    outcomeOf: () => undefined,
    errorOf: () => undefined,
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AspContext.Provider value={mockAspContextValue as never}>
      <FlowContext.Provider value={flow as never}>
        <SwapsContext.Provider value={swaps as never}>
          <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: mockSvcWallet } as never}>
            {children}
          </WalletContext.Provider>
        </SwapsContext.Provider>
      </FlowContext.Provider>
    </AspContext.Provider>
  )
  return { receiveLightning, ...renderHook(() => useSwapRail(enabled), { wrapper }) }
}

describe('useSwapRail', () => {
  it('negotiates a Lightning receive once an amount is set', async () => {
    const { receiveLightning } = renderRail(true)
    await waitFor(() => expect(receiveLightning).toHaveBeenCalledWith(1000))
  })

  it('negotiates nothing while disabled', () => {
    const { receiveLightning, result } = renderRail(false)
    expect(receiveLightning).not.toHaveBeenCalled()
    expect(result.current.generatingInvoice).toBe(false)
  })
})
