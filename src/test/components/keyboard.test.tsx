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
  heading: { title?: string; subtitle?: string } = {},
) => {
  render(
    <ConfigContext.Provider
      value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, unit, currency } } as never}
    >
      <FiatContext.Provider value={mockFiatContextValue as never}>
        <WalletContext.Provider value={{ ...mockWalletContextValue, availableBalance: 1_000_000 } as never}>
          <Keyboard back={() => {}} onSave={onSave} {...heading} />
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

describe('Keyboard, heading', () => {
  it('is titled Amount by default, with no subtitle', () => {
    renderKeyboard(Unit.SATS)
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.queryByText('Why an amount')).not.toBeInTheDocument()
  })

  it('shows a custom title and subtitle', () => {
    renderKeyboard(Unit.SATS, vi.fn(), Currencies.BTC, { title: 'Set an amount first', subtitle: 'Why an amount' })
    expect(screen.getByText('Set an amount first')).toBeInTheDocument()
    expect(screen.queryByText('Amount')).not.toBeInTheDocument()
    expect(screen.getByText('Why an amount')).toBeInTheDocument()
  })
})
