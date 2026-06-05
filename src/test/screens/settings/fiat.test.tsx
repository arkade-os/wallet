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
    expect(screen.getByTestId('select-option-0').querySelector('p')?.textContent).toBe('BTC')
    expect(screen.getByTestId('select-option-1').querySelector('p')?.textContent).toBe('CHF')
    expect(screen.getByTestId('select-option-2').querySelector('p')?.textContent).toBe('CNY')
    expect(screen.getByTestId('select-option-3').querySelector('p')?.textContent).toBe('EUR')
    expect(screen.getByTestId('select-option-4').querySelector('p')?.textContent).toBe('GBP')
    expect(screen.getByTestId('select-option-5').querySelector('p')?.textContent).toBe('JPY')
    expect(screen.getByTestId('select-option-6').querySelector('p')?.textContent).toBe('USD')
  })

  it('renders the fiat screen with the correct default selection', () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Fiat />
      </ConfigContext.Provider>,
    )
    expect(screen.getByTestId('select-option-0').querySelector('svg')).not.toBeInTheDocument()
    expect(screen.getByTestId('select-option-1').querySelector('svg')).not.toBeInTheDocument()
    expect(screen.getByTestId('select-option-2').querySelector('svg')).not.toBeInTheDocument()
    expect(screen.getByTestId('select-option-3').querySelector('svg')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-4').querySelector('svg')).not.toBeInTheDocument()
    expect(screen.getByTestId('select-option-5').querySelector('svg')).not.toBeInTheDocument()
    expect(screen.getByTestId('select-option-6').querySelector('svg')).not.toBeInTheDocument()
  })
})
