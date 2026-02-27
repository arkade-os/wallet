import { ConfigContext } from '../../../providers/config'
import Display from '../../../screens/Settings/Display'
import { render, screen } from '@testing-library/react'
import { mockConfigContextValue } from '../mocks'
import { describe, expect, it } from 'vitest'

describe('Display screen', () => {
  it('renders the display screen with the correct elements', () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Display />
      </ConfigContext.Provider>,
    )
    expect(screen.getByText('Display preferences')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-0')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-0').querySelector('p')?.textContent).toBe('Show both')
    expect(screen.getByTestId('select-option-1')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-1').querySelector('p')?.textContent).toBe('Bitcoin only')
    expect(screen.getByTestId('select-option-2')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-2').querySelector('p')?.textContent).toBe('Fiat only')
  })

  it('renders the display screen with the correct default selection', () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Display />
      </ConfigContext.Provider>,
    )
    expect(screen.getByTestId('select-option-0').querySelector('svg')).toBeInTheDocument()
    expect(screen.getByTestId('select-option-1').querySelector('svg')).not.toBeInTheDocument()
    expect(screen.getByTestId('select-option-2').querySelector('svg')).not.toBeInTheDocument()
  })
})
