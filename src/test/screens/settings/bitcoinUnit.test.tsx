import { ConfigContext } from '../../../providers/config'
import BitcoinUnit from '../../../screens/Settings/BitcoinUnit'
import { render, screen } from '@testing-library/react'
import { mockConfigContextValue } from '../mocks'
import { describe, expect, it } from 'vitest'

describe('BitcoinUnit screen', () => {
  it('renders the bitcoin unit screen with the correct elements', () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <BitcoinUnit />
      </ConfigContext.Provider>,
    )
    expect(screen.getByTestId('select-option-0')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-0').querySelector('p')?.textContent).toBe('BTC')
    expect(screen.getByTestId('select-option-1')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-1').querySelector('p')?.textContent).toBe('sats')
    expect(screen.getByTestId('select-option-2')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-2').querySelector('p')?.textContent).toBe('₿')
  })

  it('renders the bitcoin unit screen with the correct default selection', () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <BitcoinUnit />
      </ConfigContext.Provider>,
    )
    expect(screen.getByTestId('select-option-0').querySelector('svg')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-1').querySelector('svg')).not.toBeInTheDocument()
    expect(screen.getByTestId('select-option-2').querySelector('svg')).not.toBeInTheDocument()
  })
})
