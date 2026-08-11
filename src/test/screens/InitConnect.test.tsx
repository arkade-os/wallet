import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InitConnect from '../../screens/Init/Connect'
import { FlowContext } from '../../providers/flow'
import { NavigationContext } from '../../providers/navigation'
import { SwapsContext } from '../../providers/swaps'
import { WalletContext } from '../../providers/wallet'
import {
  mockFlowContextValue,
  mockNavigationContextValue,
  mockSwapsContextValue,
  mockWalletContextValue,
} from './mocks'

vi.mock('../../lib/mnemonic', () => ({
  setMnemonic: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../lib/privateKey', () => ({
  setPrivateKey: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../components/LoadingLogo', () => ({
  default: ({ text, done, onExitComplete }: { text?: string; done?: boolean; onExitComplete?: () => void }) => (
    <button data-testid='loading-logo' data-done={String(Boolean(done))} onClick={() => onExitComplete?.()}>
      {text}
    </button>
  ),
}))

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

function renderConnect({
  restoring = false,
  arkadeSwaps = null,
  restoreSwaps = vi.fn().mockResolvedValue(0),
}: {
  restoring?: boolean
  arkadeSwaps?: unknown
  restoreSwaps?: ReturnType<typeof vi.fn>
} = {}) {
  const initWallet = vi.fn().mockResolvedValue(undefined)
  const navigate = vi.fn()
  const setInitInfo = vi.fn()
  const initInfo = {
    password: 'password',
    mnemonic: MNEMONIC,
    restoring,
  }

  render(
    <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate } as any}>
      <FlowContext.Provider value={{ ...mockFlowContextValue, initInfo, setInitInfo } as any}>
        <WalletContext.Provider value={{ ...mockWalletContextValue, initWallet } as any}>
          <SwapsContext.Provider
            value={{ ...mockSwapsContextValue, arkadeSwaps: arkadeSwaps as any, restoreSwaps } as any}
          >
            <InitConnect />
          </SwapsContext.Provider>
        </WalletContext.Provider>
      </FlowContext.Provider>
    </NavigationContext.Provider>,
  )

  return { initWallet, restoreSwaps, navigate, setInitInfo }
}

describe('InitConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('finishes new wallet creation even when swaps are unavailable', async () => {
    const { initWallet, restoreSwaps } = renderConnect({ restoring: false, arkadeSwaps: null })

    await waitFor(() =>
      expect(initWallet).toHaveBeenCalledWith({ mnemonic: MNEMONIC, walletMode: undefined, restoring: false }),
    )
    await waitFor(() => expect(screen.getByTestId('loading-logo')).toHaveAttribute('data-done', 'true'))
    expect(restoreSwaps).not.toHaveBeenCalled()
  })

  it('waits for swaps before restoring swap state', async () => {
    const { initWallet, restoreSwaps } = renderConnect({ restoring: true, arkadeSwaps: null })

    await waitFor(() => expect(initWallet).toHaveBeenCalled())
    expect(screen.getByTestId('loading-logo')).toHaveAttribute('data-done', 'false')
    expect(restoreSwaps).not.toHaveBeenCalled()
  })

  it('restores swaps once the swap client is ready', async () => {
    const restoreSwaps = vi.fn().mockResolvedValue(0)
    renderConnect({ restoring: true, arkadeSwaps: {}, restoreSwaps })

    await waitFor(() => expect(restoreSwaps).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTestId('loading-logo')).toHaveAttribute('data-done', 'true'))
  })
})
