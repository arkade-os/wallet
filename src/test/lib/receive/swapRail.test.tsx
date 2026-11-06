import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useSwapRail } from '../../../lib/receive/swapRail'
import { AspContext } from '../../../providers/asp'
import { FlowContext } from '../../../providers/flow'
import { SwapsContext } from '../../../providers/swaps'
import { WalletContext } from '../../../providers/wallet'
import { mockAspContextValue, mockFlowContextValue, mockSvcWallet, mockWalletContextValue } from '../../screens/mocks'

const renderRail = (enabled: boolean, outcome?: string) => {
  const receiveLightning = vi.fn(async () => ({ id: 'swap-1', invoice: 'lnbc1test' }))
  const flow = {
    ...mockFlowContextValue,
    recvInfo: {
      ...mockFlowContextValue.recvInfo,
      satoshis: 1000,
      ...(outcome ? { invoice: 'lnbc1test', pendingLnReceive: { id: 'swap-1', payAmount: 1000 } } : {}),
    },
    setRecvInfo: vi.fn(),
  }
  const claimSwap = vi.fn(async () => {})
  const swaps = {
    receiveLightning,
    claimSwap,
    cancelSwap: vi.fn(async () => {}),
    outcomeOf: () => outcome,
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
  return { receiveLightning, claimSwap, ...renderHook(() => useSwapRail(enabled), { wrapper }) }
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

  it('offers a manual claim for a funded receive and claims it', async () => {
    vi.stubEnv('VITE_DELEGATEE_ENCRYPTION_PUBKEY', `02${'11'.repeat(32)}`)
    const { claimSwap, result } = renderRail(true, 'funded')
    expect(result.current.waitingForClaim).toBe(true)
    await act(async () => result.current.claimNow())
    expect(claimSwap).toHaveBeenCalledWith('swap-1')
    vi.unstubAllEnvs()
  })
})
