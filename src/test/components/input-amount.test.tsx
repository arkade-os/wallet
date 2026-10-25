import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import InputAmount from '../../components/InputAmount'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { mockConfigContextValue, mockFiatContextValue } from '../screens/mocks'
import { Unit, type AssetOption } from '../../lib/types'

const renderAmount = (unit: Unit, asset?: AssetOption) => {
  const onChange = vi.fn()
  render(
    <ConfigContext.Provider
      value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, unit }, useFiat: false } as never}
    >
      <FiatContext.Provider value={mockFiatContextValue as never}>
        <InputAmount name='amount' onChange={onChange} asset={asset} />
      </FiatContext.Provider>
    </ConfigContext.Provider>,
  )
  return { input: screen.getByRole('spinbutton') as HTMLInputElement, onChange }
}

const usdAccount: AssetOption = { assetId: 'ab'.repeat(34), name: 'Dollar', ticker: 'USD', balance: 0n, decimals: 2 }

describe('InputAmount', () => {
  it('steps by one satoshi in BTC', () => {
    expect(renderAmount(Unit.BTC).input.step).toBe('0.00000001')
  })

  it('steps by one sat, and takes no decimals, in sats', () => {
    const { input, onChange } = renderAmount(Unit.SATS)

    fireEvent.change(input, { target: { value: '5.7' } })

    expect(input.step).toBe('1')
    expect(onChange).toHaveBeenCalledWith('5')
  })

  it("keeps an asset amount to the asset's decimals", () => {
    const { input, onChange } = renderAmount(Unit.BTC, usdAccount)

    fireEvent.change(input, { target: { value: '1.234' } })

    expect(input.step).toBe('0.01')
    expect(onChange).toHaveBeenCalledWith('1.23')
  })
})
