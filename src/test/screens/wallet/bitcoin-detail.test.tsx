import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BitcoinDetail from '../../../screens/Wallet/BitcoinDetail'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import {
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../mocks'

vi.mock('liveline', () => ({
  Liveline: ({ paused }: { paused?: boolean }) => <div data-testid='liveline-chart' data-paused={String(paused)} />,
}))

describe('Bitcoin detail screen', () => {
  it('pauses the liveline chart while the pointer is hovering it', async () => {
    const ResizeObserverMock = vi.fn(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))

    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          prices: [
            [Date.now() - 3_600_000, 77_000],
            [Date.now(), 78_000],
          ],
        }),
      }),
    )

    const { container } = render(
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <FlowContext.Provider value={mockFlowContextValue}>
            <NavigationContext.Provider value={mockNavigationContextValue}>
              <WalletContext.Provider value={mockWalletContextValue}>
                <BitcoinDetail />
              </WalletContext.Provider>
            </NavigationContext.Provider>
          </FlowContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>,
    )

    expect(screen.getByTestId('liveline-chart')).toHaveAttribute('data-paused', 'false')

    const chart = container.querySelector('.asset-detail-chart')
    expect(chart).not.toBeNull()

    fireEvent.pointerEnter(chart!)

    await waitFor(() => {
      expect(screen.getByTestId('liveline-chart')).toHaveAttribute('data-paused', 'true')
    })

    fireEvent.pointerLeave(chart!)

    await waitFor(() => {
      expect(screen.getByTestId('liveline-chart')).toHaveAttribute('data-paused', 'false')
    })
  })
})
