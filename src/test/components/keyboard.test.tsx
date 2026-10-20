import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Keyboard from '../../components/Keyboard'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { WalletContext } from '../../providers/wallet'
import { mockConfigContextValue, mockFiatContextValue, mockWalletContextValue } from '../screens/mocks'
import { Currencies, Unit } from '../../lib/types'

const renderKeyboard = (
  unit: Unit,
  onSave = vi.fn(),
  currency = Currencies.BTC,
  props: Partial<ComponentProps<typeof Keyboard>> = {},
) => {
  render(
    <ConfigContext.Provider
      value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, unit, currency } } as never}
    >
      <FiatContext.Provider value={mockFiatContextValue as never}>
        <WalletContext.Provider value={{ ...mockWalletContextValue, availableBalance: 1_000_000 } as never}>
          <Keyboard back={() => {}} onSave={onSave} {...props} />
        </WalletContext.Provider>
      </FiatContext.Provider>
    </ConfigContext.Provider>,
  )
  return onSave
}
const press = (...keys: string[]) => keys.forEach((k) => fireEvent.click(screen.getByTestId(`keyboard-${k}`)))

describe('Keyboard, right-to-left entry', () => {
  it('fills sats from the right', () => {
    const onSave = renderKeyboard(Unit.SATS)
    press('1', '2')
    expect(screen.getByText('12 sats')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('save-amount'))
    expect(onSave).toHaveBeenCalledWith('12', 'sats')
  })

  it('shows every BTC decimal and saves the plain decimal string', () => {
    const onSave = renderKeyboard(Unit.BTC)
    press('1', '2')
    expect(screen.getByTestId('keyboard-amount')).toHaveTextContent('0.00000012 BTC')
    press('x')
    expect(screen.getByTestId('keyboard-amount')).toHaveTextContent('0.00000001 BTC')
    fireEvent.click(screen.getByTestId('save-amount'))
    expect(onSave).toHaveBeenCalledWith('0.00000001', 'btc')
  })

  it('backspaces to empty and then has nothing to save', () => {
    renderKeyboard(Unit.SATS)
    press('1', '2', 'x', 'x')
    expect(screen.getByTestId('keyboard-amount')).toHaveTextContent('0 sats')
    expect(screen.getByTestId('save-amount')).toBeDisabled()
  })

  it('stops at 21 M BTC', () => {
    const onSave = renderKeyboard(Unit.BTC)
    press(...'2100000000000000', '0')
    expect(screen.getByTestId('keyboard-amount')).toHaveTextContent('21000000.00000000 BTC')
    fireEvent.click(screen.getByTestId('save-amount'))
    expect(onSave).toHaveBeenCalledWith('21000000.00000000', 'btc')
  })

  it('fills Max from the available balance', () => {
    const onSave = renderKeyboard(Unit.SATS)
    fireEvent.click(screen.getByText(/^1,000,000/))
    expect(screen.getByTestId('keyboard-amount')).toHaveTextContent('1000000 sats')
    fireEvent.click(screen.getByTestId('save-amount'))
    expect(onSave).toHaveBeenCalledWith('1000000', 'sats')
  })

  it("enters Send's default BTC mode in a fiat wallet and saves a plain decimal string", () => {
    const onSave = renderKeyboard(Unit.BTC, vi.fn(), Currencies.USD, { defaultMode: 'btc' })
    press('2', '0', '0', '0', '0')
    expect(screen.getByTestId('keyboard-amount')).toHaveTextContent('0.00020000 BTC')
    fireEvent.click(screen.getByTestId('save-amount'))
    expect(onSave).toHaveBeenCalledWith('0.00020000', 'btc')
  })

  it('has no decimal-point key', () => {
    renderKeyboard(Unit.BTC)
    expect(screen.queryByTestId('keyboard-.')).not.toBeInTheDocument()
  })

  it('converts on a unit toggle instead of re-reading the digits', () => {
    renderKeyboard(Unit.SATS, vi.fn(), Currencies.USD)
    press('1', '2', '0', '0', '0')
    expect(screen.getByTestId('keyboard-amount')).toHaveTextContent('$120.00')
    fireEvent.click(screen.getByLabelText('Toggle currency'))
    expect(screen.getByText('120 sats')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Toggle currency'))
    expect(screen.getByTestId('keyboard-amount')).toHaveTextContent('$120.00')
  })
})
