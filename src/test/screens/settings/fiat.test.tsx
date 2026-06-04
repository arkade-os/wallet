import { ConfigContext } from '../../../providers/config'
import { render, screen } from '@testing-library/react'
import { mockConfigContextValue } from '../mocks'
import Fiat from '../../../screens/Settings/Fiat'
import { describe, expect, it } from 'vitest'

describe('Fiat screen', () => {
  it('renders the currency screen with the correct elements', () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Fiat />
      </ConfigContext.Provider>,
    )
    expect(screen.getAllByText('Currency')).toHaveLength(2)
    expect(screen.getByTestId('select-option-0')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-0').querySelector('p')?.textContent).toBe('USD')
    expect(screen.getByTestId('select-option-1')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-1').querySelector('p')?.textContent).toBe('EUR')
    expect(screen.getByTestId('select-option-6').querySelector('p')?.textContent).toBe('BTC')
  })

  it('renders the fiat screen with the correct default selection', () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Fiat />
      </ConfigContext.Provider>,
    )
    expect(screen.getByTestId('select-option-1').querySelector('svg')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-0').querySelector('svg')).not.toBeInTheDocument()
  })
})
