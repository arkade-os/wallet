import { act, fireEvent, render, screen } from '@testing-library/react'
import { useContext, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PortfolioHero, { HOLD_TO_HIDE_MS } from '../../../screens/Wallet/PortfolioHero'
import { WalletContext } from '../../../providers/wallet'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { BackupContext } from '../../../providers/backup'
import { Currencies, Unit } from '../../../lib/types'
import { mockConfigContextValue, mockFiatContextValue } from '../mocks'

function WithSyncing({ syncing, children }: { syncing: boolean; children: ReactNode }) {
  const wallet = useContext(WalletContext)
  return <WalletContext.Provider value={{ ...wallet, syncing }}>{children}</WalletContext.Provider>
}

describe('PortfolioHero', () => {
  it('says the balance is syncing while the first background sync is pending', () => {
    render(
      <WithSyncing syncing>
        <PortfolioHero />
      </WithSyncing>,
    )

    expect(screen.getByRole('status').textContent).toBe('Syncing...')
  })

  it('shows no sync status once synced', () => {
    render(
      <WithSyncing syncing={false}>
        <PortfolioHero />
      </WithSyncing>,
    )

    expect(screen.queryByRole('status')).toBeNull()
  })

  describe('the balance', () => {
    const backupAndUpdateConfig = vi.fn()

    const renderHero = (currency = Currencies.USD) => {
      const config = { ...mockConfigContextValue.config, currency, unit: Unit.SATS, showBalance: true }
      return render(
        <ConfigContext.Provider value={{ ...mockConfigContextValue, config } as any}>
          <FiatContext.Provider value={mockFiatContextValue as any}>
            <BackupContext.Provider value={{ backupAndUpdateConfig } as any}>
              <PortfolioHero />
            </BackupContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>,
      )
    }

    const main = () => screen.getByTestId('main-balance').textContent
    const button = () => screen.getByTestId('main-balance-button')

    beforeEach(() => {
      localStorage.clear()
      backupAndUpdateConfig.mockClear()
      // jsdom has no PointerEvent, so pointer events would arrive without coordinates.
      if (!('PointerEvent' in window)) vi.stubGlobal('PointerEvent', class extends MouseEvent {})
    })
    afterEach(() => {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    })

    it('puts Bitcoin first on a tap, and the currency back on the next, and remembers it', () => {
      const { unmount } = renderHero()
      expect(main()).toContain('$')

      fireEvent.click(button())
      expect(main()).not.toContain('$')
      expect(screen.getByTestId('secondary-balance').textContent).toContain('$')
      unmount()

      renderHero()
      expect(main()).not.toContain('$')
      fireEvent.click(button())
      expect(main()).toContain('$')
      expect(backupAndUpdateConfig).not.toHaveBeenCalled()
    })

    it('hides the balance on a hold, without switching units', () => {
      vi.useFakeTimers()
      renderHero()

      fireEvent.pointerDown(button(), { clientX: 10, clientY: 10 })
      act(() => {
        vi.advanceTimersByTime(HOLD_TO_HIDE_MS)
      })
      fireEvent.pointerUp(button())
      fireEvent.click(button())

      expect(backupAndUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ showBalance: false }))
      expect(main()).toContain('$')
    })

    it('takes a press that moves as a scroll, not a hold', () => {
      vi.useFakeTimers()
      renderHero()

      fireEvent.pointerDown(button(), { clientX: 10, clientY: 10 })
      fireEvent.pointerMove(button(), { clientX: 10, clientY: 40 })
      act(() => {
        vi.advanceTimersByTime(HOLD_TO_HIDE_MS * 2)
      })

      expect(backupAndUpdateConfig).not.toHaveBeenCalled()
    })

    it('lets keyboard and screen reader users hide it without holding', () => {
      renderHero()
      fireEvent.click(screen.getByRole('button', { name: 'Hide balances' }))
      expect(backupAndUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({ showBalance: false }))
    })

    it('has nothing to switch when the currency is already Bitcoin', () => {
      renderHero(Currencies.BTC)
      const before = main()
      fireEvent.click(button())
      expect(main()).toBe(before)
      expect(button()).not.toHaveAttribute('aria-label')
    })
  })
})
